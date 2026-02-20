import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding NCTS database...');

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

  // --- Demo Tenant ---
  const tenant = await prisma.tenant.upsert({
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

  console.log(`  ✅ Seeded tenant: ${tenant.name}`);

  // --- Demo User ---
  const user = await prisma.user.upsert({
    where: { email: 'admin@greenfields.co.za' },
    update: {},
    create: {
      email: 'admin@greenfields.co.za',
      firstName: 'Thabo',
      lastName: 'Mokoena',
      role: 'operator_admin',
      tenantId: tenant.id,
    },
  });

  console.log(`  ✅ Seeded user: ${user.email}`);

  // --- Demo Facility ---
  const facility = await prisma.facility.upsert({
    where: { id: tenant.id }, // just use upsert to avoid duplication
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'GreenFields Farm',
      facilityType: 'cultivation',
      province: 'WC',
      address: '42 Vineyard Road, Stellenbosch',
      latitude: -33.9321,
      longitude: 18.8602,
    },
  });

  console.log(`  ✅ Seeded facility: ${facility.name}`);

  // --- Demo Zones ---
  const zones = ['Zone A - Indoor', 'Zone B - Greenhouse', 'Zone C - Outdoor'];
  for (const zoneName of zones) {
    await prisma.zone.create({
      data: {
        tenantId: tenant.id,
        facilityId: facility.id,
        name: zoneName,
        capacity: 200,
      },
    });
  }

  console.log(`  ✅ Seeded ${zones.length} zones`);

  // --- Regulator User ---
  await prisma.user.upsert({
    where: { email: 'inspector@sahpra.gov.za' },
    update: {},
    create: {
      email: 'inspector@sahpra.gov.za',
      firstName: 'Nomsa',
      lastName: 'Dlamini',
      role: 'regulator',
      tenantId: null,
    },
  });

  console.log('  ✅ Seeded regulator user');

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
