import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/AppError';

type Role = 'ADMIN' | 'ASSET_MANAGER' | 'DEPARTMENT_HEAD' | 'EMPLOYEE';

/**
 * RBAC Guard factory — pass allowed roles
 * Usage: router.get('/path', authenticate, authorize('ADMIN', 'ASSET_MANAGER'), handler)
 */
export const authorize = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError('Not authenticated'));
      return;
    }

    if (!roles.includes(req.user.role as Role)) {
      next(
        new ForbiddenError(
          `Role '${req.user.role}' is not authorized. Required: ${roles.join(', ')}`
        )
      );
      return;
    }

    next();
  };
};

// Convenience aliases
export const adminOnly = authorize('ADMIN');
export const managerOrAdmin = authorize('ADMIN', 'ASSET_MANAGER');
export const deptHeadOrAbove = authorize('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD');
export const allRoles = authorize('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE');
