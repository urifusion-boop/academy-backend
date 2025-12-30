export class AppError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, message: string, status = 500, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(details?: unknown) {
    super('ValidationError', 'Invalid input', 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super('NotFound', message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('Unauthorized', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('Forbidden', message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super('Conflict', message, 409);
  }
}
