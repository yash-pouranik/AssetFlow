import { Request, Response, NextFunction } from 'express';
import { employeeService } from './employee.service';
import { EmployeeFilters } from './employee.dto';

export const employeeController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: EmployeeFilters = {
        role: req.query.role as string | undefined,
        status: req.query.status as string | undefined,
        departmentId: req.query.departmentId as string | undefined,
      };

      const employees = await employeeService.getAll(filters);

      res.status(200).json({
        success: true,
        data: employees,
        count: employees.length,
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const employee = await employeeService.getById(id);

      res.status(200).json({
        success: true,
        data: employee,
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const employee = await employeeService.update(id, req.body);

      res.status(200).json({
        success: true,
        data: employee,
        message: 'Employee updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body as { status: 'ACTIVE' | 'INACTIVE' };

      const employee = await employeeService.updateStatus(id, status);

      res.status(200).json({
        success: true,
        data: employee,
        message: `Employee status updated to ${status}`,
      });
    } catch (err) {
      next(err);
    }
  },
};
