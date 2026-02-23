import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import path from 'path';
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

// ============================================================================
// Prisma singleton (warm between invocations) — lazy require to avoid TS error
// ============================================================================
const g = globalThis as unknown as { __prisma?: any };
let prisma: any;
function getPrisma() {
  if (!prisma) {
    try {
      // Try custom output path first (used in Vercel serverless with includeFiles)
      const clientPath = path.join(process.cwd(), 'packages', 'database', 'generated', 'client');
      const { PrismaClient } = _require(clientPath);
      prisma = g.__prisma ?? new PrismaClient();
    } catch {
      // Fallback: try standard @prisma/client
      const { PrismaClient } = _require('@prisma/client');
      prisma = g.__prisma ?? new PrismaClient();
    }
    g.__prisma = prisma;
  }
  return prisma;
}

// ============================================================================
// JWT — lightweight HMAC-SHA256
// ============================================================================
const JWT_SECRET = process.env.JWT_SECRET ?? 'ncts-demo-secret-key-2026';

function signJwt(payload: Record<string, unknown>): string {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const b = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url');
  const s = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${s}`;
}

// ============================================================================
// Helpers
// ============================================================================
function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function pageParams(req: VercelRequest) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

function meta(page: number, limit: number, total: number) {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
}

// Demo accounts
const DEMO = [
  { email: 'operator@greenpoint.co.za', password: 'GreenPoint2026!', role: 'operator_admin', firstName: 'Sipho', lastName: 'Ndlovu' },
  { email: 'admin@sahpra.gov.za', password: 'SAHPRA2026!', role: 'regulator', firstName: 'Dr. Naledi', lastName: 'Mokoena' },
];

// ============================================================================
// AUTH
// ============================================================================
async function handleAuth(req: VercelRequest, res: VercelResponse, seg: string[]) {
  console.log('[SERVER-AUTH-DEBUG] handleAuth called', { seg, method: req.method, bodyKeys: req.body ? Object.keys(req.body) : 'NO BODY' });
  if (seg[1] === 'login' && req.method === 'POST') {
    const { email, password } = req.body ?? {};
    console.log('[SERVER-AUTH-DEBUG] login attempt', { email, hasPassword: !!password, passwordLength: password?.length });
    const acct = DEMO.find(a => a.email === email && a.password === password);
    console.log('[SERVER-AUTH-DEBUG] demo account match', { found: !!acct, demoEmails: DEMO.map(d => d.email) });
    if (!acct) {
      console.log('[SERVER-AUTH-DEBUG] REJECT — no matching demo account');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Try DB lookup first; fall back to in-memory demo user if DB unavailable
    try {
      console.log('[SERVER-AUTH-DEBUG] trying DB lookup for', email);
      let user = await prisma.user.findUnique({ where: { email }, include: { tenant: true } });
      console.log('[SERVER-AUTH-DEBUG] DB user found:', !!user, user ? { id: user.id, role: user.role } : null);
      if (!user) {
        let tenantId: string | null = null;
        if (acct.role === 'operator_admin') {
          const t = await prisma.tenant.findFirst();
          tenantId = t?.id ?? null;
          console.log('[SERVER-AUTH-DEBUG] operator tenant lookup', { tenantId });
        }
        user = await prisma.user.create({
          data: { email: acct.email, firstName: acct.firstName, lastName: acct.lastName, role: acct.role, tenantId },
          include: { tenant: true },
        });
        console.log('[SERVER-AUTH-DEBUG] created new user', { id: user.id });
      }

      const token = signJwt({ userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId, firstName: user.firstName, lastName: user.lastName });
      console.log('[SERVER-AUTH-DEBUG] JWT signed, returning token', { tokenLength: token.length, userId: user.id });
      return res.json({ accessToken: token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, tenantId: user.tenantId } });
    } catch (dbErr) {
      // Database unavailable — issue token from in-memory demo account
      console.warn('[SERVER-AUTH-DEBUG] DB ERROR — falling back to in-memory:', (dbErr as Error).message, (dbErr as Error).stack);
      const fallbackId = crypto.randomUUID();
      const token = signJwt({ userId: fallbackId, email: acct.email, role: acct.role, tenantId: null, firstName: acct.firstName, lastName: acct.lastName });
      console.log('[SERVER-AUTH-DEBUG] fallback JWT signed', { tokenLength: token.length, fallbackId });
      return res.json({ accessToken: token, user: { id: fallbackId, email: acct.email, firstName: acct.firstName, lastName: acct.lastName, role: acct.role, tenantId: null } });
    }
  }
  console.log('[SERVER-AUTH-DEBUG] no matching auth route', { seg });
  return res.status(404).json({ error: 'Not found' });
}

// ============================================================================
// FACILITIES
// ============================================================================
async function handleFacilities(req: VercelRequest, res: VercelResponse, seg: string[]) {
  if (req.method === 'GET' && seg.length === 1) {
    const { page, limit, skip } = pageParams(req);
    const [data, total] = await Promise.all([
      prisma.facility.findMany({ skip, take: limit, include: { tenant: { select: { name: true, tradingName: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.facility.count(),
    ]);
    return res.json({ data, meta: meta(page, limit, total) });
  }
  if (req.method === 'GET' && seg.length === 2) {
    const f = await prisma.facility.findUnique({ where: { id: seg[1] }, include: { zones: true, tenant: true } });
    return f ? res.json(f) : res.status(404).json({ error: 'Not found' });
  }
  if (req.method === 'GET' && seg.length === 3 && seg[2] === 'zones') {
    return res.json(await prisma.zone.findMany({ where: { facilityId: seg[1] }, orderBy: { name: 'asc' } }));
  }
  if (req.method === 'POST' && seg.length === 1) {
    const t = await prisma.tenant.findFirst();
    return res.status(201).json(await prisma.facility.create({ data: { ...req.body, tenantId: t?.id ?? req.body.tenantId } }));
  }
  return res.status(404).json({ error: 'Not found' });
}

// ============================================================================
// PLANTS
// ============================================================================
async function handlePlants(req: VercelRequest, res: VercelResponse, seg: string[]) {
  if (req.method === 'GET' && seg.length === 1) {
    const { page, limit, skip } = pageParams(req);
    const where: any = {};
    if (req.query.state) where.state = req.query.state;
    if (req.query.facilityId) where.facilityId = req.query.facilityId;
    const [data, total] = await Promise.all([
      prisma.plant.findMany({ where, skip, take: limit, include: { strain: true, facility: { select: { name: true } }, zone: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.plant.count({ where }),
    ]);
    return res.json({ data, meta: meta(page, limit, total) });
  }
  if (req.method === 'GET' && seg.length === 2 && seg[1] !== 'batch') {
    const p = await prisma.plant.findUnique({ where: { id: seg[1] }, include: { strain: true, facility: true, zone: true } });
    return p ? res.json(p) : res.status(404).json({ error: 'Not found' });
  }
  if (req.method === 'POST' && seg.length === 1) {
    const t = await prisma.tenant.findFirst();
    const count = await prisma.plant.count();
    const trackingId = `NCTS-ZA-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
    return res.status(201).json(await prisma.plant.create({
      data: { ...req.body, tenantId: t?.id ?? req.body.tenantId, trackingId },
    }));
  }
  if (req.method === 'POST' && seg[1] === 'batch-register') {
    const { plants } = req.body;
    const t = await prisma.tenant.findFirst();
    const baseCount = await prisma.plant.count();
    const results = [];
    for (let i = 0; i < plants.length; i++) {
      const trackingId = `NCTS-ZA-${new Date().getFullYear()}-${String(baseCount + i + 1).padStart(6, '0')}`;
      results.push(await prisma.plant.create({ data: { ...plants[i], tenantId: t?.id, trackingId } }));
    }
    return res.status(201).json(results);
  }
  if (req.method === 'PATCH' && seg.length === 3 && seg[2] === 'state') {
    return res.json(await prisma.plant.update({ where: { id: seg[1] }, data: { state: req.body.state } }));
  }
  return res.status(404).json({ error: 'Not found' });
}

