import { prisma } from '../../../shared/prisma/client';
import { CreateDepartmentInput, UpdateDepartmentInput } from './department.dto';

export interface DepartmentFilters {
  status?: 'ACTIVE' | 'INACTIVE';
}

export const departmentRepository = {
  async findAll(filters: DepartmentFilters = {}) {
    const where: Record<string, unknown> = {};

    if (filters.status) {
      where.status = filters.status;
    }

    return prisma.department.findMany({
      where,
      include: {
        head: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            employees: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.department.findUnique({
      where: { id },
      include: {
        head: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });
  },

  async create(data: CreateDepartmentInput) {
    return prisma.department.create({
      data: {
        name: data.name,
        status: data.status,
        parentId: data.parentId ?? null,
        headId: data.headId ?? null,
      },
      include: {
        head: {
          select: { id: true, name: true, email: true },
        },
        parent: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async update(id: string, data: UpdateDepartmentInput) {
    return prisma.department.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.headId !== undefined && { headId: data.headId }),
      },
      include: {
        head: {
          select: { id: true, name: true, email: true },
        },
        parent: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async delete(id: string) {
    return prisma.department.delete({ where: { id } });
  },

  async assignHead(deptId: string, headId: string) {
    return prisma.department.update({
      where: { id: deptId },
      data: { headId },
      include: {
        head: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async findByName(name: string) {
    return prisma.department.findFirst({
      where: { name: { equals: name } },
    });
  },

  async countActiveEmployees(id: string) {
    return prisma.user.count({
      where: { departmentId: id, status: 'ACTIVE' },
    });
  },
};
