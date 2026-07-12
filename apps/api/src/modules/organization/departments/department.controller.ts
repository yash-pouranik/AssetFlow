import { Request, Response, NextFunction } from 'express';
import { departmentService } from './department.service';
import { DepartmentFilters } from './department.repository';

export const departmentController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: DepartmentFilters = {
        status: req.query.status as 'ACTIVE' | 'INACTIVE' | undefined,
      };

      const departments = await departmentService.getAll(filters);

      res.status(200).json({
        success: true,
        data: departments,
        count: departments.length,
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const department = await departmentService.getById(id);

      res.status(200).json({
        success: true,
        data: department,
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const department = await departmentService.create(req.body);

      res.status(201).json({
        success: true,
        data: department,
        message: 'Department created successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const department = await departmentService.update(id, req.body);

      res.status(200).json({
        success: true,
        data: department,
        message: 'Department updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await departmentService.delete(id);

      res.status(200).json({
        success: true,
        message: 'Department deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async assignHead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const department = await departmentService.assignHead(id, req.body);

      res.status(200).json({
        success: true,
        data: department,
        message: 'Department head assigned successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};
