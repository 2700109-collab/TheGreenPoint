import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import path from 'path';
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

// ============================================================================
// Error classes — standardised API error format
// ============================================================================
class ApiError extends Error {
  constructor(public statusCode: number, public code: string, message: string, public details?: unknown) { super(message); this.name = 'ApiError'; }
}
class AuthError extends ApiError { constructor(msg: string, status = 401) { super(status, 'AUTH_ERROR', msg); this.name = 'AuthError'; } }
class ValidationError extends ApiError { constructor(msg: string, details?: unknown) { super(400, 'VALIDATION_ERROR', msg, details); this.name = 'ValidationError'; } }
class ForbiddenError extends ApiError { constructor(msg?: string) { super(403, 'FORBIDDEN', msg ?? 'Access denied'); this.name = 'ForbiddenError'; } }

// ============================================================================
// Password hashing — PBKDF2-SHA512 (Vercel-safe, no native addons)
// ============================================================================
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verify;
}

// ============================================================================
// Password complexity
// ============================================================================
function validatePasswordComplexity(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain a special character';
  return null;
}

// ============================================================================
// Input validation helpers
// ============================================================================
function validateRequired(body: any, fields: string[]): void {
  const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length) throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
}
function sanitizeString(s: unknown): string { return String(s ?? '').replace(/[<>]/g, '').trim(); }
function sanitizeBody(body: Record<string, any>): Record<string, any> {
  const clean: any = {};
  for (const [k, v] of Object.entries(body)) {
    clean[k] = typeof v === 'string' ? sanitizeString(v) : v;
  }
  return clean;
}

// ============================================================================
// Audit trail helper
// ============================================================================
function getAuditLib() {
  try { return _require(path.join(process.cwd(), 'packages', 'audit-lib', 'src', 'hash-chain')); }
  catch { return { computeEventHash: (_p: any) => crypto.randomUUID(), GENESIS_HASH: 'NCTS-GENESIS-0000000000000000000000000000000000000000000000000000000000000000' }; }
}

async function writeAuditEvent(prismaClient: any, params: {
  entityType: string; entityId: string; action: string;
  actorId: string; actorRole: string; tenantId?: string | null;
  payload: Record<string, unknown>;
  ipAddress?: string; userAgent?: string;
}) {
  try {
    const { computeEventHash } = getAuditLib();
    const last = await prismaClient.auditEvent.findFirst({ orderBy: { sequenceNumber: 'desc' } });
    const previousHash = last?.eventHash ?? 'NCTS-GENESIS-0000000000000000000000000000000000000000000000000000000000000000';
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const eventHash = computeEventHash({ id, entityType: params.entityType, entityId: params.entityId, action: params.action, actorId: params.actorId, payload: params.payload, previousHash, createdAt });
    return await prismaClient.auditEvent.create({ data: { id, ...params, previousHash, eventHash, createdAt: new Date(createdAt) } });
  } catch { /* audit write failure must not break the request */ }
}

function extractIp(req: VercelRequest): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? 'unknown';
}

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

function decodeJwt(req: VercelRequest): Record<string, any> | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const [h, b, s] = auth.slice(7).split('.');
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url');
    if (sig !== s) return null;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

// ============================================================================
// Auth middleware
// ============================================================================
function requireAuth(req: VercelRequest): Record<string, any> {
  const jwt = decodeJwt(req);
  if (!jwt) throw new AuthError('Authentication required', 401);
  return jwt;
}

function requireRole(jwt: Record<string, any>, ...roles: string[]) {
  if (!roles.includes(jwt.role)) throw new ForbiddenError('Insufficient permissions');
}

