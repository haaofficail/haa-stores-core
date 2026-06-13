export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const USER_ERROR_MESSAGES: Record<string, string> = {
  'VALIDATION_ERROR': 'يرجى التأكد من صحة البيانات المدخلة.',
  'UNAUTHORIZED': 'جلسة العمل منتهية، يرجى تسجيل الدخول مرة أخرى.',
  'FORBIDDEN': 'لا تملك الصلاحيات الكافية للقيام بهذا الإجراء.',
  'NOT_FOUND': 'المورد المطلوب غير موجود.',
  'CONFLICT': 'حدث تعارض في البيانات، يرجى المحاولة مرة أخرى.',
  'RATE_LIMITED': 'لقد تجاوزت الحد المسموح به من الطلبات، يرجى الانتظار قليلاً.',
  'INTERNAL_ERROR': 'حدث خطأ داخلي في النظام، نحن نعمل على إصلاحه.',
  'CHECKOUT_ERROR': 'حدث خطأ أثناء إتمام الطلب، يرجى مراجعة بياناتك.',
  'CONFIRM_ERROR': 'فشل تأكيد الطلب، يرجى المحاولة لاحقاً.',
};

export function getUserFriendlyMessage(code: string, defaultMessage: string): string {
  return USER_ERROR_MESSAGES[code] || defaultMessage;
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, 'NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, 'CONFLICT', message);
    this.name = 'ConflictError';
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'Too many requests') {
    super(429, 'RATE_LIMITED', message);
    this.name = 'RateLimitedError';
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(500, 'INTERNAL_ERROR', message);
    this.name = 'InternalError';
  }
}
