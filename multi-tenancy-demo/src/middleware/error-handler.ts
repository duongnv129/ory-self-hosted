/**
 * Error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/errors';

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Unhandled error:', error);

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      details: error.details,
    });
    return;
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};
