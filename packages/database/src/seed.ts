import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Default dev password — all seed users use this
const DEV_PASSWORD = 'NctsDevPass123!';

async function seed() {
  console.log('🌱 Seeding NCTS database...');

  // Pre-hash the dev password so all seed users can log in
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);
  console.log(`  ℹ️  Dev password for all seed users: ${DEV_PASSWORD}`);

  // --- Reference Strains ---
  const strains = await Promise.all([
    prisma.strain.upsert({
      where: { name: 'Durban Poison' },
      update: {},
      create: {
        name: 'Durban Poison',
        type: 'sativa',
        thcRange: '15-25%',
        cbdRange: '0.02-0.1%',
        floweringWeeks: 9,
        description: 'Legendary South African sativa landrace. Sweet, earthy aroma.',
      },
    }),
    prisma.strain.upsert({
      where: { name: 'Swazi Gold' },
      update: {},
      create: {
        name: 'Swazi Gold',
        type: 'sativa',
        thcRange: '18-27%',
        cbdRange: '0.1-0.5%',
        floweringWeeks: 10,
        description: 'Premium African sativa from Eswatini. Fruity, spicy profile.',
      },
    }),
    prisma.strain.upsert({
      where: { name: 'Malawi Gold' },
      update: {},
      create: {
        name: 'Malawi Gold',
        type: 'sativa',
        thcRange: '16-22%',
        cbdRange: '0.5-1.0%',
        floweringWeeks: 12,
        description: 'East African sativa landrace. Long flowering, intense high.',
      },
    }),
    prisma.strain.upsert({
      where: { name: 'Rooibaard' },
      update: {},
      create: {
        name: 'Rooibaard',
        type: 'sativa',
        thcRange: '14-20%',
        cbdRange: '0.1-0.3%',
        floweringWeeks: 11,
        description: 'South African heirloom strain. Red-haired buds with earthy notes.',
      },
    }),
    prisma.strain.upsert({
      where: { name: 'SA Hemp Cultivar #1' },
      update: {},
      create: {
        name: 'SA Hemp Cultivar #1',
        type: 'sativa',
        thcRange: '<0.2%',
        cbdRange: '8-15%',
        floweringWeeks: 8,
        description: 'Industrial hemp cultivar compliant with DALRRD THC threshold.',
      },
    }),
  ]);

  console.log(`  ✅ Seeded ${strains.length} strains`);

  // --- Demo Tenant 1: GreenFields ---
  const tenant1 = await prisma.tenant.upsert({
    where: { registrationNumber: '2025/123456/07' },
    update: {},
    create: {
      name: 'GreenFields Cultivation (Pty) Ltd',
      tradingName: 'GreenFields',
      registrationNumber: '2025/123456/07',
      taxNumber: '9876543210',
      bbbeeLevel: 2,
      contactEmail: 'info@greenfields.co.za',
      contactPhone: '+27 21 555 0100',
      province: 'WC',
      address: '42 Vineyard Road, Stellenbosch, Western Cape, 7600',
      complianceStatus: 'compliant',
    },
  });

  // --- Demo Tenant 2: Cape Cannabis Dispensary ---
  const tenant2 = await prisma.tenant.upsert({
    where: { registrationNumber: '2025/789012/07' },
    update: {},
    create: {
      name: 'Cape Cannabis Dispensary (Pty) Ltd',
      tradingName: 'Cape Cannabis',
      registrationNumber: '2025/789012/07',
      taxNumber: '1234567890',
      bbbeeLevel: 3,
      contactEmail: 'info@capecannabis.co.za',
      contactPhone: '+27 21 555 0200',
      province: 'WC',
      address: '15 Bree Street, Cape Town, Western Cape, 8001',
      complianceStatus: 'compliant',
    },
  });

  // --- Demo Tenant 3: Limpopo Growers (non-compliant) ---
  const tenant3 = await prisma.tenant.upsert({
    where: { registrationNumber: '2025/345678/07' },
    update: {},
    create: {
      name: 'Limpopo Growers (Pty) Ltd',
      tradingName: 'Limpopo Growers',
      registrationNumber: '2025/345678/07',
      bbbeeLevel: 4,
      contactEmail: 'admin@limpopogrowers.co.za',
      province: 'LP',
      address: '88 Bushveld Road, Polokwane, Limpopo, 0700',
      complianceStatus: 'non_compliant',
    },
  });

  console.log(`  ✅ Seeded 3 tenants`);

  // --- Users ---
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@greenfields.co.za' },
    update: { passwordHash },
    create: {
      email: 'admin@greenfields.co.za',
      firstName: 'Thabo',
      lastName: 'Mokoena',
      role: 'operator_admin',
      tenantId: tenant1.id,
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@greenfields.co.za' },
    update: { passwordHash },
    create: {
      email: 'staff@greenfields.co.za',
      firstName: 'Lindiwe',
      lastName: 'Nkosi',
      role: 'operator_staff',
      tenantId: tenant1.id,
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@capecannabis.co.za' },
    update: { passwordHash },
    create: {
      email: 'admin@capecannabis.co.za',
      firstName: 'Pieter',
      lastName: 'van der Merwe',
      role: 'operator_admin',
      tenantId: tenant2.id,
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@limpopogrowers.co.za' },
    update: { passwordHash },
    create: {
      email: 'admin@limpopogrowers.co.za',
      firstName: 'Sipho',
      lastName: 'Mabunda',
      role: 'operator_admin',
      tenantId: tenant3.id,
      passwordHash,
    },
  });

  const regulatorUser = await prisma.user.upsert({
    where: { email: 'inspector@sahpra.gov.za' },
    update: { passwordHash },
    create: {
      email: 'inspector@sahpra.gov.za',
      firstName: 'Nomsa',
      lastName: 'Dlamini',
      role: 'regulator',
      tenantId: null,
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: 'lab@sacannabislabs.co.za' },
    update: { passwordHash },
    create: {
      email: 'lab@sacannabislabs.co.za',
      firstName: 'Dr. Sarah',
      lastName: 'Botha',
      role: 'lab_technician',
      tenantId: tenant1.id,
      passwordHash,
    },
  });

  console.log('  ✅ Seeded 6 users');

  // --- Facilities ---
  // Clean up dependent records first, then zones to allow re-seeding
  await prisma.plant.deleteMany({});
  await prisma.zone.deleteMany({});

  const facility1 = await prisma.facility.upsert({
    where: {
      id: (await prisma.facility.findFirst({ where: { tenantId: tenant1.id, name: 'GreenFields Farm' } }))?.id ?? '00000000-0000-0000-0000-000000000000',
    },
    update: {},
    create: {
      tenantId: tenant1.id,
      name: 'GreenFields Farm',
      facilityType: 'cultivation',
      province: 'WC',
      address: '42 Vineyard Road, Stellenbosch',
      latitude: -33.9321,
      longitude: 18.8602,
    },
  });

  const facility1b = await prisma.facility.upsert({
    where: {
      id: (await prisma.facility.findFirst({ where: { tenantId: tenant1.id, name: 'GreenFields Processing Hub' } }))?.id ?? '00000000-0000-0000-0000-000000000001',
    },
    update: {},
    create: {
      tenantId: tenant1.id,
      name: 'GreenFields Processing Hub',
      facilityType: 'processing',
      province: 'WC',
      address: '15 Industrial Avenue, Paarl',
      latitude: -33.7340,
      longitude: 18.9619,
    },
  });

  const facility2 = await prisma.facility.upsert({
    where: {
      id: (await prisma.facility.findFirst({ where: { tenantId: tenant2.id, name: 'Cape Cannabis Dispensary' } }))?.id ?? '00000000-0000-0000-0000-000000000002',
    },
    update: {},
    create: {
      tenantId: tenant2.id,
      name: 'Cape Cannabis Dispensary',
      facilityType: 'retail',
      province: 'WC',
      address: '15 Bree Street, Cape Town',
      latitude: -33.9249,
      longitude: 18.4241,
    },
  });

  const facility3 = await prisma.facility.upsert({
    where: {
      id: (await prisma.facility.findFirst({ where: { tenantId: tenant3.id, name: 'Limpopo Cannabis Farm' } }))?.id ?? '00000000-0000-0000-0000-000000000003',
    },
    update: {},
    create: {
      tenantId: tenant3.id,
      name: 'Limpopo Cannabis Farm',
      facilityType: 'cultivation',
      province: 'LP',
      address: '88 Bushveld Road, Polokwane',
      latitude: -23.9045,
      longitude: 29.4688,
    },
  });

  console.log('  ✅ Seeded 4 facilities');

  // --- Zones ---
  const zones = await prisma.zone.createMany({
    data: [
      { tenantId: tenant1.id, facilityId: facility1.id, name: 'Zone A - Indoor', capacity: 200 },
      { tenantId: tenant1.id, facilityId: facility1.id, name: 'Zone B - Greenhouse', capacity: 300 },
      { tenantId: tenant1.id, facilityId: facility1.id, name: 'Zone C - Outdoor', capacity: 500 },
      { tenantId: tenant3.id, facilityId: facility3.id, name: 'Field 1', capacity: 1000 },
    ],
    skipDuplicates: true,
  });

  const allZones = await prisma.zone.findMany({ where: { facilityId: facility1.id } });
  const zoneA = allZones.find((z) => z.name.includes('Zone A'))!;
  const zoneB = allZones.find((z) => z.name.includes('Zone B'))!;
  const zoneC = allZones.find((z) => z.name.includes('Zone C'))!;

  console.log(`  ✅ Seeded ${zones.count} zones`);

  // --- Permits ---
  await prisma.permit.deleteMany({});
  await prisma.permit.createMany({
    data: [
      {
        tenantId: tenant1.id,
        facilityId: facility1.id,
        permitType: 'sahpra_22a',
        permitNumber: 'SAHPRA-22A-2026-0042',
        issuingAuthority: 'SAHPRA',
        issueDate: new Date('2025-06-01'),
        expiryDate: new Date('2026-06-01'),
        status: 'active',
      },
      {
        tenantId: tenant2.id,
        facilityId: facility2.id,
        permitType: 'sahpra_22c',
        permitNumber: 'SAHPRA-22C-2026-0099',
        issuingAuthority: 'SAHPRA',
        issueDate: new Date('2025-08-15'),
        expiryDate: new Date('2026-08-15'),
        status: 'active',
      },
      {
        tenantId: tenant3.id,
        facilityId: facility3.id,
        permitType: 'dalrrd_hemp',
        permitNumber: 'DALRRD-HEMP-2025-0118',
        issuingAuthority: 'DALRRD',
        issueDate: new Date('2024-12-01'),
        expiryDate: new Date('2025-12-01'),
        status: 'expired',
        conditions: 'Max 500 plants. Monthly reporting required.',
      },
    ],
  });

  console.log('  ✅ Seeded 3 permits');

  // --- Plants ---
  // Clean up existing plants to allow re-seeding
  await prisma.plant.deleteMany({});

  const plantData: {
    tenantId: string;
    facilityId: string;
    zoneId: string;
    strainId: string;
    state: string;
    trackingId: string;
    plantedDate: Date;
    harvestedDate?: Date;
  }[] = [];

  // Zone A: 40 Durban Poison plants in various lifecycle states
  for (let i = 1; i <= 10; i++) {
    plantData.push({
      tenantId: tenant1.id, facilityId: facility1.id, zoneId: zoneA.id,
      strainId: strains[0].id, state: 'harvested',
      trackingId: `NCTS-ZA-2026-${String(i).padStart(6, '0')}`,
      plantedDate: new Date('2025-10-01'),
      harvestedDate: new Date('2026-01-15'),
    });
  }
  for (let i = 11; i <= 25; i++) {
    plantData.push({
      tenantId: tenant1.id, facilityId: facility1.id, zoneId: zoneA.id,
      strainId: strains[0].id, state: 'flowering',
      trackingId: `NCTS-ZA-2026-${String(i).padStart(6, '0')}`,
      plantedDate: new Date('2025-11-15'),
    });
  }
  for (let i = 26; i <= 40; i++) {
    plantData.push({
      tenantId: tenant1.id, facilityId: facility1.id, zoneId: zoneA.id,
      strainId: strains[0].id, state: 'vegetative',
      trackingId: `NCTS-ZA-2026-${String(i).padStart(6, '0')}`,
      plantedDate: new Date('2026-01-05'),
    });
  }

  // Zone B: 30 Swazi Gold plants
  for (let i = 41; i <= 55; i++) {
    plantData.push({
      tenantId: tenant1.id, facilityId: facility1.id, zoneId: zoneB.id,
      strainId: strains[1].id, state: 'flowering',
      trackingId: `NCTS-ZA-2026-${String(i).padStart(6, '0')}`,
      plantedDate: new Date('2025-12-01'),
    });
  }
  for (let i = 56; i <= 70; i++) {
    plantData.push({
      tenantId: tenant1.id, facilityId: facility1.id, zoneId: zoneB.id,
      strainId: strains[1].id, state: 'seedling',
      trackingId: `NCTS-ZA-2026-${String(i).padStart(6, '0')}`,
      plantedDate: new Date('2026-02-10'),
    });
  }

  // Zone C: 20 Malawi Gold + 10 Rooibaard
  for (let i = 71; i <= 90; i++) {
    plantData.push({
      tenantId: tenant1.id, facilityId: facility1.id, zoneId: zoneC.id,
      strainId: strains[2].id, state: 'vegetative',
      trackingId: `NCTS-ZA-2026-${String(i).padStart(6, '0')}`,
      plantedDate: new Date('2026-01-20'),
    });
  }
  for (let i = 91; i <= 100; i++) {
    plantData.push({
      tenantId: tenant1.id, facilityId: facility1.id, zoneId: zoneC.id,
      strainId: strains[3].id, state: 'seed',
      trackingId: `NCTS-ZA-2026-${String(i).padStart(6, '0')}`,
      plantedDate: new Date('2026-02-18'),
    });
  }

  await prisma.plant.createMany({ data: plantData });
  console.log(`  ✅ Seeded ${plantData.length} plants`);

  // --- Batches ---
  await prisma.harvest.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.transferItem.deleteMany({});
  await prisma.transfer.deleteMany({});
  await prisma.batch.deleteMany({});
  await prisma.labResult.deleteMany({});

  const batch1 = await prisma.batch.create({
    data: {
      tenantId: tenant1.id,
      batchNumber: 'BATCH-2026-000001',
      batchType: 'harvest',
      strainId: strains[0].id,
      facilityId: facility1.id,
      plantCount: 10,
      wetWeightGrams: 12500,
      dryWeightGrams: 3200,
      createdDate: new Date('2026-01-15'),
    },
  });

  // Link harvested plants to batch
  await prisma.plant.updateMany({
    where: { tenantId: tenant1.id, state: 'harvested' },
    data: { batchId: batch1.id },
  });

  const batch2 = await prisma.batch.create({
    data: {
      tenantId: tenant1.id,
      batchNumber: 'BATCH-2026-000002',
      batchType: 'processed',
      strainId: strains[0].id,
      facilityId: facility1b.id,
      plantCount: 10,
      dryWeightGrams: 3000,
      processedWeightGrams: 2800,
      parentBatchId: batch1.id,
      createdDate: new Date('2026-02-01'),
    },
  });

  console.log('  ✅ Seeded 2 batches');

  // --- Lab Results ---
  const labResult1 = await prisma.labResult.create({
    data: {
      tenantId: tenant1.id,
      labName: 'SA Cannabis Testing Laboratory',
      labAccreditationNumber: 'SANAS-T0892',
      testDate: new Date('2026-01-25'),
      status: 'pass',
      thcPercent: 18.5,
      cbdPercent: 0.8,
      cbnPercent: 0.3,
      cbgPercent: 1.2,
      totalCannabinoidsPercent: 20.8,
      pesticidesPass: true,
      heavyMetalsPass: true,
      microbialsPass: true,
      mycotoxinsPass: true,
      terpeneProfile: { myrcene: 0.45, limonene: 0.32, caryophyllene: 0.28, pinene: 0.15 },
      moisturePercent: 10.2,
    },
  });

  // Link lab result to batch
  await prisma.batch.update({
    where: { id: batch1.id },
    data: { labResultId: labResult1.id },
  });

  console.log('  ✅ Seeded 1 lab result');

  // --- Harvests ---
  const harvestedPlantIds = plantData
    .filter((p) => p.state === 'harvested')
    .map((p) => p.trackingId);

  const harvestedPlants = await prisma.plant.findMany({
    where: { trackingId: { in: harvestedPlantIds } },
    select: { id: true },
  });

  await prisma.harvest.create({
    data: {
      tenantId: tenant1.id,
      batchId: batch1.id,
      facilityId: facility1.id,
      harvestDate: new Date('2026-01-15'),
      wetWeightGrams: 12500,
      dryWeightGrams: 3200,
      plantIds: harvestedPlants.map((p) => p.id),
      notes: 'First harvest of 2026. Excellent trichome coverage.',
    },
  });

  console.log('  ✅ Seeded 1 harvest');

  // --- Transfers ---
  await prisma.transfer.create({
    data: {
      tenantId: tenant1.id,
      transferNumber: 'TRF-2026-000001',
      senderTenantId: tenant1.id,
      senderFacilityId: facility1b.id,
      receiverTenantId: tenant2.id,
      receiverFacilityId: facility2.id,
      status: 'accepted',
      initiatedAt: new Date('2026-02-15'),
      completedAt: new Date('2026-02-16'),
      vehicleRegistration: 'CA 123-456',
      driverName: 'Johan Pretorius',
      driverIdNumber: '8501015800081',
      items: {
        create: [
          { batchId: batch2.id, quantityGrams: 500, receivedQuantityGrams: 498 },
        ],
      },
    },
  });

  console.log('  ✅ Seeded 1 transfer');

  // --- Sales ---
  await prisma.sale.create({
    data: {
      tenantId: tenant2.id,
      saleNumber: 'SALE-2026-000001',
      batchId: batch2.id,
      facilityId: facility2.id,
      quantityGrams: 3.5,
      priceZar: 250.0,
      saleDate: new Date('2026-02-18'),
      customerVerified: true,
    },
  });

  await prisma.sale.create({
    data: {
      tenantId: tenant2.id,
      saleNumber: 'SALE-2026-000002',
      batchId: batch2.id,
      facilityId: facility2.id,
      quantityGrams: 7.0,
      priceZar: 480.0,
      saleDate: new Date('2026-02-19'),
      customerVerified: true,
    },
  });

  console.log('  ✅ Seeded 2 sales');

  // --- Compliance Rules (reference data) ---
  const complianceRules = await Promise.all([
    prisma.complianceRule.create({
      data: {
        name: 'R001',
        description: 'Every facility must have at least one active, non-expired permit to operate.',
        category: 'permit',
        severity: 'critical',
        evaluationType: 'scheduled',
        ruleDefinition: { check: 'facility_has_active_permit', params: {} },
        thresholds: { expiryWarningDays: 30, expiryGraceDays: 7 },
        isActive: true,
      },
    }),
    prisma.complianceRule.create({
      data: {
        name: 'R002',
        description: 'All batches must have lab-tested THC below the permitted threshold for their product category.',
        category: 'lab',
        severity: 'critical',
        evaluationType: 'real_time',
        ruleDefinition: { check: 'thc_below_limit', params: { medicinal_max: 30.0, hemp_max: 0.2 } },
        isActive: true,
      },
    }),
    prisma.complianceRule.create({
      data: {
        name: 'R003',
        description: 'Declared inventory must match calculated inventory within 2% tolerance.',
        category: 'inventory',
        severity: 'warning',
        evaluationType: 'batch',
        ruleDefinition: { check: 'inventory_variance', params: { tolerance_percent: 2.0 } },
        thresholds: { warning: 1.5, critical: 2.0, emergencyPercent: 10.0 },
        isActive: true,
      },
    }),
    prisma.complianceRule.create({
      data: {
        name: 'R004',
        description: 'Flags transfers that deviate more than 3 standard deviations from historical patterns.',
        category: 'transfer',
        severity: 'warning',
        evaluationType: 'real_time',
        ruleDefinition: { check: 'transfer_velocity', params: { zScoreThreshold: 3.0 } },
        isActive: true,
      },
    }),
    prisma.complianceRule.create({
      data: {
        name: 'R005',
        description: 'Detects QR verification scans from locations inconsistent with facility coordinates.',
        category: 'verification',
        severity: 'warning',
        evaluationType: 'batch',
        ruleDefinition: { check: 'verification_anomaly', params: { maxDistanceKm: 50 } },
        isActive: true,
      },
    }),
    prisma.complianceRule.create({
      data: {
        name: 'R006',
        description: 'Validates that wet-to-dry weight conversion ratios fall within biologically plausible ranges.',
        category: 'production',
        severity: 'warning',
        evaluationType: 'real_time',
        ruleDefinition: { check: 'wet_dry_ratio', params: { minRatio: 2.0, maxRatio: 7.0, criticalMin: 1.5, criticalMax: 8.0 } },
        isActive: true,
      },
    }),
    prisma.complianceRule.create({
      data: {
        name: 'R007',
        description: 'Ensures total facility output does not exceed input plus natural growth variance.',
        category: 'inventory',
        severity: 'critical',
        evaluationType: 'batch',
        ruleDefinition: { check: 'mass_balance', params: { tolerancePercent: 5.0 } },
        isActive: true,
      },
    }),
    prisma.complianceRule.create({
      data: {
        name: 'R008',
        description: 'Verifies current plant count and production volumes remain within permit limits.',
        category: 'production',
        severity: 'critical',
        evaluationType: 'real_time',
        ruleDefinition: { check: 'production_limit', params: { plantCountMultiplier: 10 } },
        isActive: true,
      },
    }),
    prisma.complianceRule.create({
      data: {
        name: 'R009',
        description: 'Ensures batches are lab-tested within required timeframes; flags untested batches.',
        category: 'lab',
        severity: 'warning',
        evaluationType: 'batch',
        ruleDefinition: { check: 'lab_result_frequency', params: { maxDaysWithoutTest: 30 } },
        isActive: true,
      },
    }),
    prisma.complianceRule.create({
      data: {
        name: 'R010',
        description: 'Prevents zone overcrowding by checking plant counts against zone capacity limits.',
        category: 'production',
        severity: 'warning',
        evaluationType: 'real_time',
        ruleDefinition: { check: 'zone_capacity', params: { warningThreshold: 0.9, criticalThreshold: 1.0 } },
        isActive: true,
      },
    }),
    prisma.complianceRule.create({
      data: {
        name: 'R011',
        description: 'Monitors whether required periodic reports are submitted on time.',
        category: 'permit',
        severity: 'warning',
        evaluationType: 'scheduled',
        ruleDefinition: { check: 'reporting_deadline', params: { monthlyDeadlineDays: 5, quarterlyDeadlineDays: 15 } },
        isActive: true,
      },
    }),
    prisma.complianceRule.create({
      data: {
        name: 'R012',
        description: 'Validates destruction events have required witnesses, photos, and approved methods.',
        category: 'inventory',
        severity: 'critical',
        evaluationType: 'real_time',
        ruleDefinition: { check: 'destruction_compliance', params: { minWitnesses: 2, requirePhotos: true } },
        isActive: true,
      },
    }),
    prisma.complianceRule.create({
      data: {
        name: 'R013',
        description: 'Ensures import and export volumes align with INCB quotas and permit allowances.',
        category: 'transfer',
        severity: 'critical',
        evaluationType: 'batch',
        ruleDefinition: { check: 'import_export_balance', params: { quotaTolerancePercent: 5.0 } },
        isActive: true,
      },
    }),
    prisma.complianceRule.create({
      data: {
        name: 'R014',
        description: 'Ensures operations match permitted activity types (cultivation, processing, distribution, research).',
        category: 'permit',
        severity: 'critical',
        evaluationType: 'real_time',
        ruleDefinition: { check: 'permit_activity_scope', params: {} },
        isActive: true,
      },
    }),
  ]);

  console.log(`  ✅ Seeded ${complianceRules.length} compliance rules`);

  // --- Notifications ---
  await prisma.notification.create({
    data: {
      userId: adminUser.id,
      type: 'info',
      channel: 'in_app',
      title: 'Welcome to NCTS',
      body: 'Your account has been set up. Please review your facility details and ensure all permits are current.',
    },
  });

  console.log('  ✅ Seeded 1 notification');

  // --- Excise Rates (reference data) ---
  await Promise.all([
    prisma.exciseRate.create({
      data: {
        productCategory: 'dried_flower',
        ratePerUnit: 3.75,
        unit: 'gram',
        effectiveDate: new Date('2026-01-01'),
        isActive: true,
      },
    }),
    prisma.exciseRate.create({
      data: {
        productCategory: 'extract',
        ratePerUnit: 8.50,
        unit: 'ml',
        effectiveDate: new Date('2026-01-01'),
        isActive: true,
      },
    }),
    prisma.exciseRate.create({
      data: {
        productCategory: 'hemp_fiber',
        ratePerUnit: 0.25,
        unit: 'gram',
        effectiveDate: new Date('2026-01-01'),
        isActive: true,
      },
    }),
  ]);

  console.log('  ✅ Seeded 3 excise rates');

  // --- Audit Events (genesis + sample) ---
  // FIX (C5): Check if audit events exist before deleting (immutability trigger may be active)
  const existingAuditCount = await prisma.auditEvent.count();
  if (existingAuditCount === 0) {
    const genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';

    await prisma.auditEvent.create({
      data: {
        entityType: 'system',
        entityId: 'genesis',
        action: 'create',
        actorId: regulatorUser.id,
        actorRole: 'regulator',
        tenantId: null,
        payload: { message: 'NCTS Audit Chain Initialized' },
        previousHash: genesisHash,
        eventHash: 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      },
    });

    await prisma.auditEvent.create({
      data: {
        entityType: 'plant',
        entityId: 'batch-create',
        action: 'create',
        actorId: adminUser.id,
        actorRole: 'operator_admin',
        tenantId: tenant1.id,
        payload: { plantCount: 100, strains: ['Durban Poison', 'Swazi Gold', 'Malawi Gold', 'Rooibaard'] },
        previousHash: 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
        eventHash: 'b2c3d4e5f6789012345678901bcdef01234567890abcdef1234567890abcdef12',
      },
    });

    console.log('  ✅ Seeded 2 audit events');
  } else {
    console.log(`  ⏭️  Skipped audit events (${existingAuditCount} already exist — immutable)`);
  }

  console.log('🌿 NCTS seed complete!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
