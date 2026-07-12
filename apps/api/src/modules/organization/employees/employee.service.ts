import { NotFoundError } from '../../../shared/errors/AppError';
import { eventBus, EVENTS } from '../../../shared/events/eventBus';
import { employeeRepository } from './employee.repository';
import { EmployeeFilters, UpdateEmployeeInput } from './employee.dto';
import { prisma } from '../../../shared/prisma/client';

export const employeeService = {
  async getAll(filters: EmployeeFilters) {
    const sanitized: EmployeeFilters = {};

    if (filters.role) sanitized.role = filters.role;
    if (filters.status) sanitized.status = filters.status;
    if (filters.departmentId) sanitized.departmentId = filters.departmentId;

    return employeeRepository.findAll(sanitized);
  },

  async getById(id: string) {
    const employee = await employeeRepository.findById(id);

    if (!employee) {
      throw new NotFoundError(`Employee with ID '${id}' not found`);
    }

    return employee;
  },

  async update(id: string, data: UpdateEmployeeInput) {
    const existing = await employeeRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Employee with ID '${id}' not found`);
    }

    // Validate departmentId if provided
    if (data.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
      if (!dept) {
        throw new NotFoundError(`Department with ID '${data.departmentId}' not found`);
      }
    }

    const updated = await employeeRepository.update(id, data);

    eventBus.emit(EVENTS.EMPLOYEE_UPDATED, { employee: updated });

    return updated;
  },

  async deactivate(id: string) {
    const existing = await employeeRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Employee with ID '${id}' not found`);
    }

    if (existing.status === 'INACTIVE') {
      throw new NotFoundError(`Employee with ID '${id}' is already inactive`);
    }

    const updated = await employeeRepository.updateStatus(id, 'INACTIVE');

    eventBus.emit(EVENTS.EMPLOYEE_DEACTIVATED, { employeeId: id });

    return updated;
  },

  async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
    const existing = await employeeRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Employee with ID '${id}' not found`);
    }

    const updated = await employeeRepository.updateStatus(id, status);

    if (status === 'INACTIVE') {
      eventBus.emit(EVENTS.EMPLOYEE_DEACTIVATED, { employeeId: id });
    } else {
      eventBus.emit(EVENTS.EMPLOYEE_UPDATED, { employee: updated });
    }

    return updated;
  },
};
