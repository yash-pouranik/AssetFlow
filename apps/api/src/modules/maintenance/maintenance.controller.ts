import { Request, Response, NextFunction } from 'express';
import { maintenanceService } from './maintenance.service';
import { MaintenanceFilterInput } from './maintenance.dto';

// ─── Controller ───────────────────────────────────────────────────────────────

export const maintenanceController = {
  /** GET / — paginated list of maintenance requests */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: MaintenanceFilterInput = {
        assetId: req.query.assetId as string | undefined,
        status: req.query.status as any,
        priority: req.query.priority as any,
      };

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await maintenanceService.getAll(filters, page, limit);

      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  /** POST / — raise a new maintenance request */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const raisedById = req.user!.id;
      // req.file?.path is set by multer when a photo is uploaded
      const photo = req.file?.path;
      const request = await maintenanceService.raiseRequest(req.body, photo, raisedById);
      res.status(201).json({ success: true, data: request });
    } catch (err) {
      next(err);
    }
  },

  /** GET /:id — get maintenance request by ID */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const request = await maintenanceService.getById(req.params.id);
      res.json({ success: true, data: request });
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /:id/approve — approve or reject a maintenance request */
  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const approverId = req.user!.id;
      const request = await maintenanceService.approveRequest(
        req.params.id,
        req.body,
        approverId,
      );
      res.json({ success: true, data: request });
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /:id/assign-technician — assign a technician to an approved request */
  async assignTechnician(req: Request, res: Response, next: NextFunction) {
    try {
      const assignedById = req.user!.id;
      const request = await maintenanceService.assignTechnician(
        req.params.id,
        req.body,
        assignedById,
      );
      res.json({ success: true, data: request });
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /:id/start — technician starts work */
  async startWork(req: Request, res: Response, next: NextFunction) {
    try {
      const technicianId = req.user!.id;
      const request = await maintenanceService.startWork(req.params.id, technicianId);
      res.json({ success: true, data: request });
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /:id/resolve — resolve a maintenance request */
  async resolve(req: Request, res: Response, next: NextFunction) {
    try {
      const resolvedById = req.user!.id;
      const request = await maintenanceService.resolveRequest(
        req.params.id,
        req.body,
        resolvedById,
      );
      res.json({ success: true, data: request });
    } catch (err) {
      next(err);
    }
  },
};