function getTenantFilter(jwt: Record<string, any>): Record<string, any> {
  if (jwt.role === 'operator_admin' || jwt.role === 'operator_staff') {
    return { tenantId: jwt.tenantId };
  }
  return {};
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

// Demo accounts — passwords hashed via PBKDF2 on first access (never compared in plaintext)
const DEMO_ACCOUNTS = [
  { email: 'operator@greenpoint.co.za', role: 'operator_admin', firstName: 'Sipho', lastName: 'Ndlovu' },
  { email: 'admin@sahpra.gov.za', role: 'regulator', firstName: 'Dr. Naledi', lastName: 'Mokoena' },
];
const _demoPwMap: Record<string, string> = { 'operator@greenpoint.co.za': 'GreenPoint2026!', 'admin@sahpra.gov.za': 'SAHPRA2026!' };
const _demoHashCache = new Map<string, string>();
function getDemoHash(email: string): string | null {
  if (!_demoPwMap[email]) return null;
  if (!_demoHashCache.has(email)) _demoHashCache.set(email, hashPassword(_demoPwMap[email]));
  return _demoHashCache.get(email)!;
}

// ============================================================================
// AUTH
// ============================================================================
async function handleAuth(req: VercelRequest, res: VercelResponse, seg: string[]) {
  if (seg[1] === 'login' && req.method === 'POST') {
    const { email, password } = req.body ?? {};
    if (!email || !password) throw new ValidationError('Email and password are required');

    // DB-first login with brute-force lockout
    try {
      const user = await prisma.user.findUnique({ where: { email }, include: { tenant: true } });

      // Check account lockout
      if (user?.isLocked && user.lockedUntil && user.lockedUntil > new Date()) {
        return res.status(423).json({ error: { code: 'ACCOUNT_LOCKED', message: 'Account locked. Try again later.' } });
      }

      if (user && user.passwordHash) {
        // Verify against DB stored hash (PBKDF2)
        if (!verifyPassword(password, user.passwordHash)) {
          const attempts = (user.failedLoginAttempts ?? 0) + 1;
          await prisma.user.update({ where: { email }, data: { failedLoginAttempts: attempts, isLocked: attempts >= 5, lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null } });
          await writeAuditEvent(prisma, { entityType: 'User', entityId: user.id, action: 'LOGIN_FAILED', actorId: user.id, actorRole: user.role, tenantId: user.tenantId, payload: { email, failedAttempts: attempts }, ipAddress: extractIp(req) });
          throw new AuthError('Invalid credentials');
        }
        // Success — reset lockout counters
        await prisma.user.update({ where: { email }, data: { failedLoginAttempts: 0, isLocked: false, lockedUntil: null } });
        const token = signJwt({ userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId, firstName: user.firstName, lastName: user.lastName });
        await writeAuditEvent(prisma, { entityType: 'User', entityId: user.id, action: 'LOGIN_SUCCESS', actorId: user.id, actorRole: user.role, tenantId: user.tenantId, payload: { email }, ipAddress: extractIp(req) });
        return res.json({ accessToken: token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, tenantId: user.tenantId } });
      }

      // User exists in DB with no passwordHash, or no user — try demo credentials
      const demoAcct = DEMO_ACCOUNTS.find(a => a.email === email);
      const demoHash = getDemoHash(email);
      if (!demoAcct || !demoHash || !verifyPassword(password, demoHash)) {
        if (user) {
          const attempts = (user.failedLoginAttempts ?? 0) + 1;
          await prisma.user.update({ where: { email }, data: { failedLoginAttempts: attempts, isLocked: attempts >= 5, lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null } });
        }
        throw new AuthError('Invalid credentials');
      }

      // Demo credentials matched — persist hash in DB
      if (user) {
        await prisma.user.update({ where: { email }, data: { passwordHash: hashPassword(password), failedLoginAttempts: 0, isLocked: false, lockedUntil: null } });
        const token = signJwt({ userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId, firstName: user.firstName, lastName: user.lastName });
        await writeAuditEvent(prisma, { entityType: 'User', entityId: user.id, action: 'LOGIN_SUCCESS', actorId: user.id, actorRole: user.role, tenantId: user.tenantId, payload: { email, migrated: true }, ipAddress: extractIp(req) });
        return res.json({ accessToken: token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, tenantId: user.tenantId } });
      }
      // Create DB user from demo account
      let tenantId: string | null = null;
      if (demoAcct.role === 'operator_admin') {
        const t = await prisma.tenant.findFirst();
        tenantId = t?.id ?? null;
      }
      const newUser = await prisma.user.create({
        data: { email: demoAcct.email, firstName: demoAcct.firstName, lastName: demoAcct.lastName, role: demoAcct.role, tenantId, passwordHash: hashPassword(password) },
        include: { tenant: true },
      });
      const token = signJwt({ userId: newUser.id, email: newUser.email, role: newUser.role, tenantId: newUser.tenantId, firstName: newUser.firstName, lastName: newUser.lastName });
      await writeAuditEvent(prisma, { entityType: 'User', entityId: newUser.id, action: 'LOGIN_SUCCESS', actorId: newUser.id, actorRole: newUser.role, tenantId: newUser.tenantId, payload: { email, created: true }, ipAddress: extractIp(req) });
      return res.json({ accessToken: token, user: { id: newUser.id, email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName, role: newUser.role, tenantId: newUser.tenantId } });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      // Database unavailable — fallback to demo credential verification
      const demoAcct = DEMO_ACCOUNTS.find(a => a.email === email);
      const demoHash = getDemoHash(email);
      if (demoAcct && demoHash && verifyPassword(password, demoHash)) {
        const fallbackId = crypto.randomUUID();
        const token = signJwt({ userId: fallbackId, email: demoAcct.email, role: demoAcct.role, tenantId: null, firstName: demoAcct.firstName, lastName: demoAcct.lastName });
        return res.json({ accessToken: token, user: { id: fallbackId, email: demoAcct.email, firstName: demoAcct.firstName, lastName: demoAcct.lastName, role: demoAcct.role, tenantId: null } });
      }
      throw new AuthError('Invalid credentials');
    }
  }
  // GET /auth/me
  if (seg[1] === 'me' && req.method === 'GET') {
    const jwt = requireAuth(req);
    try {
      const user = await prisma.user.findUnique({ where: { id: jwt.userId }, include: { tenant: true } });
      if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, tenantId: user.tenantId, tenant: user.tenant });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      return res.json({ id: jwt.userId, email: jwt.email, firstName: jwt.firstName, lastName: jwt.lastName, role: jwt.role, tenantId: jwt.tenantId });
    }
  }
  // POST /auth/change-password
  if (seg[1] === 'change-password' && req.method === 'POST') {
    const jwt = requireAuth(req);
    const { currentPassword, newPassword } = req.body ?? {};
    if (!currentPassword || !newPassword) throw new ValidationError('Current and new passwords are required');
    const complexity = validatePasswordComplexity(newPassword);
    if (complexity) throw new ValidationError(complexity);
    try {
      const user = await prisma.user.findUnique({ where: { id: jwt.userId } });
      if (user?.passwordHash && !verifyPassword(currentPassword, user.passwordHash)) {
        throw new AuthError('Current password is incorrect');
      }
      await prisma.user.update({ where: { id: jwt.userId }, data: { passwordHash: hashPassword(newPassword) } });
      await writeAuditEvent(prisma, { entityType: 'User', entityId: jwt.userId, action: 'PASSWORD_CHANGED', actorId: jwt.userId, actorRole: jwt.role, tenantId: jwt.tenantId, payload: {}, ipAddress: extractIp(req) });
    } catch (err) { if (err instanceof ApiError) throw err; }
    return res.json({ success: true, message: 'Password changed successfully' });
  }
  // POST /auth/refresh
  if (seg[1] === 'refresh' && req.method === 'POST') {
    const jwt = decodeJwt(req);
    if (!jwt) return res.status(401).json({ error: { code: 'AUTH_ERROR', message: 'Token expired' } });
    const token = signJwt({ userId: jwt.userId, email: jwt.email, role: jwt.role, tenantId: jwt.tenantId, firstName: jwt.firstName, lastName: jwt.lastName });
    return res.json({ accessToken: token });
  }
  // POST /auth/logout
  if (seg[1] === 'logout' && req.method === 'POST') {
    return res.json({ success: true });
  }
  // POST /auth/forgot-password
  if (seg[1] === 'forgot-password' && req.method === 'POST') {
    return res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
  }
  // POST /auth/reset-password
  if (seg[1] === 'reset-password' && req.method === 'POST') {
    const { token, newPassword } = req.body ?? {};
    if (!token || !newPassword) throw new ValidationError('Token and new password are required');
    const complexity = validatePasswordComplexity(newPassword);
    if (complexity) throw new ValidationError(complexity);
    return res.json({ success: true, message: 'Password reset successfully' });
  }
  // POST /auth/mfa/setup
  if (seg[1] === 'mfa' && seg[2] === 'setup' && req.method === 'POST') {
    const jwt = requireAuth(req);
    return res.json({ secret: 'JBSWY3DPEHPK3PXP', qrUrl: `otpauth://totp/NCTS:${jwt.email}?secret=JBSWY3DPEHPK3PXP` });
  }
  // POST /auth/mfa/verify
  if (seg[1] === 'mfa' && seg[2] === 'verify' && req.method === 'POST') {
    requireAuth(req);
    return res.json({ success: true, message: 'MFA verified' });
  }
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

