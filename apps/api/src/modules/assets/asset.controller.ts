import { Request, Response, NextFunction } from 'express';
import { AssetService } from './asset.service';
import { CreateAssetDto, UpdateAssetDto, AssetSearchDto, AssetStatusPatchDto } from './asset.dto';

// ─── Controller ───────────────────────────────────────────────────────────────

export const AssetController = {
  /**
   * GET /assets
   * Returns a paginated, filtered list of assets.
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = req.query as unknown as AssetSearchDto;
      const result = await AssetService.getAll(filters);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /assets/stats
   * Returns per-status asset counts for dashboard KPI cards.
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const counts = await AssetService.getStatusCounts();
      res.status(200).json({ success: true, data: counts });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /assets/:id
   * Returns full asset detail including recent allocations and maintenances.
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const asset = await AssetService.getById(req.params.id);
      res.status(200).json({ success: true, data: asset });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /assets
   * Registers a new asset. Accepts an optional multipart photo upload.
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: CreateAssetDto = req.body;
      const photoPath = req.file?.path;

      const asset = await AssetService.register(dto, photoPath);
      res.status(201).json({
        success: true,
        message: `Asset "${asset.tag}" registered successfully`,
        data: asset,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /assets/:id
   * Updates mutable fields on an existing asset.
   * Accepts an optional new photo upload to replace the existing one.
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: UpdateAssetDto = req.body;
      const photoPath = req.file?.path;

      const asset = await AssetService.update(req.params.id, dto, photoPath);
      res.status(200).json({
        success: true,
        message: `Asset "${asset.tag}" updated successfully`,
        data: asset,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /assets/:id/status
   * Transitions the status of an asset (e.g. AVAILABLE → UNDER_MAINTENANCE).
   */
  async patchStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: AssetStatusPatchDto = req.body;
      const asset = await AssetService.updateStatus(req.params.id, dto);
      res.status(200).json({
        success: true,
        message: `Asset status updated to "${asset.status}"`,
        data: asset,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /assets/:id
   * Permanently removes an asset. Blocked if the asset has an active allocation.
   */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AssetService.delete(req.params.id);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },
};
