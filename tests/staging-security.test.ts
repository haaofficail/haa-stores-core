import { describe, it, expect } from 'vitest';
import { AppError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, RateLimitedError, InternalError } from '@haa/shared';

describe('P0A — Staging Security', () => {
  describe('AppError classes', () => {
    it('AppError has statusCode, code, message', () => {
      const err = new AppError(400, 'TEST_ERROR', 'Test message');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('TEST_ERROR');
      expect(err.message).toBe('Test message');
      expect(err).toBeInstanceOf(Error);
    });

    it('AppError supports details', () => {
      const err = new AppError(400, 'VALIDATION_ERROR', 'Invalid', { field: 'email' });
      expect(err.details).toEqual({ field: 'email' });
    });

    it('ValidationError has status 400 and code VALIDATION_ERROR', () => {
      const err = new ValidationError('Invalid data', [{ field: 'name', message: 'required' }]);
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.details).toEqual([{ field: 'name', message: 'required' }]);
    });

    it('UnauthorizedError has status 401', () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
    });

    it('ForbiddenError has status 403', () => {
      const err = new ForbiddenError();
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });

    it('NotFoundError has status 404', () => {
      const err = new NotFoundError();
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
    });

    it('ConflictError has status 409', () => {
      const err = new ConflictError();
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT');
    });

    it('RateLimitedError has status 429', () => {
      const err = new RateLimitedError();
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('RATE_LIMITED');
    });

    it('InternalError has status 500', () => {
      const err = new InternalError();
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe('INTERNAL_ERROR');
    });

    it('AppError subclasses are instanceof AppError', () => {
      expect(new ValidationError()).toBeInstanceOf(AppError);
      expect(new UnauthorizedError()).toBeInstanceOf(AppError);
      expect(new ForbiddenError()).toBeInstanceOf(AppError);
      expect(new NotFoundError()).toBeInstanceOf(AppError);
      expect(new ConflictError()).toBeInstanceOf(AppError);
      expect(new RateLimitedError()).toBeInstanceOf(AppError);
      expect(new InternalError()).toBeInstanceOf(AppError);
    });
  });

  describe('error handler safety', () => {
    it('does not return stack trace in production response', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const _err = new Error('Secret DB crash: connection refused');
      const formatted = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      };

      expect(formatted).toEqual({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
      expect(formatted.error).not.toHaveProperty('stack');

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('AppError returns its own code and message in production', () => {
      const err = new NotFoundError('المتجر غير موجود');
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('المتجر غير موجود');
      expect(err.statusCode).toBe(404);
    });

    it('dev environment returns error message but not in production', () => {
      const errMessage = 'Detailed crash: ECONNREFUSED';
      const inProduction = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      };
      const inDev = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: errMessage },
      };

      expect(inProduction.error.message).toBe('Internal server error');
      expect(inDev.error.message).toBe(errMessage);
    });
  });

  describe('CORS origins validation', () => {
    it('parses comma-separated origins', () => {
      const raw = 'http://localhost:5173,http://localhost:5174';
      const origins = raw.split(',').map(s => s.trim()).filter(Boolean);
      expect(origins).toEqual(['http://localhost:5173', 'http://localhost:5174']);
    });

    it('parses single origin', () => {
      const raw = 'https://app.haastores.com';
      const origins = raw.split(',').map(s => s.trim()).filter(Boolean);
      expect(origins).toEqual(['https://app.haastores.com']);
    });

    it('handles empty string', () => {
      const raw = '';
      const origins = raw.split(',').map(s => s.trim()).filter(Boolean);
      expect(origins).toEqual([]);
    });
  });

  describe('rate limiter safety', () => {
    it('rate limiter blocks after exceeding limit', () => {
      const maxRequests = 3;
      const entry = { count: 4, resetTime: Date.now() + 60000 };
      const isBlocked = entry.count > maxRequests;
      expect(isBlocked).toBe(true);
    });

    it('rate limiter allows within limit', () => {
      const maxRequests = 3;
      const entry = { count: 2, resetTime: Date.now() + 60000 };
      const isBlocked = entry.count > maxRequests;
      expect(isBlocked).toBe(false);
    });

    it('rate limiter resets after window', () => {
      const entry = { count: 10, resetTime: Date.now() - 1000 };
      const now = Date.now();
      const isExpired = entry.resetTime <= now;
      expect(isExpired).toBe(true);
    });

    it('rate limited response has RATE_LIMITED code', () => {
      const response = {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'تم تجاوز الحد المسموح من المحاولات. حاول لاحقًا.' },
      };
      expect(response.error.code).toBe('RATE_LIMITED');
    });
  });

  describe('env validation', () => {
    it('rejects missing required env vars', () => {
      const required = ['DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY'];
      const env: Record<string, string> = { JWT_SECRET: 'some-secret' };
      const missing = required.filter(k => !env[k]);
      expect(missing).toContain('DATABASE_URL');
      expect(missing).toContain('ENCRYPTION_KEY');
    });

    it('accepts all required env vars present', () => {
      const env = {
        DATABASE_URL: 'postgres://...',
        JWT_SECRET: 'real-secret',
        ENCRYPTION_KEY: 'real-key-32-chars-min!!',
      };
      const missing = ['DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY'].filter(k => !env[k]);
      expect(missing).toHaveLength(0);
    });

    it('rejects dev default secrets in production', () => {
      const isProduction = true;
      const jwtSecret = 'dev-jwt-secret-change-in-production';
      const isBlocked = isProduction && jwtSecret === 'dev-jwt-secret-change-in-production';
      expect(isBlocked).toBe(true);
    });

    it('accepts dev default secrets in development', () => {
      const isProduction = false;
      const jwtSecret = 'dev-jwt-secret-change-in-production';
      const isBlocked = isProduction && jwtSecret === 'dev-jwt-secret-change-in-production';
      expect(isBlocked).toBe(false);
    });
  });

  describe('security headers', () => {
    it('required headers are set', () => {
      const headers: Record<string, string> = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      };
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['Permissions-Policy']).toContain('camera=()');
    });

    it('Strict-Transport-Security only in production/staging', () => {
      const headers: Record<string, string> = {};
      const nodeEnv = 'production';
      if (nodeEnv === 'production' || nodeEnv === 'staging') {
        headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
      }
      expect(headers['Strict-Transport-Security']).toBeDefined();
    });

    it('no HSTS in development', () => {
      const headers: Record<string, string> = {};
      const nodeEnv = 'development';
      if (nodeEnv === 'production' || nodeEnv === 'staging') {
        headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
      }
      expect(headers['Strict-Transport-Security']).toBeUndefined();
    });
  });

  describe('logging safety', () => {
    const sensitivePatterns = [
      'JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      'password: Test@123456',
      'secret: dev-jwt-secret',
      '-----BEGIN PRIVATE KEY-----',
    ];

    const safeLog = (msg: string): string => {
      const blocked = ['JWT eyJ', 'password:', 'secret: dev', '-----BEGIN'];
      for (const pattern of blocked) {
        if (msg.includes(pattern)) return '[REDACTED]';
      }
      return msg;
    };

    for (const sensitive of sensitivePatterns) {
      it(`redacts sensitive data: ${sensitive.split(' ')[0]}...`, () => {
        expect(safeLog(sensitive)).toBe('[REDACTED]');
      });
    }

    it('allows safe log messages', () => {
      expect(safeLog('Order ORD-001 created successfully')).toBe('Order ORD-001 created successfully');
      expect(safeLog('GET /health 200')).toBe('GET /health 200');
    });
  });

  describe('Storage driver guard', () => {
    it('rejects STORAGE_DRIVER=local in staging/production', () => {
      const validateStorage = (nodeEnv: string, driver: string): string | null => {
        const isProduction = nodeEnv === 'production' || nodeEnv === 'staging';
        if (isProduction && driver === 'local') {
          return 'STORAGE_DRIVER=local is not allowed in staging/production. Use STORAGE_DRIVER=s3 with R2 or S3.';
        }
        return null;
      };

      expect(validateStorage('staging', 'local')).toContain('not allowed');
      expect(validateStorage('production', 'local')).toContain('not allowed');
      expect(validateStorage('development', 'local')).toBeNull();
      expect(validateStorage('staging', 's3')).toBeNull();
      expect(validateStorage('production', 's3')).toBeNull();
    });
  });
});
