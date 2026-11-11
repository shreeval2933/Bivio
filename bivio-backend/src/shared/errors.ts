export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
    public readonly isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(403, message, 'FORBIDDEN');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, message, 'BAD_REQUEST');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly details?: unknown) {
    super(422, message, 'VALIDATION');
  }
}

/**
 * HTTP 402 — semantically the correct code for "you haven't paid the one-time
 * fee yet." The frontend should catch this specifically to trigger the fee
 * modal rather than a generic error toast (see OQ-1: posting fee is account
 * level, checked once at job-creation attempt).
 */
export class PaymentRequiredError extends AppError {
  constructor(message = 'Payment required to perform this action') {
    super(402, message, 'PAYMENT_REQUIRED');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(429, message, 'RATE_LIMITED');
  }
}
