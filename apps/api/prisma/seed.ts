// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const daysAgo = (days: number) => new Date(Date.now() - days * DAY);
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY);
const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR);
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * HOUR);
const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * HOUR);

type AssetSeed = {
  key: string;
  tag: string;
  name: string;
  categoryKey: string;
  serialNumber: string | null;
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  status: 'AVAILABLE' | 'ALLOCATED' | 'RESERVED' | 'UNDER_MAINTENANCE' | 'LOST' | 'RETIRED' | 'DISPOSED';
  isBookable: boolean;
  location: string | null;
  departmentKey?: string;
  acquisitionCost?: number | null;
  notes?: string;
};

async function createKeyed<T extends { key: string }, R>(
  records: readonly T[],
  createFn: (record: T) => Promise<R>,
): Promise<Record<string, R>> {
  const pairs = await Promise.all(
    records.map(async (record) => [record.key, await createFn(record)] as const),
  );

  return Object.fromEntries(pairs) as Record<string, R>;
}

async function main() {
  console.log('🌱 Seeding fresh database with demo-ready data...');

  const adminPasswordHash = await bcrypt.hash('Admin@123', 12);
  const demoPasswordHash = await bcrypt.hash('Employee@123', 12);

  const categorySeeds = [
    {
      key: 'electronics',
      name: 'Electronics',
      description: 'Computers, phones, displays, networking, and productivity devices',
      extraFields: { warrantyPeriod: 'required', serialNumber: 'required', powerConsumption: 'optional' },
    },
    {
      key: 'furniture',
      name: 'Furniture',
      description: 'Workstations, seating, storage, and office fixtures',
      extraFields: { material: 'optional', ergonomicRating: 'optional' },
    },
    {
      key: 'vehicles',
      name: 'Vehicles',
      description: 'Company transport and field operations vehicles',
      extraFields: { registrationNumber: 'required', insuranceExpiry: 'required' },
    },
    {
      key: 'equipment',
      name: 'Equipment',
      description: 'Printers, scanners, UPS units, and shared utility equipment',
      extraFields: { maintenanceCycle: 'required', assetCondition: 'required' },
    },
    {
      key: 'rooms',
      name: 'Rooms & Spaces',
      description: 'Conference rooms, training rooms, lounges, and shared spaces',
      extraFields: { capacity: 'required', amenities: 'optional' },
    },
  ] as const;

  const categories = await createKeyed(categorySeeds, (seed) =>
    prisma.assetCategory.create({
      data: {
        name: seed.name,
        description: seed.description,
        extraFields: seed.extraFields,
      },
    }),
  );
  console.log('✅ Categories created');

  const userSeeds = [
    { key: 'admin', name: 'System Admin', email: 'admin@assetflow.com', role: 'ADMIN' },
    { key: 'assetManagerOne', name: 'Arjun Sharma', email: 'manager@assetflow.com', role: 'ASSET_MANAGER' },
    { key: 'assetManagerTwo', name: 'Maya Patel', email: 'opsmanager@assetflow.com', role: 'ASSET_MANAGER' },
    { key: 'itHead', name: 'Priya Mehta', email: 'ithead@assetflow.com', role: 'DEPARTMENT_HEAD' },
    { key: 'financeHead', name: 'Rohan Kapoor', email: 'financehead@assetflow.com', role: 'DEPARTMENT_HEAD' },
    { key: 'hrHead', name: 'Fatima Khan', email: 'hrhead@assetflow.com', role: 'DEPARTMENT_HEAD' },
    { key: 'opsHead', name: 'Sahil Verma', email: 'opshead@assetflow.com', role: 'DEPARTMENT_HEAD' },
    { key: 'salesHead', name: 'Neha Joshi', email: 'saleshead@assetflow.com', role: 'DEPARTMENT_HEAD' },
    { key: 'raj', name: 'Raj Kumar', email: 'raj@assetflow.com', role: 'EMPLOYEE' },
    { key: 'carol', name: 'Carol D\'Souza', email: 'carol@assetflow.com', role: 'EMPLOYEE' },
    { key: 'imran', name: 'Imran Sheikh', email: 'imran@assetflow.com', role: 'EMPLOYEE' },
    { key: 'nisha', name: 'Nisha Rao', email: 'nisha@assetflow.com', role: 'EMPLOYEE' },
    { key: 'ashok', name: 'Ashok Bhat', email: 'ashok@assetflow.com', role: 'EMPLOYEE' },
    { key: 'leela', name: 'Leela Menon', email: 'leela@assetflow.com', role: 'EMPLOYEE' },
    { key: 'vikram', name: 'Vikram Tech', email: 'vikram@assetflow.com', role: 'EMPLOYEE' },
    { key: 'sana', name: 'Sana Ahmed', email: 'sana@assetflow.com', role: 'EMPLOYEE' },
    { key: 'pratik', name: 'Pratik Joshi', email: 'pratik@assetflow.com', role: 'EMPLOYEE' },
    { key: 'ravi', name: 'Ravi Nair', email: 'ravi@assetflow.com', role: 'EMPLOYEE' },
  ] as const;

  const users = await createKeyed(userSeeds, (seed) =>
    prisma.user.create({
      data: {
        name: seed.name,
        email: seed.email,
        passwordHash: seed.role === 'ADMIN' ? adminPasswordHash : demoPasswordHash,
        role: seed.role,
      },
    }),
  );
  console.log('✅ Users created');

  const corporate = await prisma.department.create({
    data: {
      name: 'Corporate Services',
      status: 'ACTIVE',
    },
  });

  const departmentSeeds = [
    { key: 'it', name: 'Information Technology', headKey: 'itHead' },
    { key: 'finance', name: 'Finance', headKey: 'financeHead' },
    { key: 'hr', name: 'Human Resources', headKey: 'hrHead' },
    { key: 'operations', name: 'Operations', headKey: 'opsHead' },
    { key: 'sales', name: 'Sales & Support', headKey: 'salesHead' },
  ] as const;

  const departments: Record<string, Awaited<ReturnType<typeof prisma.department.create>>> = {
    corporate,
  };

  for (const seed of departmentSeeds) {
    departments[seed.key] = await prisma.department.create({
      data: {
        name: seed.name,
        status: 'ACTIVE',
        parentId: corporate.id,
        headId: users[seed.headKey].id,
      },
    });
  }

  const departmentAssignments: Array<[string, string]> = [
    ['assetManagerOne', 'it'],
    ['assetManagerTwo', 'corporate'],
    ['itHead', 'it'],
    ['financeHead', 'finance'],
    ['hrHead', 'hr'],
    ['opsHead', 'operations'],
    ['salesHead', 'sales'],
    ['raj', 'it'],
    ['carol', 'it'],
    ['imran', 'operations'],
    ['nisha', 'sales'],
    ['ashok', 'finance'],
    ['leela', 'hr'],
    ['vikram', 'operations'],
    ['sana', 'finance'],
    ['pratik', 'it'],
    ['ravi', 'operations'],
  ];

  await Promise.all(
    departmentAssignments.map(([userKey, departmentKey]) =>
      prisma.user.update({
        where: { id: users[userKey].id },
        data: { departmentId: departments[departmentKey].id },
      }),
    ),
  );
  console.log('✅ Departments created');

  await prisma.assetTagCounter.create({
    data: { id: 1, current: 0 },
  });

  const assetSeeds: AssetSeed[] = [
    {
      key: 'laptop1',
      tag: 'AF-0001',
      name: 'Dell Latitude 5540',
      categoryKey: 'electronics',
      serialNumber: 'SN-DELL-LAT-5540-001',
      condition: 'GOOD',
      status: 'ALLOCATED',
      isBookable: false,
      location: 'IT Floor - Bay 1',
      departmentKey: 'it',
      acquisitionCost: 78000,
      notes: 'Primary developer laptop for demo workflows',
    },
    {
      key: 'laptop2',
      tag: 'AF-0002',
      name: 'MacBook Pro 14',
      categoryKey: 'electronics',
      serialNumber: 'SN-MBP-14-002',
      condition: 'EXCELLENT',
      status: 'AVAILABLE',
      isBookable: false,
      location: 'IT Floor - Bay 2',
      departmentKey: 'it',
      acquisitionCost: 165000,
    },
    {
      key: 'monitor1',
      tag: 'AF-0003',
      name: 'HP EliteDisplay 27',
      categoryKey: 'electronics',
      serialNumber: 'SN-HP-ELITE-003',
      condition: 'GOOD',
      status: 'AVAILABLE',
      isBookable: false,
      location: 'IT Floor - Shelf A',
      departmentKey: 'it',
      acquisitionCost: 24000,
    },
    {
      key: 'voipPhone',
      tag: 'AF-0004',
      name: 'Poly Studio VoIP Phone',
      categoryKey: 'electronics',
      serialNumber: 'SN-POLY-VOIP-004',
      condition: 'EXCELLENT',
      status: 'ALLOCATED',
      isBookable: false,
      location: 'Sales Pod A',
      departmentKey: 'sales',
      acquisitionCost: 18000,
    },
    {
      key: 'projector',
      tag: 'AF-0005',
      name: 'Epson Projector EB-X51',
      categoryKey: 'electronics',
      serialNumber: 'SN-EPSON-005',
      condition: 'FAIR',
      status: 'AVAILABLE',
      isBookable: true,
      location: 'Conference Hall A',
      acquisitionCost: 42000,
    },
    {
      key: 'networkSwitch',
      tag: 'AF-0006',
      name: 'Cisco 48-Port Switch',
      categoryKey: 'equipment',
      serialNumber: 'SN-CISCO-006',
      condition: 'GOOD',
      status: 'AVAILABLE',
      isBookable: false,
      location: 'Server Rack 2',
      departmentKey: 'it',
      acquisitionCost: 95000,
    },
    {
      key: 'thinkpad',
      tag: 'AF-0007',
      name: 'Lenovo ThinkPad X13',
      categoryKey: 'electronics',
      serialNumber: 'SN-LENOVO-007',
      condition: 'GOOD',
      status: 'ALLOCATED',
      isBookable: false,
      location: 'Finance Office - Shelf 1',
      departmentKey: 'finance',
      acquisitionCost: 76000,
    },
    {
      key: 'iphone',
      tag: 'AF-0008',
      name: 'iPhone 15 Pro',
      categoryKey: 'electronics',
      serialNumber: 'SN-IPHONE-008',
      condition: 'EXCELLENT',
      status: 'ALLOCATED',
      isBookable: false,
      location: 'Sales Pod B',
      departmentKey: 'sales',
      acquisitionCost: 120000,
    },
    {
      key: 'chair',
      tag: 'AF-0009',
      name: 'Ergonomic Office Chair',
      categoryKey: 'furniture',
      serialNumber: 'SN-CHAIR-009',
      condition: 'GOOD',
      status: 'AVAILABLE',
      isBookable: false,
      location: 'Finance Floor',
      departmentKey: 'finance',
      acquisitionCost: 10500,
    },
    {
      key: 'standingDesk',
      tag: 'AF-0010',
      name: 'Adjustable Standing Desk',
      categoryKey: 'furniture',
      serialNumber: 'SN-DESK-010',
      condition: 'EXCELLENT',
      status: 'AVAILABLE',
      isBookable: false,
      location: 'IT Floor - Open Work Area',
      departmentKey: 'it',
      acquisitionCost: 28000,
    },
    {
      key: 'filingCabinet',
      tag: 'AF-0011',
      name: '4-Drawer Filing Cabinet',
      categoryKey: 'furniture',
      serialNumber: 'SN-CAB-011',
      condition: 'GOOD',
      status: 'AVAILABLE',
      isBookable: false,
      location: 'HR Records Room',
      departmentKey: 'hr',
      acquisitionCost: 12500,
    },
    {
      key: 'sofaSet',
      tag: 'AF-0012',
      name: 'Reception Sofa Set',
      categoryKey: 'furniture',
      serialNumber: 'SN-SOFA-012',
      condition: 'FAIR',
      status: 'AVAILABLE',
      isBookable: false,
      location: 'Lobby',
      acquisitionCost: 35000,
    },
    {
      key: 'innova',
      tag: 'AF-0013',
      name: 'Toyota Innova Crysta',
      categoryKey: 'vehicles',
      serialNumber: 'VIN-TOY-0013',
      condition: 'GOOD',
      status: 'AVAILABLE',
      isBookable: true,
      location: 'Parking Bay 1',
      acquisitionCost: 1550000,
      notes: 'Demo fleet vehicle',
    },
    {
      key: 'creta',
      tag: 'AF-0014',
      name: 'Hyundai Creta',
      categoryKey: 'vehicles',
      serialNumber: 'VIN-HYU-0014',
      condition: 'GOOD',
      status: 'ALLOCATED',
      isBookable: true,
      location: 'Parking Bay 2',
      departmentKey: 'sales',
      acquisitionCost: 1280000,
    },
    {
      key: 'bolero',
      tag: 'AF-0015',
      name: 'Mahindra Bolero Pickup',
      categoryKey: 'vehicles',
      serialNumber: 'VIN-MAH-0015',
      condition: 'FAIR',
      status: 'AVAILABLE',
      isBookable: true,
      location: 'Parking Bay 3',
      departmentKey: 'operations',
      acquisitionCost: 980000,
    },
    {
      key: 'ups',
      tag: 'AF-0016',
      name: 'APC Smart-UPS 2KVA',
      categoryKey: 'equipment',
      serialNumber: 'SN-UPS-0016',
      condition: 'EXCELLENT',
      status: 'ALLOCATED',
      isBookable: false,
      location: 'Server Room',
      departmentKey: 'it',
      acquisitionCost: 65000,
    },
    {
      key: 'scanner',
      tag: 'AF-0017',
      name: 'Zebra Barcode Scanner',
      categoryKey: 'equipment',
      serialNumber: 'SN-ZEBRA-0017',
      condition: 'GOOD',
      status: 'AVAILABLE',
      isBookable: false,
      location: 'Store Room',
      departmentKey: 'operations',
      acquisitionCost: 22000,
    },
    {
      key: 'printer',
      tag: 'AF-0018',
      name: 'Canon Multifunction Printer',
      categoryKey: 'equipment',
      serialNumber: 'SN-CANON-0018',
      condition: 'FAIR',
      status: 'AVAILABLE',
      isBookable: false,
      location: 'Finance Copy Room',
      departmentKey: 'finance',
      acquisitionCost: 48000,
    },
    {
      key: 'accessPoint',
      tag: 'AF-0019',
      name: 'Ubiquiti WiFi Access Point',
      categoryKey: 'equipment',
      serialNumber: 'SN-UBNT-0019',
      condition: 'GOOD',
      status: 'AVAILABLE',
      isBookable: false,
      location: 'IT Ceiling Grid',
      departmentKey: 'it',
      acquisitionCost: 14500,
    },
    {
      key: 'attendance',
      tag: 'AF-0020',
      name: 'Biometric Attendance Device',
      categoryKey: 'equipment',
      serialNumber: 'SN-BIO-0020',
      condition: 'GOOD',
      status: 'ALLOCATED',
      isBookable: false,
      location: 'HR Entrance',
      departmentKey: 'hr',
      acquisitionCost: 26000,
    },
    {
      key: 'boardRoom',
      tag: 'AF-0021',
      name: 'Board Room Alpha',
      categoryKey: 'rooms',
      serialNumber: null,
      condition: 'EXCELLENT',
      status: 'AVAILABLE',
      isBookable: true,
      location: 'HQ - Level 4',
      acquisitionCost: null,
    },
    {
      key: 'trainingRoom',
      tag: 'AF-0022',
      name: 'Training Room Beta',
      categoryKey: 'rooms',
      serialNumber: null,
      condition: 'GOOD',
      status: 'AVAILABLE',
      isBookable: true,
      location: 'HQ - Level 3',
      acquisitionCost: null,
    },
    {
      key: 'huddlePod',
      tag: 'AF-0023',
      name: 'Huddle Pod Gamma',
      categoryKey: 'rooms',
      serialNumber: null,
      condition: 'GOOD',
      status: 'RESERVED',
      isBookable: true,
      location: 'HQ - Level 2',
      acquisitionCost: null,
    },
    {
      key: 'visitorLounge',
      tag: 'AF-0024',
      name: 'Visitor Lounge Delta',
      categoryKey: 'rooms',
      serialNumber: null,
      condition: 'EXCELLENT',
      status: 'AVAILABLE',
      isBookable: true,
      location: 'HQ - Lobby',
      acquisitionCost: null,
    },
  ];

  const assets = await createKeyed(assetSeeds, (seed) =>
    prisma.asset.create({
      data: {
        tag: seed.tag,
        name: seed.name,
        categoryId: categories[seed.categoryKey].id,
        serialNumber: seed.serialNumber ?? undefined,
        condition: seed.condition,
        status: seed.status,
        isBookable: seed.isBookable,
        location: seed.location ?? undefined,
        departmentId: seed.departmentKey ? departments[seed.departmentKey].id : undefined,
        acquisitionCost: seed.acquisitionCost ?? undefined,
        acquisitionDate: daysAgo(540),
        notes: seed.notes,
      },
    }),
  );

  await prisma.assetTagCounter.update({ where: { id: 1 }, data: { current: 24 } });
  console.log('✅ Assets created');

  const allocationSeeds = [
    {
      key: 'allocLaptop1',
      assetKey: 'laptop1',
      userKey: 'raj',
      departmentKey: 'it',
      status: 'ACTIVE',
      expectedReturn: daysFromNow(12),
    },
    {
      key: 'allocLaptop2',
      assetKey: 'laptop2',
      userKey: 'carol',
      departmentKey: 'it',
      status: 'RETURNED',
      expectedReturn: daysAgo(30),
      returnedAt: daysAgo(18),
    },
    {
      key: 'allocThinkpad',
      assetKey: 'thinkpad',
      userKey: 'ashok',
      departmentKey: 'finance',
      status: 'OVERDUE',
      expectedReturn: daysAgo(4),
    },
    {
      key: 'allocPhone',
      assetKey: 'iphone',
      userKey: 'nisha',
      departmentKey: 'sales',
      status: 'ACTIVE',
      expectedReturn: daysFromNow(8),
    },
    {
      key: 'allocDesk',
      assetKey: 'standingDesk',
      userKey: 'pratik',
      departmentKey: 'it',
      status: 'RETURNED',
      expectedReturn: daysAgo(50),
      returnedAt: daysAgo(42),
    },
    {
      key: 'allocInnova',
      assetKey: 'innova',
      departmentKey: 'corporate',
      status: 'ACTIVE',
      expectedReturn: daysFromNow(20),
    },
    {
      key: 'allocCreta',
      assetKey: 'creta',
      userKey: 'sana',
      departmentKey: 'sales',
      status: 'ACTIVE',
      expectedReturn: daysFromNow(7),
    },
    {
      key: 'allocUps',
      assetKey: 'ups',
      departmentKey: 'it',
      status: 'ACTIVE',
      expectedReturn: daysFromNow(14),
    },
    {
      key: 'allocAttendance',
      assetKey: 'attendance',
      departmentKey: 'hr',
      status: 'RETURNED',
      expectedReturn: daysAgo(60),
      returnedAt: daysAgo(15),
    },
  ] as const;

  const allocations = await createKeyed(allocationSeeds, (seed) =>
    prisma.allocation.create({
      data: {
        assetId: assets[seed.assetKey].id,
        userId: seed.userKey ? users[seed.userKey].id : undefined,
        departmentId: departments[seed.departmentKey].id,
        status: seed.status,
        expectedReturn: seed.expectedReturn,
        returnedAt: seed.returnedAt,
      },
    }),
  );
  console.log('✅ Allocations created');

  const transferSeeds = [
    {
      key: 'transferLaptop',
      allocationKey: 'allocLaptop1',
      requestedByKey: 'raj',
      targetUserKey: 'carol',
      status: 'REQUESTED',
      notes: 'Swap for field support coverage',
    },
    {
      key: 'transferThinkpad',
      allocationKey: 'allocThinkpad',
      requestedByKey: 'ashok',
      targetDeptKey: 'finance',
      status: 'APPROVED',
      approvedByKey: 'assetManagerOne',
      notes: 'Approved for finance reporting staff',
      resolvedAt: daysAgo(2),
    },
    {
      key: 'transferPhone',
      allocationKey: 'allocPhone',
      requestedByKey: 'nisha',
      targetDeptKey: 'sales',
      status: 'REJECTED',
      approvedByKey: 'salesHead',
      notes: 'Rejected because the existing device is still under contract',
      resolvedAt: daysAgo(5),
    },
    {
      key: 'transferDesk',
      allocationKey: 'allocDesk',
      requestedByKey: 'pratik',
      targetUserKey: 'vikram',
      status: 'COMPLETED',
      approvedByKey: 'assetManagerTwo',
      notes: 'Completed after ergonomics review',
      resolvedAt: daysAgo(10),
    },
    {
      key: 'transferInnova',
      allocationKey: 'allocInnova',
      requestedByKey: 'assetManagerOne',
      targetDeptKey: 'operations',
      status: 'REQUESTED',
      notes: 'Operations requested for client visits',
    },
  ] as const;

  const transfers = await createKeyed(transferSeeds, (seed) =>
    prisma.transfer.create({
      data: {
        allocationId: allocations[seed.allocationKey].id,
        requestedById: users[seed.requestedByKey].id,
        targetUserId: seed.targetUserKey ? users[seed.targetUserKey].id : undefined,
        targetDeptId: seed.targetDeptKey ? departments[seed.targetDeptKey].id : undefined,
        approvedById: seed.approvedByKey ? users[seed.approvedByKey].id : undefined,
        status: seed.status,
        notes: seed.notes,
        resolvedAt: seed.resolvedAt,
      },
    }),
  );
  console.log('✅ Transfers created');

  const bookingSeeds = [
    {
      key: 'boardRoomPlanning',
      assetKey: 'boardRoom',
      userKey: 'itHead',
      startTime: daysFromNow(1),
      endTime: daysFromNow(1.25),
      status: 'UPCOMING',
      purpose: 'Quarterly planning review',
      notes: 'Finance and IT leadership sync',
    },
    {
      key: 'trainingRoomWorkshop',
      assetKey: 'trainingRoom',
      userKey: 'hrHead',
      startTime: hoursAgo(2),
      endTime: hoursFromNow(1),
      status: 'ONGOING',
      purpose: 'New joiner onboarding',
      notes: 'Includes projector and whiteboard',
    },
    {
      key: 'visitorLoungeReview',
      assetKey: 'visitorLounge',
      userKey: 'salesHead',
      startTime: daysAgo(2),
      endTime: addHours(daysAgo(2), 2),
      status: 'COMPLETED',
      purpose: 'Client demo waiting area',
      notes: 'Used during investor walkthrough',
    },
    {
      key: 'huddlePodDesign',
      assetKey: 'huddlePod',
      userKey: 'assetManagerTwo',
      startTime: daysFromNow(3),
      endTime: daysFromNow(3.5),
      status: 'CANCELLED',
      purpose: 'Ops sprint discussion',
      notes: 'Cancelled because the team moved online',
    },
    {
      key: 'projectorLaunch',
      assetKey: 'projector',
      userKey: 'assetManagerOne',
      startTime: daysFromNow(5),
      endTime: addHours(daysFromNow(5), 1.5),
      status: 'UPCOMING',
      purpose: 'Demo video shoot',
      notes: 'Reserved with AV team',
    },
    {
      key: 'boardRoomTownhall',
      assetKey: 'boardRoom',
      userKey: 'admin',
      startTime: daysAgo(7),
      endTime: addHours(daysAgo(7), 2),
      status: 'COMPLETED',
      purpose: 'Monthly townhall',
      notes: 'All-hands leadership briefing',
    },
    {
      key: 'roomAlphaBudget',
      assetKey: 'boardRoom',
      userKey: 'financeHead',
      startTime: daysFromNow(8),
      endTime: new Date(daysFromNow(8).getTime() + 90 * 60 * 1000),
      status: 'UPCOMING',
      purpose: 'Budget review meeting',
      notes: 'Needs screen sharing',
    },
    {
      key: 'trainingBetaHiring',
      assetKey: 'trainingRoom',
      userKey: 'hrHead',
      startTime: daysFromNow(2),
      endTime: addHours(daysFromNow(2), 3),
      status: 'UPCOMING',
      purpose: 'Hiring panel interviews',
      notes: 'Interview loop for support roles',
    },
  ] as const;

  await createKeyed(bookingSeeds, (seed) =>
    prisma.booking.create({
      data: {
        assetId: assets[seed.assetKey].id,
        userId: users[seed.userKey].id,
        startTime: seed.startTime,
        endTime: seed.endTime,
        status: seed.status,
        purpose: seed.purpose,
        notes: seed.notes,
      },
    }),
  );
  console.log('✅ Bookings created');

  const maintenanceSeeds = [
    {
      key: 'm1',
      assetKey: 'laptop1',
      raisedByKey: 'raj',
      status: 'PENDING',
      priority: 'HIGH',
      issue: 'Battery drains too quickly during field visits',
    },
    {
      key: 'm2',
      assetKey: 'projector',
      raisedByKey: 'assetManagerOne',
      approvedByKey: 'admin',
      technicianKey: 'vikram',
      status: 'APPROVED',
      priority: 'MEDIUM',
      issue: 'Projector lamp needs replacement',
    },
    {
      key: 'm3',
      assetKey: 'printer',
      raisedByKey: 'sana',
      approvedByKey: 'assetManagerTwo',
      status: 'REJECTED',
      priority: 'LOW',
      issue: 'Toner quality inconsistent',
    },
    {
      key: 'm4',
      assetKey: 'ups',
      raisedByKey: 'itHead',
      approvedByKey: 'admin',
      technicianKey: 'ravi',
      status: 'TECHNICIAN_ASSIGNED',
      priority: 'CRITICAL',
      issue: 'UPS fan noise and voltage fluctuation',
    },
    {
      key: 'm5',
      assetKey: 'creta',
      raisedByKey: 'nisha',
      approvedByKey: 'salesHead',
      technicianKey: 'ravi',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      issue: 'Service reminder and tire pressure warning',
    },
    {
      key: 'm6',
      assetKey: 'attendance',
      raisedByKey: 'hrHead',
      approvedByKey: 'admin',
      technicianKey: 'vikram',
      status: 'RESOLVED',
      priority: 'MEDIUM',
      issue: 'Fingerprint reader misreads quickly after power up',
      resolution: 'Cleaned sensor and updated firmware',
      resolvedAt: daysAgo(3),
    },
    {
      key: 'm7',
      assetKey: 'accessPoint',
      raisedByKey: 'pratik',
      approvedByKey: 'itHead',
      technicianKey: 'vikram',
      status: 'RESOLVED',
      priority: 'HIGH',
      issue: 'Intermittent Wi-Fi drops in the IT wing',
      resolution: 'Repositioned access point and upgraded channel plan',
      resolvedAt: daysAgo(5),
    },
    {
      key: 'm8',
      assetKey: 'thinkpad',
      raisedByKey: 'ashok',
      approvedByKey: 'financeHead',
      technicianKey: 'ravi',
      status: 'PENDING',
      priority: 'LOW',
      issue: 'Keyboard backlight not working consistently',
    },
  ] as const;

  await createKeyed(maintenanceSeeds, (seed) =>
    prisma.maintenanceReq.create({
      data: {
        assetId: assets[seed.assetKey].id,
        raisedById: users[seed.raisedByKey].id,
        approvedById: seed.approvedByKey ? users[seed.approvedByKey].id : undefined,
        technicianId: seed.technicianKey ? users[seed.technicianKey].id : undefined,
        status: seed.status,
        priority: seed.priority,
        issue: seed.issue,
        resolution: seed.resolution,
        resolvedAt: seed.resolvedAt,
      },
    }),
  );
  console.log('✅ Maintenance requests created');

  const auditCycleSeeds = [
    {
      key: 'itAudit',
      title: 'Q2 IT Hardware Verification',
      scope: 'DEPARTMENT',
      scopeValue: departments.it.name,
      departmentKey: 'it',
      createdByKey: 'admin',
      status: 'CLOSED',
      startDate: daysAgo(28),
      endDate: daysAgo(24),
      closedAt: daysAgo(23),
    },
    {
      key: 'opsAudit',
      title: 'Operations and Fleet Audit',
      scope: 'DEPARTMENT',
      scopeValue: departments.operations.name,
      departmentKey: 'operations',
      createdByKey: 'assetManagerTwo',
      status: 'CLOSED',
      startDate: daysAgo(20),
      endDate: daysAgo(15),
      closedAt: daysAgo(14),
    },
    {
      key: 'campusAudit',
      title: 'Corporate Spaces Walkthrough',
      scope: 'LOCATION',
      scopeValue: 'HQ - Main Campus',
      departmentKey: 'corporate',
      createdByKey: 'assetManagerOne',
      status: 'OPEN',
      startDate: daysAgo(2),
      endDate: daysFromNow(5),
    },
  ] as const;

  const auditCycles = await createKeyed(auditCycleSeeds, (seed) =>
    prisma.auditCycle.create({
      data: {
        title: seed.title,
        scope: seed.scope,
        scopeValue: seed.scopeValue,
        departmentId: departments[seed.departmentKey].id,
        createdById: users[seed.createdByKey].id,
        status: seed.status,
        startDate: seed.startDate,
        endDate: seed.endDate,
        closedAt: seed.closedAt,
      },
    }),
  );

  const auditItemSeeds = [
    { cycleKey: 'itAudit', assetKey: 'laptop1', auditorKey: 'itHead', result: 'VERIFIED', notes: 'Tagged and accounted for', verifiedAt: daysAgo(26) },
    { cycleKey: 'itAudit', assetKey: 'laptop2', auditorKey: 'itHead', result: 'VERIFIED', notes: 'Available in shelf inventory', verifiedAt: daysAgo(26) },
    { cycleKey: 'itAudit', assetKey: 'networkSwitch', auditorKey: 'assetManagerOne', result: 'VERIFIED', notes: 'Rack photo matches', verifiedAt: daysAgo(25) },
    { cycleKey: 'itAudit', assetKey: 'ups', auditorKey: 'assetManagerOne', result: 'DAMAGED', notes: 'Battery backup degraded', verifiedAt: daysAgo(25) },
    { cycleKey: 'itAudit', assetKey: 'accessPoint', auditorKey: 'itHead', result: 'MISSING', notes: 'Access point could not be located', verifiedAt: daysAgo(24) },
    { cycleKey: 'itAudit', assetKey: 'standingDesk', auditorKey: 'itHead', result: 'VERIFIED', notes: 'Desk in use by engineering pod', verifiedAt: daysAgo(24) },
    { cycleKey: 'opsAudit', assetKey: 'creta', auditorKey: 'opsHead', result: 'VERIFIED', notes: 'Mileage recorded and clean', verifiedAt: daysAgo(18) },
    { cycleKey: 'opsAudit', assetKey: 'bolero', auditorKey: 'opsHead', result: 'VERIFIED', notes: 'Vehicle keys tracked', verifiedAt: daysAgo(18) },
    { cycleKey: 'opsAudit', assetKey: 'scanner', auditorKey: 'assetManagerTwo', result: 'DAMAGED', notes: 'Trigger button sticky', verifiedAt: daysAgo(17) },
    { cycleKey: 'opsAudit', assetKey: 'printer', auditorKey: 'assetManagerTwo', result: 'VERIFIED', notes: 'Toner and output consistent', verifiedAt: daysAgo(17) },
    { cycleKey: 'opsAudit', assetKey: 'attendance', auditorKey: 'hrHead', result: 'VERIFIED', notes: 'HR entry point functioning', verifiedAt: daysAgo(16) },
    { cycleKey: 'campusAudit', assetKey: 'boardRoom', auditorKey: 'financeHead', result: 'PENDING', notes: 'Pending final walkthrough' },
    { cycleKey: 'campusAudit', assetKey: 'trainingRoom', auditorKey: 'hrHead', result: 'PENDING', notes: 'Needs AV confirmation' },
    { cycleKey: 'campusAudit', assetKey: 'huddlePod', auditorKey: 'salesHead', result: 'VERIFIED', notes: 'Reserved as expected', verifiedAt: hoursAgo(6) },
    { cycleKey: 'campusAudit', assetKey: 'visitorLounge', auditorKey: 'assetManagerOne', result: 'VERIFIED', notes: 'Clean and ready for visitors', verifiedAt: hoursAgo(5) },
  ] as const;

  await createKeyed(auditItemSeeds, (seed) =>
    prisma.auditItem.create({
      data: {
        cycleId: auditCycles[seed.cycleKey].id,
        assetId: assets[seed.assetKey].id,
        auditorId: users[seed.auditorKey].id,
        result: seed.result,
        notes: seed.notes,
        verifiedAt: seed.verifiedAt,
      },
    }),
  );
  console.log('✅ Audit cycles created');

  const notificationSeeds = [
    {
      userKey: 'raj',
      type: 'ASSET_ALLOCATED',
      title: 'Laptop assigned to you',
      message: 'Dell Latitude 5540 has been allocated to Raj Kumar for field support.',
      meta: { assetId: assets.laptop1.id, allocationId: allocations.allocLaptop1.id },
      createdAt: daysAgo(11),
    },
    {
      userKey: 'carol',
      type: 'TRANSFER_REQUESTED',
      title: 'Transfer request opened',
      message: 'A transfer request was created for the laptop you requested.',
      meta: { transferId: transfers.transferLaptop.id },
      createdAt: daysAgo(9),
    },
    {
      userKey: 'ashok',
      type: 'MAINTENANCE_RAISED',
      title: 'Maintenance raised',
      message: 'Maintenance request is pending review for your finance laptop.',
      meta: { maintenanceSeed: 'm8' },
      createdAt: daysAgo(8),
    },
    {
      userKey: 'nisha',
      type: 'BOOKING_CONFIRMED',
      title: 'Room booking confirmed',
      message: 'Your booking for the board room has been scheduled successfully.',
      meta: { booking: 'boardRoomPlanning' },
      createdAt: daysAgo(6),
    },
    {
      userKey: 'itHead',
      type: 'AUDIT_DISCREPANCY',
      title: 'Audit discrepancy detected',
      message: 'A damaged UPS and missing access point were logged during IT audit.',
      meta: { cycleId: auditCycles.itAudit.id },
      createdAt: daysAgo(25),
    },
    {
      userKey: 'opsHead',
      type: 'MAINTENANCE_RESOLVED',
      title: 'Vehicle maintenance resolved',
      message: 'The fleet vehicle service request was marked resolved.',
      meta: { assetId: assets.creta.id },
      createdAt: daysAgo(4),
    },
    {
      userKey: 'sana',
      type: 'ROLE_PROMOTED',
      title: 'Profile updated',
      message: 'Your access profile was reviewed for finance reporting.',
      meta: { role: 'EMPLOYEE' },
      createdAt: daysAgo(3),
    },
    {
      userKey: 'hrHead',
      type: 'BOOKING_REMINDER',
      title: 'Training room reminder',
      message: 'Upcoming hiring panel interview is scheduled in the training room.',
      meta: { booking: 'trainingBetaHiring' },
      createdAt: daysAgo(1),
    },
    {
      userKey: 'financeHead',
      type: 'TRANSFER_APPROVED',
      title: 'Transfer approved',
      message: 'The ThinkPad transfer has been approved for finance reporting work.',
      meta: { transferId: transfers.transferThinkpad.id },
      createdAt: daysAgo(2),
    },
    {
      userKey: 'admin',
      type: 'ASSET_OVERDUE',
      title: 'Overdue allocation alert',
      message: 'The finance ThinkPad is overdue and needs follow-up.',
      meta: { allocationId: allocations.allocThinkpad.id },
      createdAt: daysAgo(4),
    },
    {
      userKey: 'assetManagerOne',
      type: 'MAINTENANCE_APPROVED',
      title: 'Maintenance approved',
      message: 'The projector lamp replacement was approved.',
      meta: { assetId: assets.projector.id },
      createdAt: daysAgo(7),
    },
    {
      userKey: 'assetManagerTwo',
      type: 'ASSET_RETURNED',
      title: 'Asset returned',
      message: 'The standing desk allocation was closed and returned.',
      meta: { allocationId: allocations.allocDesk.id },
      createdAt: daysAgo(12),
    },
    {
      userKey: 'salesHead',
      type: 'TRANSFER_REJECTED',
      title: 'Transfer rejected',
      message: 'The phone transfer was rejected due to contract restrictions.',
      meta: { transferId: transfers.transferPhone.id },
      createdAt: daysAgo(5),
    },
    {
      userKey: 'pratik',
      type: 'ASSET_ALLOCATED',
      title: 'Desk allocation renewed',
      message: 'Your standing desk allocation was renewed for the demo floor.',
      meta: { assetId: assets.standingDesk.id },
      createdAt: daysAgo(13),
    },
  ] as const;

  await Promise.all(
    notificationSeeds.map((seed) =>
      prisma.notification.create({
        data: {
          userId: users[seed.userKey].id,
          type: seed.type,
          title: seed.title,
          message: seed.message,
          meta: seed.meta,
          isRead: seed.userKey === 'admin' || seed.userKey === 'assetManagerTwo',
          createdAt: seed.createdAt,
        },
      }),
    ),
  );
  console.log('✅ Notifications created');

  const activitySeeds = [
    {
      actorKey: 'assetManagerOne',
      action: 'ASSET_ALLOCATED',
      entityType: 'Allocation',
      entityKey: 'allocLaptop1',
      meta: { assetId: assets.laptop1.id, userId: users.raj.id },
      createdAt: daysAgo(11),
    },
    {
      actorKey: 'raj',
      action: 'TRANSFER_REQUESTED',
      entityType: 'Transfer',
      entityKey: 'transferLaptop',
      meta: { allocationId: allocations.allocLaptop1.id },
      createdAt: daysAgo(9),
    },
    {
      actorKey: 'assetManagerOne',
      action: 'TRANSFER_APPROVED',
      entityType: 'Transfer',
      entityKey: 'transferThinkpad',
      meta: { allocationId: allocations.allocThinkpad.id },
      createdAt: daysAgo(2),
    },
    {
      actorKey: 'assetManagerTwo',
      action: 'MAINTENANCE_RAISED',
      entityType: 'MaintenanceReq',
      entityKey: 'm4',
      meta: { assetId: assets.ups.id },
      createdAt: daysAgo(7),
    },
    {
      actorKey: 'admin',
      action: 'MAINTENANCE_APPROVED',
      entityType: 'MaintenanceReq',
      entityKey: 'm2',
      meta: { assetId: assets.projector.id },
      createdAt: daysAgo(7),
    },
    {
      actorKey: 'itHead',
      action: 'AUDIT_DISCREPANCY',
      entityType: 'AuditItem',
      entityKey: 'itAudit',
      meta: { cycleId: auditCycles.itAudit.id, assetId: assets.ups.id },
      createdAt: daysAgo(25),
    },
    {
      actorKey: 'opsHead',
      action: 'AUDIT_DISCREPANCY',
      entityType: 'AuditItem',
      entityKey: 'opsAudit',
      meta: { cycleId: auditCycles.opsAudit.id, assetId: assets.scanner.id },
      createdAt: daysAgo(17),
    },
    {
      actorKey: 'salesHead',
      action: 'ROLE_PROMOTED',
      entityType: 'User',
      entityKey: 'nisha',
      meta: { promotedTo: 'DEPARTMENT_HEAD' },
      createdAt: daysAgo(3),
    },
    {
      actorKey: 'hrHead',
      action: 'BOOKING_CONFIRMED',
      entityType: 'Booking',
      entityKey: 'trainingBetaHiring',
      meta: { assetId: assets.trainingRoom.id },
      createdAt: daysAgo(1),
    },
    {
      actorKey: 'admin',
      action: 'BOOKING_CANCELLED',
      entityType: 'Booking',
      entityKey: 'huddlePodDesign',
      meta: { assetId: assets.huddlePod.id },
      createdAt: daysAgo(2),
    },
    {
      actorKey: 'assetManagerTwo',
      action: 'ASSET_RETURNED',
      entityType: 'Allocation',
      entityKey: 'allocDesk',
      meta: { assetId: assets.standingDesk.id },
      createdAt: daysAgo(12),
    },
    {
      actorKey: 'financeHead',
      action: 'TRANSFER_REJECTED',
      entityType: 'Transfer',
      entityKey: 'transferPhone',
      meta: { allocationId: allocations.allocPhone.id },
      createdAt: daysAgo(5),
    },
    {
      actorKey: 'opsHead',
      action: 'MAINTENANCE_RESOLVED',
      entityType: 'MaintenanceReq',
      entityKey: 'm5',
      meta: { assetId: assets.creta.id },
      createdAt: daysAgo(4),
    },
    {
      actorKey: 'assetManagerOne',
      action: 'MAINTENANCE_RESOLVED',
      entityType: 'MaintenanceReq',
      entityKey: 'm7',
      meta: { assetId: assets.accessPoint.id },
      createdAt: daysAgo(5),
    },
    {
      actorKey: 'admin',
      action: 'AUDIT_CLOSED',
      entityType: 'AuditCycle',
      entityKey: 'itAudit',
      meta: { cycleId: auditCycles.itAudit.id },
      createdAt: daysAgo(23),
    },
    {
      actorKey: 'assetManagerTwo',
      action: 'AUDIT_CLOSED',
      entityType: 'AuditCycle',
      entityKey: 'opsAudit',
      meta: { cycleId: auditCycles.opsAudit.id },
      createdAt: daysAgo(14),
    },
    {
      actorKey: 'assetManagerOne',
      action: 'ASSET_ALLOCATED',
      entityType: 'Allocation',
      entityKey: 'allocInnova',
      meta: { assetId: assets.innova.id, departmentId: departments.corporate.id },
      createdAt: daysAgo(20),
    },
    {
      actorKey: 'assetManagerTwo',
      action: 'BOOKING_CONFIRMED',
      entityType: 'Booking',
      entityKey: 'boardRoomPlanning',
      meta: { assetId: assets.boardRoom.id },
      createdAt: daysAgo(1),
    },
  ] as const;

  await Promise.all(
    activitySeeds.map((seed) =>
      prisma.activityLog.create({
        data: {
          actorId: users[seed.actorKey].id,
          action: seed.action,
          entityType: seed.entityType,
          entityId: seed.entityKey,
          meta: seed.meta,
          createdAt: seed.createdAt,
        },
      }),
    ),
  );
  console.log('✅ Activity logs created');

  console.log('\n🎉 Seed complete. Demo-ready dataset loaded.\n');
  console.log('📋 Demo Credentials:');
  console.log('  Admin:           admin@assetflow.com      / Admin@123');
  console.log('  Asset Manager 1:  manager@assetflow.com    / Employee@123');
  console.log('  Asset Manager 2:  opsmanager@assetflow.com / Employee@123');
  console.log('  IT Head:         ithead@assetflow.com     / Employee@123');
  console.log('  Finance Head:    financehead@assetflow.com / Employee@123');
  console.log('  HR Head:         hrhead@assetflow.com     / Employee@123');
  console.log('  Operations Head:  opshead@assetflow.com    / Employee@123');
  console.log('  Sales Head:      saleshead@assetflow.com  / Employee@123');
  console.log('  Employees:       raj@assetflow.com, carol@assetflow.com, imran@assetflow.com, nisha@assetflow.com, ashok@assetflow.com, leela@assetflow.com, vikram@assetflow.com, sana@assetflow.com, pratik@assetflow.com, ravi@assetflow.com');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
