import { NotFoundError, ConflictError } from '../../../shared/errors/AppError';
import { eventBus, EVENTS } from '../../../shared/events/eventBus';
import { departmentRepository, DepartmentFilters } from './department.repository';
import { CreateDepartmentInput, UpdateDepartmentInput, AssignHeadInput } from './department.dto';
import { prisma } from '../../../shared/prisma/client';

export const departmentService = {
  async getAll(query: DepartmentFilters) {
    const filters: DepartmentFilters = {};

    if (query.status) {
      filters.status = query.status;
    }

    return departmentRepository.findAll(filters);
  },

  async getById(id: string) {
    const department = await departmentRepository.findById(id);

    if (!department) {
      throw new NotFoundError(`Department with ID '${id}' not found`);
    }

    return department;
  },

  async create(data: CreateDepartmentInput) {
    // Check name uniqueness
    const existing = await departmentRepository.findByName(data.name);
    if (existing) {
      throw new ConflictError(`Department with name '${data.name}' already exists`);
    }

    // Validate headId if provided
    if (data.headId) {
      const head = await prisma.user.findUnique({ where: { id: data.headId } });
      if (!head) {
        throw new NotFoundError(`User with ID '${data.headId}' not found`);
      }
    }

    // Validate parentId if provided
    if (data.parentId) {
      const parent = await departmentRepository.findById(data.parentId);
      if (!parent) {
        throw new NotFoundError(`Parent department with ID '${data.parentId}' not found`);
      }
    }

    const department = await departmentRepository.create(data);

    eventBus.emit(EVENTS.DEPARTMENT_CREATED, { department });

    return department;
  },

  async update(id: string, data: UpdateDepartmentInput) {
    // Ensure department exists
    const existing = await departmentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Department with ID '${id}' not found`);
    }

    // Check name uniqueness if name is changing
    if (data.name && data.name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await departmentRepository.findByName(data.name);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError(`Department with name '${data.name}' already exists`);
      }
    }

    // Validate headId if provided
    if (data.headId) {
      const head = await prisma.user.findUnique({ where: { id: data.headId } });
      if (!head) {
        throw new NotFoundError(`User with ID '${data.headId}' not found`);
      }
    }

    // Validate parentId if provided — prevent circular reference
    if (data.parentId) {
      if (data.parentId === id) {
        throw new ConflictError('A department cannot be its own parent');
      }
      const parent = await departmentRepository.findById(data.parentId);
      if (!parent) {
        throw new NotFoundError(`Parent department with ID '${data.parentId}' not found`);
      }
    }

    const updated = await departmentRepository.update(id, data);

    eventBus.emit(EVENTS.DEPARTMENT_UPDATED, { department: updated });

    return updated;
  },

  async delete(id: string) {
    const existing = await departmentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Department with ID '${id}' not found`);
    }

    const activeEmployeeCount = await departmentRepository.countActiveEmployees(id);
    if (activeEmployeeCount > 0) {
      throw new ConflictError(
        `Cannot delete department: it has ${activeEmployeeCount} active employee(s). Reassign or deactivate them first.`,
      );
    }

    await departmentRepository.delete(id);

    eventBus.emit(EVENTS.DEPARTMENT_DELETED, { departmentId: id });
  },

  async assignHead(deptId: string, input: AssignHeadInput) {
    const department = await departmentRepository.findById(deptId);
    if (!department) {
      throw new NotFoundError(`Department with ID '${deptId}' not found`);
    }

    const head = await prisma.user.findUnique({ where: { id: input.headId } });
    if (!head) {
      throw new NotFoundError(`User with ID '${input.headId}' not found`);
    }

    const updated = await departmentRepository.assignHead(deptId, input.headId);

    eventBus.emit(EVENTS.DEPARTMENT_HEAD_ASSIGNED, {
      departmentId: deptId,
      headId: input.headId,
    });

    return updated;
  },
};
