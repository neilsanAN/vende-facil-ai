export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