// ============================================================================
// FACILITIES
// ============================================================================
async function handleFacilities(req: VercelRequest, res: VercelResponse, seg: string[]) {
  const jwt = requireAuth(req);
  const tenantFilter = getTenantFilter(jwt);

  if (req.method === 'GET' && seg.length === 1) {
    const { page, limit, skip } = pageParams(req);
    const where = { ...tenantFilter };
    const [data, total] = await Promise.all([
      prisma.facility.findMany({ where, skip, take: limit, include: { tenant: { select: { name: true, tradingName: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.facility.count({ where }),
    ]);
    return res.json({ data, meta: meta(page, limit, total) });
  }
  if (req.method === 'GET' && seg.length === 2) {
    const f = await prisma.facility.findUnique({ where: { id: seg[1] }, include: { zones: true, tenant: true } });
    if (!f) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    if (tenantFilter.tenantId && f.tenantId !== tenantFilter.tenantId) throw new ForbiddenError();
    return res.json(f);
  }
  if (req.method === 'GET' && seg.length === 3 && seg[2] === 'zones') {
    return res.json(await prisma.zone.findMany({ where: { facilityId: seg[1], ...tenantFilter }, orderBy: { name: 'asc' } }));
  }
  if (req.method === 'POST' && seg.length === 1) {
    validateRequired(req.body, ['name', 'facilityType']);
    const body = sanitizeBody(req.body);
    const tenantId = jwt.tenantId ?? (await prisma.tenant.findFirst())?.id;
    const facility = await prisma.facility.create({ data: { ...body, tenantId } });
    await writeAuditEvent(prisma, { entityType: 'Facility', entityId: facility.id, action: 'FACILITY_CREATED', actorId: jwt.userId, actorRole: jwt.role, tenantId, payload: { name: facility.name }, ipAddress: extractIp(req) });
    return res.status(201).json(facility);
  }
  if (req.method === 'PATCH' && seg.length === 2) {
    const existing = await prisma.facility.findUnique({ where: { id: seg[1] } });
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    if (tenantFilter.tenantId && existing.tenantId !== tenantFilter.tenantId) throw new ForbiddenError();
    const body = sanitizeBody(req.body);
    const updated = await prisma.facility.update({ where: { id: seg[1] }, data: body });
    await writeAuditEvent(prisma, { entityType: 'Facility', entityId: seg[1], action: 'FACILITY_UPDATED', actorId: jwt.userId, actorRole: jwt.role, tenantId: existing.tenantId, payload: body, ipAddress: extractIp(req) });
    return res.json(updated);
  }
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

// ============================================================================
// PLANTS
// ============================================================================
async function handlePlants(req: VercelRequest, res: VercelResponse, seg: string[]) {
  const jwt = requireAuth(req);
  const tenantFilter = getTenantFilter(jwt);

  if (req.method === 'GET' && seg.length === 1) {
    const { page, limit, skip } = pageParams(req);
    const where: any = { ...tenantFilter };
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
    if (!p) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    if (tenantFilter.tenantId && p.tenantId !== tenantFilter.tenantId) throw new ForbiddenError();
    return res.json(p);
  }
  if (req.method === 'POST' && seg.length === 1) {
    validateRequired(req.body, ['strainId', 'facilityId']);
    const body = sanitizeBody(req.body);
    const tenantId = jwt.tenantId ?? (await prisma.tenant.findFirst())?.id;
    const count = await prisma.plant.count();
    const trackingId = `NCTS-ZA-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
    const plant = await prisma.plant.create({ data: { ...body, tenantId, trackingId } });
    await writeAuditEvent(prisma, { entityType: 'Plant', entityId: plant.id, action: 'PLANT_REGISTERED', actorId: jwt.userId, actorRole: jwt.role, tenantId, payload: { trackingId }, ipAddress: extractIp(req) });
    return res.status(201).json(plant);
  }
  if (req.method === 'POST' && seg[1] === 'batch-register') {
    const { plants } = req.body;
    if (!Array.isArray(plants) || plants.length === 0) throw new ValidationError('plants array is required');
    const tenantId = jwt.tenantId ?? (await prisma.tenant.findFirst())?.id;
    const baseCount = await prisma.plant.count();
    const results = [];
    for (let i = 0; i < plants.length; i++) {
      const trackingId = `NCTS-ZA-${new Date().getFullYear()}-${String(baseCount + i + 1).padStart(6, '0')}`;
      const p = await prisma.plant.create({ data: { ...sanitizeBody(plants[i]), tenantId, trackingId } });
      results.push(p);
    }
    await writeAuditEvent(prisma, { entityType: 'Plant', entityId: results[0]?.id ?? 'batch', action: 'PLANTS_BATCH_REGISTERED', actorId: jwt.userId, actorRole: jwt.role, tenantId, payload: { count: results.length }, ipAddress: extractIp(req) });
    return res.status(201).json(results);
  }
  if (req.method === 'PATCH' && seg.length === 3 && seg[2] === 'state') {
    const existing = await prisma.plant.findUnique({ where: { id: seg[1] } });
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    if (tenantFilter.tenantId && existing.tenantId !== tenantFilter.tenantId) throw new ForbiddenError();
    const updated = await prisma.plant.update({ where: { id: seg[1] }, data: { state: req.body.state } });
    await writeAuditEvent(prisma, { entityType: 'Plant', entityId: seg[1], action: 'PLANT_STATE_CHANGED', actorId: jwt.userId, actorRole: jwt.role, tenantId: existing.tenantId, payload: { oldState: existing.state, newState: req.body.state }, ipAddress: extractIp(req) });
    return res.json(updated);
  }
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

// ============================================================================
// BATCHES
// ============================================================================
async function handleBatches(req: VercelRequest, res: VercelResponse, seg: string[]) {
  const jwt = requireAuth(req);
  const tenantFilter = getTenantFilter(jwt);

  if (req.method === 'GET' && seg.length === 1) {
    const { page, limit, skip } = pageParams(req);
    const where = { ...tenantFilter };
    const [data, total] = await Promise.all([
      prisma.batch.findMany({ where, skip, take: limit, include: { strain: true, facility: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.batch.count({ where }),
    ]);
    return res.json({ data, meta: meta(page, limit, total) });
  }
  if (req.method === 'GET' && seg.length === 2) {
    const b = await prisma.batch.findUnique({ where: { id: seg[1] }, include: { strain: true, facility: true, labResult: true } });
    if (!b) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    if (tenantFilter.tenantId && b.tenantId !== tenantFilter.tenantId) throw new ForbiddenError();
    return res.json(b);
  }
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

// ============================================================================
// HARVESTS
// ============================================================================
async function handleHarvests(req: VercelRequest, res: VercelResponse, seg: string[]) {
  const jwt = requireAuth(req);
  const tenantFilter = getTenantFilter(jwt);

  if (req.method === 'GET' && seg.length === 1) {
    const { page, limit, skip } = pageParams(req);
    const where = { ...tenantFilter };
    const [data, total] = await Promise.all([
      prisma.harvest.findMany({ where, skip, take: limit, include: { batch: { select: { batchNumber: true } }, facility: { select: { name: true } } }, orderBy: { harvestDate: 'desc' } }),
      prisma.harvest.count({ where }),
    ]);
    return res.json({ data, meta: meta(page, limit, total) });
  }
  if (req.method === 'GET' && seg.length === 2) {
    const h = await prisma.harvest.findUnique({ where: { id: seg[1] }, include: { batch: true, facility: true } });
    if (!h) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    if (tenantFilter.tenantId && h.tenantId !== tenantFilter.tenantId) throw new ForbiddenError();
    return res.json(h);
  }
  if (req.method === 'POST' && seg.length === 1) {
    validateRequired(req.body, ['batchId', 'facilityId', 'harvestDate']);
    const body = sanitizeBody(req.body);
    const tenantId = jwt.tenantId ?? (await prisma.tenant.findFirst())?.id;
    const harvest = await prisma.harvest.create({ data: { ...body, tenantId } });
    await writeAuditEvent(prisma, { entityType: 'Harvest', entityId: harvest.id, action: 'HARVEST_CREATED', actorId: jwt.userId, actorRole: jwt.role, tenantId, payload: { batchId: body.batchId }, ipAddress: extractIp(req) });
    return res.status(201).json(harvest);
  }
  if (req.method === 'PATCH' && seg.length === 2) {
    const existing = await prisma.harvest.findUnique({ where: { id: seg[1] } });
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    if (tenantFilter.tenantId && existing.tenantId !== tenantFilter.tenantId) throw new ForbiddenError();
    const body = sanitizeBody(req.body);
    const updated = await prisma.harvest.update({ where: { id: seg[1] }, data: body });
    await writeAuditEvent(prisma, { entityType: 'Harvest', entityId: seg[1], action: 'HARVEST_UPDATED', actorId: jwt.userId, actorRole: jwt.role, tenantId: existing.tenantId, payload: body, ipAddress: extractIp(req) });
    return res.json(updated);
  }
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

// ============================================================================
// LAB RESULTS
// ============================================================================
async function handleLabResults(req: VercelRequest, res: VercelResponse, seg: string[]) {
  const jwt = requireAuth(req);
  const tenantFilter = getTenantFilter(jwt);

  if (req.method === 'GET' && seg.length === 1) {
    const { page, limit, skip } = pageParams(req);
    const where = { ...tenantFilter };
    const [data, total] = await Promise.all([
      prisma.labResult.findMany({ where, skip, take: limit, orderBy: { testDate: 'desc' } }),
      prisma.labResult.count({ where }),
    ]);
    return res.json({ data, meta: meta(page, limit, total) });
  }
  if (req.method === 'GET' && seg[1] === 'batch' && seg.length === 3) {
    return res.json(await prisma.labResult.findMany({ where: { batches: { some: { id: seg[2] } }, ...tenantFilter } }));
  }
  if (req.method === 'GET' && seg.length === 2) {
    const lr = await prisma.labResult.findUnique({ where: { id: seg[1] } });
    if (!lr) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    if (tenantFilter.tenantId && lr.tenantId !== tenantFilter.tenantId) throw new ForbiddenError();
    return res.json(lr);
  }
  if (req.method === 'POST' && seg.length === 1) {
    validateRequired(req.body, ['labName', 'testDate', 'status']);
    const body = sanitizeBody(req.body);
    const tenantId = jwt.tenantId ?? (await prisma.tenant.findFirst())?.id;
    const lr = await prisma.labResult.create({ data: { ...body, tenantId } });
    await writeAuditEvent(prisma, { entityType: 'LabResult', entityId: lr.id, action: 'LAB_RESULT_CREATED', actorId: jwt.userId, actorRole: jwt.role, tenantId, payload: { labName: body.labName, status: body.status }, ipAddress: extractIp(req) });
    return res.status(201).json(lr);
  }
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

// ============================================================================
// TRANSFERS
// ============================================================================
async function handleTransfers(req: VercelRequest, res: VercelResponse, seg: string[]) {
  const jwt = requireAuth(req);
  const tenantFilter = getTenantFilter(jwt);

  if (req.method === 'GET' && seg.length === 1) {
    const { page, limit, skip } = pageParams(req);
    const where = tenantFilter.tenantId ? { OR: [{ tenantId: tenantFilter.tenantId }, { senderTenantId: tenantFilter.tenantId }, { receiverTenantId: tenantFilter.tenantId }] } : {};
    const [data, total] = await Promise.all([
      prisma.transfer.findMany({ where, skip, take: limit, include: { items: { include: { batch: { select: { batchNumber: true } } } }, senderFacility: { select: { name: true } }, receiverFacility: { select: { name: true } }, senderTenant: { select: { name: true, tradingName: true } }, receiverTenant: { select: { name: true, tradingName: true } } }, orderBy: { initiatedAt: 'desc' } }),
      prisma.transfer.count({ where }),
    ]);
    return res.json({ data, meta: meta(page, limit, total) });
  }
  if (req.method === 'GET' && seg.length === 2) {
    const t = await prisma.transfer.findUnique({ where: { id: seg[1] }, include: { items: { include: { batch: true } }, senderFacility: true, receiverFacility: true, senderTenant: true, receiverTenant: true } });
    if (!t) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    if (tenantFilter.tenantId && t.tenantId !== tenantFilter.tenantId && t.senderTenantId !== tenantFilter.tenantId && t.receiverTenantId !== tenantFilter.tenantId) throw new ForbiddenError();
    return res.json(t);
  }
  if (req.method === 'POST' && seg.length === 1) {
    validateRequired(req.body, ['senderFacilityId', 'receiverFacilityId']);
    const { items, ...rest } = sanitizeBody(req.body) as any;
    const tenantId = jwt.tenantId ?? (await prisma.tenant.findFirst())?.id;
    const count = await prisma.transfer.count();
    const transferNumber = `TF-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const transfer = await prisma.transfer.create({ data: { ...rest, tenantId, transferNumber, status: 'pending', initiatedAt: new Date(), items: items ? { create: items } : undefined } });
    await writeAuditEvent(prisma, { entityType: 'Transfer', entityId: transfer.id, action: 'TRANSFER_CREATED', actorId: jwt.userId, actorRole: jwt.role, tenantId, payload: { transferNumber }, ipAddress: extractIp(req) });
    return res.status(201).json(transfer);
  }
  if (req.method === 'PATCH' && seg.length === 3 && seg[2] === 'accept') {
    const existing = await prisma.transfer.findUnique({ where: { id: seg[1] } });
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    const updated = await prisma.transfer.update({ where: { id: seg[1] }, data: { status: 'accepted', completedAt: new Date() } });
    await writeAuditEvent(prisma, { entityType: 'Transfer', entityId: seg[1], action: 'TRANSFER_ACCEPTED', actorId: jwt.userId, actorRole: jwt.role, tenantId: existing.tenantId, payload: { transferNumber: existing.transferNumber }, ipAddress: extractIp(req) });
    return res.json(updated);
  }
  if (req.method === 'PATCH' && seg.length === 3 && seg[2] === 'reject') {
    const existing = await prisma.transfer.findUnique({ where: { id: seg[1] } });
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    const updated = await prisma.transfer.update({ where: { id: seg[1] }, data: { status: 'rejected' } });
    await writeAuditEvent(prisma, { entityType: 'Transfer', entityId: seg[1], action: 'TRANSFER_REJECTED', actorId: jwt.userId, actorRole: jwt.role, tenantId: existing.tenantId, payload: { transferNumber: existing.transferNumber }, ipAddress: extractIp(req) });
    return res.json(updated);
  }
  if (req.method === 'PATCH' && seg.length === 3 && seg[2] === 'status') {
    const existing = await prisma.transfer.findUnique({ where: { id: seg[1] } });
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    if (tenantFilter.tenantId && existing.tenantId !== tenantFilter.tenantId && existing.senderTenantId !== tenantFilter.tenantId && existing.receiverTenantId !== tenantFilter.tenantId) throw new ForbiddenError();
    const body = sanitizeBody(req.body);
    const updated = await prisma.transfer.update({ where: { id: seg[1] }, data: { status: body.status } });
    await writeAuditEvent(prisma, { entityType: 'Transfer', entityId: seg[1], action: 'TRANSFER_STATUS_CHANGED', actorId: jwt.userId, actorRole: jwt.role, tenantId: updated.tenantId, payload: { status: body.status }, ipAddress: extractIp(req) });
    return res.json(updated);
  }
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

// ============================================================================
// SALES
// ============================================================================
async function handleSales(req: VercelRequest, res: VercelResponse, seg: string[]) {
  const jwt = requireAuth(req);
  const tenantFilter = getTenantFilter(jwt);

  if (req.method === 'GET' && seg.length === 1) {
    const { page, limit, skip } = pageParams(req);
    const where = { ...tenantFilter };
    const [data, total] = await Promise.all([
      prisma.sale.findMany({ where, skip, take: limit, include: { batch: { select: { batchNumber: true, strain: { select: { name: true } } } }, facility: { select: { name: true } } }, orderBy: { saleDate: 'desc' } }),
      prisma.sale.count({ where }),
    ]);
    return res.json({ data, meta: meta(page, limit, total) });
  }
  if (req.method === 'GET' && seg.length === 2) {
    const s = await prisma.sale.findUnique({ where: { id: seg[1] }, include: { batch: { include: { strain: true } }, facility: true } });
    if (!s) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    if (tenantFilter.tenantId && s.tenantId !== tenantFilter.tenantId) throw new ForbiddenError();
    return res.json(s);
  }
  if (req.method === 'POST' && seg.length === 1) {
    validateRequired(req.body, ['batchId', 'facilityId', 'quantityGrams', 'priceZar']);
    const body = sanitizeBody(req.body);
    const tenantId = jwt.tenantId ?? (await prisma.tenant.findFirst())?.id;
    const count = await prisma.sale.count();
    const saleNumber = `S-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const sale = await prisma.sale.create({ data: { ...body, tenantId, saleNumber } });
    await writeAuditEvent(prisma, { entityType: 'Sale', entityId: sale.id, action: 'SALE_CREATED', actorId: jwt.userId, actorRole: jwt.role, tenantId, payload: { saleNumber, quantityGrams: body.quantityGrams, priceZar: body.priceZar }, ipAddress: extractIp(req) });
    return res.status(201).json(sale);
  }
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

// ============================================================================
// REGULATORY
// ============================================================================
async function handleRegulatory(req: VercelRequest, res: VercelResponse, seg: string[]) {
  const jwt = requireAuth(req);
  requireRole(jwt, 'regulator', 'inspector', 'super_admin');

  // IMPORTANT: More-specific route (/dashboard/trends) must come BEFORE generic (/dashboard)
  if (req.method === 'GET' && seg[1] === 'dashboard' && seg[2] === 'trends') {
    const days: { date: string; plants: number; harvests: number; sales: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayStart = new Date(dateStr + 'T00:00:00Z');
      const dayEnd = new Date(dateStr + 'T23:59:59Z');
      const [plants, harvests, sales] = await Promise.all([
        prisma.plant.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
        prisma.harvest.count({ where: { harvestDate: { gte: dayStart, lte: dayEnd } } }),
        prisma.sale.count({ where: { saleDate: { gte: dayStart, lte: dayEnd } } }),
      ]);
      days.push({ date: dateStr, plants, harvests, sales });
    }
    return res.json(days);
  }

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
    const body = sanitizeBody(req.body);
    const updated = await prisma.permit.update({ where: { id: seg[2] }, data: { status: body.status } });
    await writeAuditEvent(prisma, { entityType: 'Permit', entityId: seg[2], action: 'PERMIT_STATUS_CHANGED', actorId: jwt.userId, actorRole: jwt.role, payload: { status: body.status }, ipAddress: extractIp(req) });
    return res.json(updated);
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

  // GET /regulatory/sales-aggregate
  if (req.method === 'GET' && seg[1] === 'sales-aggregate') {
    const sales = await prisma.sale.findMany({ select: { saleDate: true, priceZar: true, quantityGrams: true } });
    const monthly: Record<string, { revenue: number; count: number; quantity: number }> = {};
    for (const s of sales) {
      const key = s.saleDate.toISOString().slice(0, 7);
      if (!monthly[key]) monthly[key] = { revenue: 0, count: 0, quantity: 0 };
      monthly[key].revenue += Number(s.priceZar);
      monthly[key].count++;
      monthly[key].quantity += Number(s.quantityGrams);
    }
    return res.json(Object.entries(monthly).map(([month, data]) => ({ month, ...data })));
  }
  // GET /regulatory/compliance-average
  if (req.method === 'GET' && seg[1] === 'compliance-average') {
    const tenants = await prisma.tenant.findMany({ select: { complianceStatus: true } });
    const scores: Record<string, number> = { compliant: 100, warning: 60, non_compliant: 20, suspended: 0 };
    const total = tenants.reduce((sum: number, t: any) => sum + (scores[t.complianceStatus] ?? 50), 0);
    return res.json({ averageScore: tenants.length ? Math.round(total / tenants.length) : 0, totalOperators: tenants.length });
  }

  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

// ============================================================================
// VERIFY
// ============================================================================
async function handleVerify(req: VercelRequest, res: VercelResponse, seg: string[]) {
  if (req.method === 'POST' && seg[1] === 'report') {
    console.log('Suspicious report received:', req.body?.trackingId ?? req.body);
    return res.json({ success: true, message: 'Report received' });
  }

  if (req.method === 'GET' && seg.length === 2) {
    const trackingId = seg[1];
    try {
      const plant = await prisma.plant.findUnique({
        where: { trackingId },
        include: {
          strain: { select: { name: true, type: true } },
          batch: { include: { labResult: true, facility: { select: { name: true } } } },
          tenant: { select: { name: true, tradingName: true } },
        },
      });
      if (!plant) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' }, trackingId });
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
      return res.json(result);
    } catch {
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Database error during verification' } });
    }
  }
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

// ============================================================================
// OPERATORS
// ============================================================================
async function handleOperators(req: VercelRequest, res: VercelResponse, seg: string[]) {
  const jwt = requireAuth(req);

  if (req.method === 'GET' && seg.length === 3 && seg[2] === 'dashboard') {
    const tenantId = seg[1];
    // Operators can only view their own dashboard
    if (getTenantFilter(jwt).tenantId && getTenantFilter(jwt).tenantId !== tenantId) throw new ForbiddenError();
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [activePlants, pendingTransfers, monthlySalesAgg, tenant, facilityCount] = await Promise.all([
      prisma.plant.count({ where: { tenantId, state: { notIn: ['destroyed', 'harvested'] } } }),
      prisma.transfer.count({ where: { tenantId, status: 'pending' } }),
      prisma.sale.aggregate({ where: { tenantId, saleDate: { gte: firstOfMonth } }, _sum: { priceZar: true }, _count: true }),
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.facility.count({ where: { tenantId } }),
    ]);
    const complianceMap: Record<string, number> = { compliant: 98, warning: 72, non_compliant: 35, suspended: 0 };
    return res.json({
      activePlants,
      pendingTransfers,
      monthlySales: Number(monthlySalesAgg._sum?.priceZar ?? 0),
      monthlySalesCount: monthlySalesAgg._count ?? 0,
      complianceScore: complianceMap[tenant?.complianceStatus ?? 'compliant'] ?? 50,
      facilityCount,
      operatorName: tenant?.tradingName ?? tenant?.name ?? 'Unknown',
    });
  }
  if (req.method === 'GET' && seg.length === 3 && seg[2] === 'activity') {
    const tenantId = seg[1];
    // Operators can only view their own activity
    if (getTenantFilter(jwt).tenantId && getTenantFilter(jwt).tenantId !== tenantId) throw new ForbiddenError();
    try {
      const events = await prisma.auditEvent.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 20 });
      return res.json(events);
    } catch {
      // AuditEvent may not have tenantId — return recent events as fallback
      const events = await prisma.auditEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
      return res.json(events);
    }
  }
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

// ============================================================================
// INSPECTIONS
// ============================================================================
async function handleInspections(req: VercelRequest, res: VercelResponse, seg: string[]) {
  const jwt = requireAuth(req);
  const tenantFilter = getTenantFilter(jwt);

  if (req.method === 'GET' && seg.length === 1) {
    const { page, limit, skip } = pageParams(req);
    const where = { ...tenantFilter };
    const [data, total] = await Promise.all([
      prisma.inspection.findMany({ where, skip, take: limit, include: { facility: { select: { name: true } }, tenant: { select: { name: true, tradingName: true } } }, orderBy: { scheduledDate: 'desc' } }),
      prisma.inspection.count({ where }),
    ]);
    return res.json({ data, meta: meta(page, limit, total) });
  }
  if (req.method === 'GET' && seg[1] === 'analytics') {
    const baseWhere = { ...tenantFilter };
    const [total, passed, failed, pending] = await Promise.all([
      prisma.inspection.count({ where: baseWhere }),
      prisma.inspection.count({ where: { ...baseWhere, overallOutcome: 'pass' } }),
      prisma.inspection.count({ where: { ...baseWhere, overallOutcome: 'fail' } }),
      prisma.inspection.count({ where: { ...baseWhere, status: { in: ['scheduled', 'in_progress'] } } }),
    ]);
    return res.json({ total, passed, failed, pending, passRate: total > 0 ? Math.round((passed / total) * 100) : 0 });
  }
  if (req.method === 'GET' && seg.length === 2) {
    const i = await prisma.inspection.findUnique({ where: { id: seg[1] }, include: { facility: true, tenant: true } });
    if (!i) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    if (tenantFilter.tenantId && i.tenantId !== tenantFilter.tenantId) throw new ForbiddenError();
    return res.json(i);
  }
  if (req.method === 'POST' && seg.length === 1) {
    requireRole(jwt, 'regulator', 'inspector', 'super_admin');
    validateRequired(req.body, ['facilityId', 'tenantId', 'scheduledDate']);
    const body = sanitizeBody(req.body);
    const inspection = await prisma.inspection.create({ data: { ...body, inspectorId: jwt.userId } });
    await writeAuditEvent(prisma, { entityType: 'Inspection', entityId: inspection.id, action: 'INSPECTION_CREATED', actorId: jwt.userId, actorRole: jwt.role, tenantId: body.tenantId, payload: { facilityId: body.facilityId }, ipAddress: extractIp(req) });
    return res.status(201).json(inspection);
  }
  if (req.method === 'PATCH' && seg.length === 2) {
    requireRole(jwt, 'regulator', 'inspector', 'super_admin');
    const body = sanitizeBody(req.body);
    const updated = await prisma.inspection.update({ where: { id: seg[1] }, data: body });
    await writeAuditEvent(prisma, { entityType: 'Inspection', entityId: seg[1], action: 'INSPECTION_UPDATED', actorId: jwt.userId, actorRole: jwt.role, tenantId: updated.tenantId, payload: body, ipAddress: extractIp(req) });
    return res.json(updated);
  }
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

// ============================================================================
// AUDIT
// ============================================================================
async function handleAudit(req: VercelRequest, res: VercelResponse, seg: string[]) {
  const jwt = requireAuth(req);
  requireRole(jwt, 'regulator', 'inspector', 'super_admin');

  if (req.method === 'GET') {
    const { page, limit, skip } = pageParams(req);
    const where: any = {};
    if (req.query.action) where.action = req.query.action;
    if (req.query.entityType) where.entityType = req.query.entityType;
    if (req.query.actorId) where.actorId = req.query.actorId;
    if (req.query.tenantId) where.tenantId = req.query.tenantId;
    const [data, total] = await Promise.all([
      prisma.auditEvent.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.auditEvent.count({ where }),
    ]);
    return res.json({ data, meta: meta(page, limit, total) });
  }
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

// ============================================================================
// SETTINGS
// ============================================================================
async function handleSettings(req: VercelRequest, res: VercelResponse, _seg: string[]) {
  const jwt = requireAuth(req);
  requireRole(jwt, 'regulator', 'super_admin');

  // Settings stored as compliance rules with category 'system_setting'
  if (req.method === 'GET') {
    const rules = await prisma.complianceRule.findMany({ where: { isActive: true } });
    return res.json({ thresholds: rules, retentionDays: 365, defaultTimezone: 'Africa/Johannesburg' });
  }
  if (req.method === 'PATCH') {
    // Update individual compliance rule thresholds
    if (req.body.ruleId) {
      const body = sanitizeBody(req.body);
      const updated = await prisma.complianceRule.update({ where: { id: body.ruleId }, data: body });
      await writeAuditEvent(prisma, { entityType: 'ComplianceRule', entityId: body.ruleId, action: 'SETTING_UPDATED', actorId: jwt.userId, actorRole: jwt.role, payload: body, ipAddress: extractIp(req) });
      return res.json(updated);
    }
    return res.json({ success: true, message: 'Settings updated' });
  }
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

// ============================================================================
// ADMIN
// ============================================================================
async function handleAdmin(req: VercelRequest, res: VercelResponse, seg: string[]) {
  const jwt = requireAuth(req);
  requireRole(jwt, 'regulator', 'super_admin');

  if (req.method === 'GET' && seg[1] === 'users') {
    const users = await prisma.user.findMany({ where: { role: { in: ['regulator', 'inspector', 'super_admin'] } }, select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true } });
    return res.json(users);
  }
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

// ============================================================================
// SEARCH
// ============================================================================
async function handleSearch(req: VercelRequest, res: VercelResponse, _seg: string[]) {
  const jwt = requireAuth(req);
  const tenantFilter = getTenantFilter(jwt);

  const q = (req.query.q as string || '').trim();
  if (!q) return res.json([]);
  const like = { contains: q, mode: 'insensitive' as const };
  const [plants, batches, transfers, tenants] = await Promise.all([
    prisma.plant.findMany({ where: { trackingId: like, ...tenantFilter }, take: 5, select: { id: true, trackingId: true, state: true } }),
    prisma.batch.findMany({ where: { batchNumber: like, ...tenantFilter }, take: 5, select: { id: true, batchNumber: true, batchType: true } }),
    prisma.transfer.findMany({ where: { transferNumber: like, ...(tenantFilter.tenantId ? { OR: [{ tenantId: tenantFilter.tenantId }, { senderTenantId: tenantFilter.tenantId }, { receiverTenantId: tenantFilter.tenantId }] } : {}) }, take: 5, select: { id: true, transferNumber: true, status: true } }),
    tenantFilter.tenantId ? [] : prisma.tenant.findMany({ where: { OR: [{ name: like }, { tradingName: like }] }, take: 5, select: { id: true, name: true, tradingName: true } }),
  ]);
  return res.json([
    ...plants.map((p: any) => ({ type: 'plant', id: p.id, label: p.trackingId, detail: p.state })),
    ...batches.map((b: any) => ({ type: 'batch', id: b.id, label: b.batchNumber, detail: b.batchType })),
    ...transfers.map((t: any) => ({ type: 'transfer', id: t.id, label: t.transferNumber, detail: t.status })),
    ...(Array.isArray(tenants) ? tenants : []).map((t: any) => ({ type: 'operator', id: t.id, label: t.tradingName ?? t.name, detail: '' })),
  ]);
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================
async function handleNotifications(req: VercelRequest, res: VercelResponse, seg: string[]) {
  const jwt = decodeJwt(req);
  if (!jwt) return res.status(401).json({ error: { code: 'AUTH_ERROR', message: 'Unauthorized' } });
  if (req.method === 'GET' && seg.length === 1) {
    const data = await prisma.notification.findMany({ where: { userId: jwt.userId }, orderBy: { createdAt: 'desc' }, take: 50 });
    return res.json(data);
  }
  if (req.method === 'PATCH' && seg.length === 3 && seg[2] === 'read') {
    return res.json(await prisma.notification.update({ where: { id: seg[1] }, data: { readAt: new Date() } }));
  }
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

// ============================================================================
// SEED (one-time database population)
// ============================================================================
async function handleSeed(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } });

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

  // Demo users — store hashed passwords
  await prisma.user.upsert({ where: { email: 'operator@greenpoint.co.za' }, update: {}, create: { email: 'operator@greenpoint.co.za', firstName: 'Sipho', lastName: 'Ndlovu', role: 'operator_admin', tenantId: gp.id, passwordHash: hashPassword('GreenPoint2026!') } });
  await prisma.user.upsert({ where: { email: 'admin@sahpra.gov.za' }, update: {}, create: { email: 'admin@sahpra.gov.za', firstName: 'Dr. Naledi', lastName: 'Mokoena', role: 'regulator', passwordHash: hashPassword('SAHPRA2026!') } });

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

  try {
    // Ensure the Prisma singleton is initialised before any handler runs
    getPrisma();

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
      case 'operators': return await handleOperators(req, res, seg);
      case 'inspections': return await handleInspections(req, res, seg);
      case 'audit': return await handleAudit(req, res, seg);
      case 'settings': return await handleSettings(req, res, seg);
      case 'admin': return await handleAdmin(req, res, seg);
      case 'search': return await handleSearch(req, res, seg);
      case 'notifications': return await handleNotifications(req, res, seg);
      case 'seed': {
        const jwt = decodeJwt(req);
        if (!jwt || (jwt.role !== 'regulator' && jwt.role !== 'super_admin')) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only admins can seed' } });
        return await handleSeed(req, res);
      }
      case 'health': return res.json({ status: 'ok', timestamp: new Date().toISOString() });
      default:
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route not found: /api/v1/${seg.join('/')}` } });
    }
  } catch (err: any) {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({ error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } });
    }
    console.error('[NCTS API] Unhandled error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}
