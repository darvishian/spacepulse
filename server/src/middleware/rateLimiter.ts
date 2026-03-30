import { Request, Response, NextFunction } from 'express';

/**
 * TODO: Implement proper rate limiting
 * - Use package like express-rate-limit
 * - Store request counts in Redis for distributed rate limiting
 * - Track by IP address or user ID
 * - Implement different limits for different endpoints
 */

interface RateLimitConfig {
  windowMs: number; // milliseconds
  maxRequests: number;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
};

/**
 * Simple in-memory rate limiter (stub)
 * TODO: Replace with Redis-backed implementation for production
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    // TODO: Implement rate limiting logic
    // - Get client IP from req.ip
    // - Check request count in window
    // - Increment count
    // - Return 429 if limit exceeded
    // - Set rate limit headers

    const clientIp = req.ip || 'unknown';
    const now = Date.now();

    const record = requestCounts.get(clientIp);
    if (!record || now > record.resetTime) {
      requestCounts.set(clientIp, {
        count: 1,
        resetTime: now + finalConfig.windowMs,
      });
    } else {
      record.count += 1;
      if (record.count > finalConfig.maxRequests) {
        res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        });
        return;
      }
    }

    next();
  };
}

export default createRateLimiter;
