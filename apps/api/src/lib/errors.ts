export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function notFound(resource: string, id?: string): AppError {
  const message = id ? `${resource} '${id}' was not found` : `${resource} was not found`;
  return new AppError("NOT_FOUND", message, 404);
}

export function conflict(message: string, details?: Record<string, unknown>): AppError {
  return new AppError("CONFLICT", message, 409, details);
}

export function badRequest(message: string, details?: Record<string, unknown>): AppError {
  return new AppError("VALIDATION_ERROR", message, 400, details);
}

export function unauthorized(message = "Unauthorized"): AppError {
  return new AppError("UNAUTHORIZED", message, 401);
}

export function forbidden(message = "Forbidden"): AppError {
  return new AppError("FORBIDDEN", message, 403);
}