// ============================================================================
// BATCHES
// ============================================================================
async function handleBatches(req: VercelRequest, res: VercelResponse, seg: string[]) {
  if (req.method === 'GET' && seg.length === 1) {
    const { page, limit, skip } = pageParams(req);
    const [data, total] = await Promise.all([
      prisma.batch.findMany({ skip, take: limit, include: { strain: true, facility: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.batch.count(),
    ]);
    return res.json({ data, meta: meta(page, limit, total) });
  }
  if (req.method === 'GET' && seg.length === 2) {
    const b = await prisma.batch.findUnique({ where: { id: seg[1] }, include: { strain: true, facility: true, labResult: true } });
    return b ? res.json(b) : res.status(404).json({ error: 'Not found' });
  }
  return res.status(404).json({ error: 'Not found' });
}

// ============================================================================
// HARVESTS
// ============================================================================
async function handleHarvests(req: VercelRequest, res: VercelResponse, seg: string[]) {
  if (req.method === 'GET') {
    const { page, limit, skip } = pageParams(req);
    const [data, total] = await Promise.all([
      prisma.harvest.findMany({ skip, take: limit, include: { batch: { select: { batchNumber: true } }, facility: { select: { name: true } } }, orderBy: { harvestDate: 'desc' } }),
      prisma.harvest.count(),
    ]);
    return res.json({ data, meta: meta(page, limit, total) });
  }
  return res.status(404).json({ error: 'Not found' });
}

// ============================================================================
// LAB RESULTS
// ============================================================================
async function handleLabResults(req: VercelRequest, res: VercelResponse, seg: string[]) {
  if (req.method === 'GET') {
    const { page, limit, skip } = pageParams(req);
    const [data, total] = await Promise.all([
      prisma.labResult.findMany({ skip, take: limit, orderBy: { testDate: 'desc' } }),
      prisma.labResult.count(),
    ]);
    return res.json({ data, meta: meta(page, limit, total) });
  }
  return res.status(404).json({ error: 'Not found' });
}

// ============================================================================
// TRANSFERS
// ============================================================================
async function handleTransfers(req: VercelRequest, res: VercelResponse, seg: string[]) {
  if (req.method === 'GET' && seg.length === 1) {
    const { page, limit, skip } = pageParams(req);
    const [data, total] = await Promise.all([
      prisma.transfer.findMany({ skip, take: limit, include: { items: true }, orderBy: { initiatedAt: 'desc' } }),
      prisma.transfer.count(),
    ]);
    return res.json({ data, meta: meta(page, limit, total) });
  }
  if (req.method === 'PATCH' && seg.length === 3 && seg[2] === 'status') {
    return res.json(await prisma.transfer.update({ where: { id: seg[1] }, data: { status: req.body.status } }));
  }
  return res.status(404).json({ error: 'Not found' });
}

// ============================================================================
// SALES
// ============================================================================
async function handleSales(req: VercelRequest, res: VercelResponse, seg: string[]) {
  if (req.method === 'GET') {
    const { page, limit, skip } = pageParams(req);
    const [data, total] = await Promise.all([
      prisma.sale.findMany({ skip, take: limit, include: { batch: { select: { batchNumber: true } } }, orderBy: { saleDate: 'desc' } }),
      prisma.sale.count(),
    ]);
    return res.json({ data, meta: meta(page, limit, total) });
  }
  return res.status(404).json({ error: 'Not found' });
}

// ============================================================================
// REGULATORY
// ============================================================================
async function handleRegulatory(req: VercelRequest, res: VercelResponse, seg: string[]) {
  if (req.method === 'GET' && seg[1] === 'dashboard') {
    const [totalOperators, totalPlants, totalFacilities, activePermits] = await Promise.all([
      prisma.tenant.count(),
      prisma.plant.count(),
      prisma.facility.count(),
      prisma.permit.count({ where: { status: 'active' } }),
    ]);
    const totalTenants = totalOperators || 1;
    const compliant = await prisma.tenant.count({ where: { complianceStatus: 'compliant' } });
    return res.json({
      totalOperators, totalPlants, totalFacilities, activePermits,
      complianceRate: Math.round((compliant / totalTenants) * 100),
      pendingInspections: 0,
      flaggedOperators: await prisma.tenant.count({ where: { complianceStatus: { in: ['warning', 'non_compliant'] } } }),
      recentActivity: [],
    });
  }

  if (req.method === 'GET' && seg[1] === 'dashboard' && seg[2] === 'trends') {
    // Return last 30 days trend data
    const days: { date: string; plants: number; harvests: number; sales: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push({ date: d.toISOString().slice(0, 10), plants: Math.floor(Math.random() * 20), harvests: Math.floor(Math.random() * 5), sales: Math.floor(Math.random() * 10) });
    }
    return res.json(days);
  }

  if (req.method === 'GET' && seg[1] === 'facilities' && seg[2] === 'geo') {
    const facilities = await prisma.facility.findMany({ select: { id: true, name: true, latitude: true, longitude: true, facilityType: true, province: true } });
    return res.json(facilities);
  }

  if (req.method === 'GET' && seg[1] === 'operators') {
    return res.json(await prisma.tenant.findMany({ orderBy: { name: 'asc' } }));
  }

  if (req.method === 'GET' && seg[1] === 'permits') {
    const { page, limit, skip } = pageParams(req);
    const where: any = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.permitType) where.permitType = req.query.permitType;
    const [data, total] = await Promise.all([
      prisma.permit.findMany({ where, skip, take: limit, include: { tenant: { select: { name: true } }, facility: { select: { name: true } } }, orderBy: { issueDate: 'desc' } }),
      prisma.permit.count({ where }),
    ]);
    return res.json({ data, meta: meta(page, limit, total) });
  }

  if (req.method === 'PATCH' && seg[1] === 'permits' && seg[3] === 'status') {
    return res.json(await prisma.permit.update({ where: { id: seg[2] }, data: { status: req.body.status } }));
  }

  if (req.method === 'GET' && seg[1] === 'compliance' && (seg[2] === 'alerts' || seg.length === 2)) {
    // Generate compliance alerts from data
    const alerts: any[] = [];
    const expiringSoon = await prisma.permit.findMany({
      where: { expiryDate: { lte: new Date(Date.now() + 30 * 86400000) }, status: 'active' },
      include: { tenant: { select: { name: true } } },
    });
    for (const p of expiringSoon) {
      alerts.push({ type: 'permit_expiring', severity: 'high', title: `Permit ${p.permitNumber} expiring soon`, description: `Operator ${p.tenant.name}`, operatorName: p.tenant.name });
    }
    const nonCompliant = await prisma.tenant.findMany({ where: { complianceStatus: { in: ['warning', 'non_compliant'] } } });
    for (const t of nonCompliant) {
      alerts.push({ type: 'non_compliant', severity: 'critical', title: `${t.tradingName} is ${t.complianceStatus}`, description: `Requires immediate attention`, operatorName: t.tradingName });
    }
    return res.json(alerts);
  }

  return res.status(404).json({ error: 'Not found' });
}

// ============================================================================
// VERIFY
// ============================================================================
async function handleVerify(req: VercelRequest, res: VercelResponse, seg: string[]) {
  console.log('[SERVER-VERIFY-DEBUG] handleVerify called', { method: req.method, seg, url: req.url });
  if (req.method === 'POST' && seg[1] === 'report') {
    console.log('[SUSPICIOUS REPORT]', req.body);
    return res.json({ success: true, message: 'Report received' });
  }

  if (req.method === 'GET' && seg.length === 2) {
    const trackingId = seg[1];
    console.log('[SERVER-VERIFY-DEBUG] looking up trackingId:', trackingId);
    try {
      const plant = await prisma.plant.findUnique({
        where: { trackingId },
        include: {
          strain: { select: { name: true, type: true } },
          batch: { include: { labResult: true, facility: { select: { name: true } } } },
          tenant: { select: { name: true, tradingName: true } },
        },
      });
      console.log('[SERVER-VERIFY-DEBUG] DB result', { found: !!plant, plantId: plant?.id, strain: plant?.strain?.name, hasBatch: !!plant?.batch });
      if (!plant) {
        console.log('[SERVER-VERIFY-DEBUG] plant NOT FOUND for trackingId:', trackingId);
        // Also list some existing trackingIds to help debug
        try {
          const sample = await prisma.plant.findMany({ take: 5, select: { trackingId: true } });
          console.log('[SERVER-VERIFY-DEBUG] sample trackingIds in DB:', sample.map((p: any) => p.trackingId));
        } catch (e) { console.log('[SERVER-VERIFY-DEBUG] could not fetch samples:', String(e)); }
        return res.status(404).json({ error: 'Not found', debug: { trackingId, message: 'No plant found with this trackingId' } });
      }

      const result = {
        trackingId,
        productName: `${plant.strain.name} (${plant.strain.type})`,
        strain: plant.strain.name,
        operatorName: plant.tenant.tradingName || plant.tenant.name,
        batchNumber: plant.batch?.batchNumber ?? 'N/A',
        labResult: plant.batch?.labResult ? {
          status: plant.batch.labResult.status,
          thcPercent: plant.batch.labResult.thcPercent,
          cbdPercent: plant.batch.labResult.cbdPercent,
          testDate: plant.batch.labResult.testDate.toISOString().slice(0, 10),
          labName: plant.batch.labResult.labName,
        } : null,
        chainOfCustody: [],
        verifiedAt: new Date().toISOString(),
      };
      console.log('[SERVER-VERIFY-DEBUG] returning verification result', { trackingId: result.trackingId, productName: result.productName });
      return res.json(result);
    } catch (dbErr) {
      console.error('[SERVER-VERIFY-DEBUG] DB ERROR during verify', { error: (dbErr as Error).message, stack: (dbErr as Error).stack });
      return res.status(500).json({ error: 'Database error during verification', debug: (dbErr as Error).message });
    }
  }
  console.log('[SERVER-VERIFY-DEBUG] no matching verify route', { method: req.method, seg });
  return res.status(404).json({ error: 'Not found' });
}

// ============================================================================
// SEED (one-time database population)
// ============================================================================
async function handleSeed(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const existing = await prisma.tenant.count();
  if (existing > 0) return res.json({ message: 'Database already seeded', tenants: existing });

  // Create tenants
  const gp = await prisma.tenant.create({
    data: { name: 'GreenPoint Botanicals (Pty) Ltd', tradingName: 'GreenPoint Botanicals', registrationNumber: '2024/123456/07', taxNumber: '9012345678', bbbeeLevel: 2, contactEmail: 'info@greenpoint.co.za', contactPhone: '+27 21 555 0100', province: 'WC', address: '12 Harvest Lane, Stellenbosch, 7600', complianceStatus: 'compliant' },
  });
  const kzn = await prisma.tenant.create({
    data: { name: 'KZN Cannabis Collective (Pty) Ltd', tradingName: 'KZN Cannabis', registrationNumber: '2024/789012/07', contactEmail: 'ops@kzncannabis.co.za', province: 'KZN', address: '45 Green Road, Durban, 4001', complianceStatus: 'compliant', bbbeeLevel: 3 },
  });

  // Strains
  const dp = await prisma.strain.create({ data: { name: 'Durban Poison', type: 'sativa', thcRange: '15-25%', cbdRange: '0.02%', floweringWeeks: 9, description: 'Classic South African landrace sativa' } });
  const sg = await prisma.strain.create({ data: { name: 'Swazi Gold', type: 'sativa', thcRange: '18-27%', cbdRange: '0.1%', floweringWeeks: 10, description: 'Premium Swazi landrace' } });

  // Facilities
  const fac1 = await prisma.facility.create({
    data: { tenantId: gp.id, name: 'Stellenbosch Cultivation Centre', facilityType: 'cultivation', province: 'WC', address: '12 Harvest Lane, Stellenbosch', latitude: -33.9321, longitude: 18.8602, isActive: true },
  });
  const fac2 = await prisma.facility.create({
    data: { tenantId: kzn.id, name: 'Durban Processing Hub', facilityType: 'processing', province: 'KZN', address: '45 Green Road, Durban', latitude: -29.8587, longitude: 31.0218, isActive: true },
  });

  // Zones
  const z1 = await prisma.zone.create({ data: { tenantId: gp.id, facilityId: fac1.id, name: 'Greenhouse A', capacity: 500, currentCount: 120 } });
  await prisma.zone.create({ data: { tenantId: gp.id, facilityId: fac1.id, name: 'Greenhouse B', capacity: 500, currentCount: 80 } });
  const z2 = await prisma.zone.create({ data: { tenantId: kzn.id, facilityId: fac2.id, name: 'Indoor Room 1', capacity: 200, currentCount: 45 } });

  // Permits
  await prisma.permit.create({ data: { tenantId: gp.id, facilityId: fac1.id, permitType: 'sahpra_22a', permitNumber: 'SAHPRA-22A-2025-0001', issuingAuthority: 'SAHPRA', issueDate: new Date('2025-01-15'), expiryDate: new Date('2027-01-15'), status: 'active' } });
  await prisma.permit.create({ data: { tenantId: kzn.id, facilityId: fac2.id, permitType: 'dtic_processing', permitNumber: 'DTIC-PROC-2025-0042', issuingAuthority: 'DTIC', issueDate: new Date('2025-03-01'), expiryDate: new Date('2027-03-01'), status: 'active' } });

  // Plants
  const plants = [];
  const states = ['seed', 'seedling', 'vegetative', 'flowering', 'harvested'];
  for (let i = 0; i < 50; i++) {
    plants.push(await prisma.plant.create({
      data: {
        tenantId: i < 30 ? gp.id : kzn.id,
        trackingId: `NCTS-ZA-2026-${String(i + 1).padStart(6, '0')}`,
        strainId: i % 2 === 0 ? dp.id : sg.id,
        facilityId: i < 30 ? fac1.id : fac2.id,
        zoneId: i < 30 ? z1.id : z2.id,
        state: states[i % 5],
        plantedDate: new Date(2025, 6 + Math.floor(i / 10), 1 + (i % 28)),
      },
    }));
  }

  // Batches
  const batch1 = await prisma.batch.create({
    data: { tenantId: gp.id, batchNumber: 'B-2026-001', batchType: 'harvest', strainId: dp.id, facilityId: fac1.id, plantCount: 10, wetWeightGrams: 15000, dryWeightGrams: 3750, createdDate: new Date('2026-01-10') },
  });

  // Lab Result
  await prisma.labResult.create({
    data: { tenantId: gp.id, labName: 'Stellenbosch Cannabis Analytics', labAccreditationNumber: 'SANAS-LAB-0042', testDate: new Date('2026-01-15'), status: 'pass',
      thcPercent: 21.5, cbdPercent: 0.8, totalCannabinoidsPercent: 23.1, pesticidesPass: true, heavyMetalsPass: true, microbialsPass: true, mycotoxinsPass: true } });

  // Link some plants to batch
  for (let i = 0; i < 10; i++) {
    await prisma.plant.update({ where: { id: plants[i].id }, data: { batchId: batch1.id, state: 'harvested' } });
  }

  // Transfers
  await prisma.transfer.create({
    data: { tenantId: gp.id, transferNumber: 'TF-2026-0001', senderTenantId: gp.id, senderFacilityId: fac1.id, receiverTenantId: kzn.id, receiverFacilityId: fac2.id, status: 'accepted', initiatedAt: new Date('2026-01-20'), completedAt: new Date('2026-01-22'), vehicleRegistration: 'CA 123-456', driverName: 'Willem van der Berg', driverIdNumber: '8501015800086',
      items: { create: [{ batchId: batch1.id, quantityGrams: 1500, receivedQuantityGrams: 1498 }] } },
  });

  // Sales
  await prisma.sale.create({
    data: { tenantId: kzn.id, saleNumber: 'S-2026-0001', batchId: batch1.id, facilityId: fac2.id, quantityGrams: 100, priceZar: 2500, saleDate: new Date('2026-02-01'), customerVerified: true },
  });

  // Harvests
  await prisma.harvest.create({
    data: { tenantId: gp.id, batchId: batch1.id, facilityId: fac1.id, harvestDate: new Date('2026-01-08'), wetWeightGrams: 15000, dryWeightGrams: 3750, plantIds: plants.slice(0, 10).map(p => p.id) },
  });

  // Demo users
  await prisma.user.upsert({ where: { email: 'operator@greenpoint.co.za' }, update: {}, create: { email: 'operator@greenpoint.co.za', firstName: 'Sipho', lastName: 'Ndlovu', role: 'operator_admin', tenantId: gp.id } });
  await prisma.user.upsert({ where: { email: 'admin@sahpra.gov.za' }, update: {}, create: { email: 'admin@sahpra.gov.za', firstName: 'Dr. Naledi', lastName: 'Mokoena', role: 'regulator' } });

  return res.json({ message: 'Database seeded successfully', tenants: 2, plants: 50, batches: 1, transfers: 1 });
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Parse URL to extract path segments (handles all Vercel routing modes)
  const url = new URL(req.url ?? '/', `https://${req.headers.host ?? 'localhost'}`);
  const urlPath = url.pathname.replace(/^\/api\/v1\/?/, '').replace(/\/$/, '');
  const pathArr = req.query.path;
  const seg: string[] = Array.isArray(pathArr)
    ? pathArr
    : typeof pathArr === 'string' && pathArr.includes('/')
      ? pathArr.split('/')            // e.g. 'auth/login' → ['auth','login']
      : typeof pathArr === 'string' && pathArr
        ? [pathArr]                   // e.g. 'health' → ['health']
        : urlPath
          ? urlPath.split('/')        // fallback: parse from req.url
          : [];
  const resource = seg[0];

  console.log('[SERVER-ROUTER-DEBUG] ▶ incoming request', {
    method: req.method,
    rawUrl: req.url,
    parsedUrlPath: urlPath,
    queryPath: req.query.path,
    seg,
    resource,
    host: req.headers.host,
    origin: req.headers.origin,
    contentType: req.headers['content-type'],
    hasBody: !!req.body,
  });

  try {
    // Ensure the Prisma singleton is initialised before any handler runs
    console.log('[SERVER-ROUTER-DEBUG] initializing Prisma...');
    getPrisma();
    console.log('[SERVER-ROUTER-DEBUG] Prisma ready, routing to:', resource);

    switch (resource) {
      case 'auth': return await handleAuth(req, res, seg);
      case 'facilities': return await handleFacilities(req, res, seg);
      case 'plants': return await handlePlants(req, res, seg);
      case 'batches': return await handleBatches(req, res, seg);
      case 'harvests': return await handleHarvests(req, res, seg);
      case 'lab-results': return await handleLabResults(req, res, seg);
      case 'transfers': return await handleTransfers(req, res, seg);
      case 'sales': return await handleSales(req, res, seg);
      case 'regulatory': return await handleRegulatory(req, res, seg);
      case 'verify': return await handleVerify(req, res, seg);
      case 'seed': return await handleSeed(req, res);
      case 'health': return res.json({ status: 'ok', timestamp: new Date().toISOString() });
      default:
        console.log('[SERVER-ROUTER-DEBUG] 404 — unknown resource', { resource, seg });
        return res.status(404).json({ error: `Route not found: /api/v1/${seg.join('/')}` });
    }
  } catch (err: any) {
    console.error('[SERVER-ROUTER-DEBUG] UNHANDLED ERROR', { message: err.message, stack: err.stack });
    return res.status(500).json({ error: err.message ?? 'Internal server error', debug: { stack: err.stack?.substring(0, 500) } });
  }
}
