import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─────────────────────────────────────────────
  // 1. Asset Categories
  // ─────────────────────────────────────────────
  const [electronics, furniture, vehicles, equipment, rooms] = await Promise.all([
    prisma.assetCategory.upsert({
      where: { name: 'Electronics' },
      update: {},
      create: {
        name: 'Electronics',
        description: 'Computers, phones, and electronic devices',
        extraFields: { warrantyPeriod: '2 years', powerConsumption: 'required' },
      },
    }),
    prisma.assetCategory.upsert({
      where: { name: 'Furniture' },
      update: {},
      create: { name: 'Furniture', description: 'Office furniture and fixtures' },
    }),
    prisma.assetCategory.upsert({
      where: { name: 'Vehicles' },
      update: {},
      create: {
        name: 'Vehicles',
        description: 'Company vehicles',
        extraFields: { registrationNumber: 'required', insuranceExpiry: 'required' },
      },
    }),
    prisma.assetCategory.upsert({
      where: { name: 'Equipment' },
      update: {},
      create: { name: 'Equipment', description: 'Machinery and industrial equipment' },
    }),
    prisma.assetCategory.upsert({
      where: { name: 'Rooms & Spaces' },
      update: {},
      create: {
        name: 'Rooms & Spaces',
        description: 'Conference rooms and shared spaces',
        extraFields: { capacity: 'required', amenities: 'optional' },
      },
    }),
  ]);
  console.log('✅ Categories created');

  // ─────────────────────────────────────────────
  // 2. Users
  // ─────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  const empPasswordHash = await bcrypt.hash('Employee@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@assetflow.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@assetflow.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const assetManager = await prisma.user.upsert({
    where: { email: 'manager@assetflow.com' },
    update: {},
    create: {
      name: 'Arjun Sharma',
      email: 'manager@assetflow.com',
      passwordHash: empPasswordHash,
      role: 'ASSET_MANAGER',
    },
  });

  const deptHead = await prisma.user.upsert({
    where: { email: 'depthead@assetflow.com' },
    update: {},
    create: {
      name: 'Priya Mehta',
      email: 'depthead@assetflow.com',
      passwordHash: empPasswordHash,
      role: 'DEPARTMENT_HEAD',
    },
  });

  const emp1 = await prisma.user.upsert({
    where: { email: 'raj@assetflow.com' },
    update: {},
    create: {
      name: 'Raj Kumar',
      email: 'raj@assetflow.com',
      passwordHash: empPasswordHash,
      role: 'EMPLOYEE',
    },
  });

  const emp2 = await prisma.user.upsert({
    where: { email: 'carol@assetflow.com' },
    update: {},
    create: {
      name: 'Carol D\'Souza',
      email: 'carol@assetflow.com',
      passwordHash: empPasswordHash,
      role: 'EMPLOYEE',
    },
  });

  const technician = await prisma.user.upsert({
    where: { email: 'tech@assetflow.com' },
    update: {},
    create: {
      name: 'Vikram Tech',
      email: 'tech@assetflow.com',
      passwordHash: empPasswordHash,
      role: 'EMPLOYEE',
    },
  });
  console.log('✅ Users created');

  // ─────────────────────────────────────────────
  // 3. Departments
  // ─────────────────────────────────────────────
  const itDept = await prisma.department.upsert({
    where: { name: 'Information Technology' },
    update: {},
    create: {
      name: 'Information Technology',
      headId: deptHead.id,
      status: 'ACTIVE',
    },
  });

  const hrDept = await prisma.department.upsert({
    where: { name: 'Human Resources' },
    update: {},
    create: { name: 'Human Resources', status: 'ACTIVE' },
  });

  const opsDept = await prisma.department.upsert({
    where: { name: 'Operations' },
    update: {},
    create: { name: 'Operations', status: 'ACTIVE' },
  });

  // Assign users to departments
  await prisma.user.update({ where: { id: deptHead.id }, data: { departmentId: itDept.id } });
  await prisma.user.update({ where: { id: emp1.id }, data: { departmentId: itDept.id } });
  await prisma.user.update({ where: { id: emp2.id }, data: { departmentId: hrDept.id } });
  await prisma.user.update({ where: { id: assetManager.id }, data: { departmentId: itDept.id } });
  await prisma.user.update({ where: { id: technician.id }, data: { departmentId: opsDept.id } });
  console.log('✅ Departments created');

  // ─────────────────────────────────────────────
  // 4. Asset Tag Counter
  // ─────────────────────────────────────────────
  await prisma.assetTagCounter.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, current: 0 },
  });

  // ─────────────────────────────────────────────
  // 5. Assets
  // ─────────────────────────────────────────────
  const assetData = [
    { tag: 'AF-0001', name: 'Dell Laptop 15"', categoryId: electronics.id, serialNumber: 'SN-DELL-001', condition: 'GOOD' as const, location: 'IT Room - Shelf A', isBookable: false, departmentId: itDept.id, acquisitionCost: 65000 },
    { tag: 'AF-0002', name: 'HP Laptop Pro', categoryId: electronics.id, serialNumber: 'SN-HP-002', condition: 'EXCELLENT' as const, location: 'IT Room - Shelf A', isBookable: false, departmentId: itDept.id, acquisitionCost: 72000 },
    { tag: 'AF-0003', name: 'Conference Room B2', categoryId: rooms.id, serialNumber: null, condition: 'EXCELLENT' as const, location: 'Floor 2 - Block B', isBookable: true, acquisitionCost: null },
    { tag: 'AF-0004', name: 'Conference Room A1', categoryId: rooms.id, serialNumber: null, condition: 'GOOD' as const, location: 'Floor 1 - Block A', isBookable: true, acquisitionCost: null },
    { tag: 'AF-0005', name: 'Toyota Innova MH-01-AB-1234', categoryId: vehicles.id, serialNumber: 'VIN-TOY-1234', condition: 'GOOD' as const, location: 'Parking B2', isBookable: true, acquisitionCost: 1500000 },
    { tag: 'AF-0006', name: 'Office Chair Executive', categoryId: furniture.id, serialNumber: 'CH-EXEC-006', condition: 'GOOD' as const, location: 'IT Room', isBookable: false, departmentId: itDept.id, acquisitionCost: 8500 },
    { tag: 'AF-0007', name: 'Projector BenQ MH535', categoryId: electronics.id, serialNumber: 'SN-BENQ-007', condition: 'GOOD' as const, location: 'Conference Room B2', isBookable: true, acquisitionCost: 35000 },
    { tag: 'AF-0008', name: 'Server Dell PowerEdge', categoryId: equipment.id, serialNumber: 'SN-SVR-008', condition: 'EXCELLENT' as const, location: 'Server Room', isBookable: false, departmentId: itDept.id, acquisitionCost: 350000 },
  ];

  for (const asset of assetData) {
    await prisma.asset.upsert({
      where: { tag: asset.tag },
      update: {},
      create: {
        ...asset,
        serialNumber: asset.serialNumber || undefined,
        acquisitionCost: asset.acquisitionCost || undefined,
        departmentId: asset.departmentId || undefined,
        acquisitionDate: new Date('2024-01-15'),
      },
    });
  }

  // Update counter
  await prisma.assetTagCounter.update({ where: { id: 1 }, data: { current: 8 } });
  console.log('✅ Assets created');

  // ─────────────────────────────────────────────
  // 6. Sample Allocation
  // ─────────────────────────────────────────────
  const laptop1 = await prisma.asset.findUnique({ where: { tag: 'AF-0001' } });
  if (laptop1) {
    const existingAlloc = await prisma.allocation.findFirst({
      where: { assetId: laptop1.id, status: 'ACTIVE' },
    });
    if (!existingAlloc) {
      await prisma.allocation.create({
        data: {
          assetId: laptop1.id,
          userId: emp1.id,
          departmentId: itDept.id,
          status: 'ACTIVE',
          expectedReturn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.asset.update({
        where: { id: laptop1.id },
        data: { status: 'ALLOCATED' },
      });
    }
  }
  console.log('✅ Sample allocation created');

  console.log('\n🎉 Seed complete!\n');
  console.log('📋 Demo Credentials:');
  console.log('  Admin:         admin@assetflow.com    / Admin@123');
  console.log('  Asset Manager: manager@assetflow.com  / Employee@123');
  console.log('  Dept Head:     depthead@assetflow.com / Employee@123');
  console.log('  Employee (Raj):   raj@assetflow.com   / Employee@123');
  console.log('  Employee (Carol): carol@assetflow.com / Employee@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
