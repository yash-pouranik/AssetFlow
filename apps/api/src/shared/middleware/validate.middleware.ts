import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type ValidateTarget = 'body' | 'query' | 'params';

/**
 * Zod validation middleware factory
 * Usage: router.post('/path', validate(CreateAssetDto), handler)
 */
export const validate = (schema: ZodSchema, target: ValidateTarget = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(result.error); // Caught by globalErrorHandler as ZodError
      return;
    }
    req[target] = result.data; // Replace with parsed & transformed data
    next();
  };
};
