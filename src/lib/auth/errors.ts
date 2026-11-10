/**
 * Custom authentication domain errors for robust error handling
 * and generic public error responses.
 */

export class AuthError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = "AUTH_ERROR", statusCode = 400) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AuthError {
  constructor(message: string, code = "VALIDATION_ERROR") {
    super(message, code, 400);
    this.name = "ValidationError";
  }
}

export class InvalidTokenError extends AuthError {
  constructor(message = "Invalid or malformed authentication token.") {
    super(message, "INVALID_TOKEN", 400);
    this.name = "InvalidTokenError";
  }
}

export class TokenExpiredError extends AuthError {
  constructor(message = "Authentication token has expired. Please request a new magic link.") {
    super(message, "TOKEN_EXPIRED", 400);
    this.name = "TokenExpiredError";
  }
}

export class TokenAlreadyUsedError extends AuthError {
  constructor(
    message = "This authentication link has already been used. Please request a new one."
  ) {
    super(message, "TOKEN_ALREADY_USED", 400);
    this.name = "TokenAlreadyUsedError";
  }
}

export class InvalidSessionError extends AuthError {
  constructor(message = "Invalid or expired session. Please sign in again.") {
    super(message, "INVALID_SESSION", 401);
    this.name = "InvalidSessionError";
  }
}

export class RateLimitExceededError extends AuthError {
  public readonly retryAfterSeconds: number;

  constructor(
    message = "Too many authentication requests. Please try again later.",
    retryAfterSeconds = 900
  ) {
    super(message, "RATE_LIMIT_EXCEEDED", 429);
    this.name = "RateLimitExceededError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
