import { prisma } from '../../../shared/prisma/client';
import { EmployeeFilters, UpdateEmployeeInput } from './employee.dto';

export const employeeRepository = {
  async findAll(filters: EmployeeFilters = {}) {
    const where: Record<string, unknown> = {};

    if (filters.role) {
      where.role = filters.role;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    return prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
        phone: true,
        createdAt: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        allocations: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            allocatedAt: true,
            status: true,
            asset: {
              select: {
                id: true,
                name: true,
                tag: true,
                status: true,
              },
            },
          },
          orderBy: { allocatedAt: 'desc' },
        },
      },
    });
  },

  async update(id: string, data: UpdateEmployeeInput) {
    return prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
        ...(data.status !== undefined && { status: data.status }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
        phone: true,
        updatedAt: true,
        department: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
    return prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        updatedAt: true,
      },
    });
  },
};
