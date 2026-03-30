import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler middleware
 * TODO: Implement comprehensive error handling
 * - Structure error responses with consistent format
 * - Log errors to monitoring service
 * - Handle different error types appropriately
 * - Set proper HTTP status codes
 */

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path?: string;
    traceId?: string;
  };
}

export const errorHandler = (err: Error | ApiError, req: Request, res: Response, next: NextFunction) => {
  // TODO: Implement error logging to monitoring service
  console.error('[Error]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code || 'API_ERROR';
    message = err.message;
  } else if (err instanceof SyntaxError) {
    statusCode = 400;
    code = 'INVALID_REQUEST';
    message = 'Invalid request format';
  }

  // TODO: Add request ID / trace ID for debugging
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  };

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response) => {
  const errorResponse: ErrorResponse = {
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      statusCode: 404,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  };

  res.status(404).json(errorResponse);
};

export default errorHandler;
