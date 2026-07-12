import { Request, Response, NextFunction } from 'express';
import { categoryService } from './category.service';

export const categoryController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await categoryService.getAll();

      res.status(200).json({
        success: true,
        data: categories,
        count: categories.length,
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const category = await categoryService.getById(id);

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.create(req.body);

      res.status(201).json({
        success: true,
        data: category,
        message: 'Asset category created successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const category = await categoryService.update(id, req.body);

      res.status(200).json({
        success: true,
        data: category,
        message: 'Asset category updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await categoryService.delete(id);

      res.status(200).json({
        success: true,
        message: 'Asset category deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};
