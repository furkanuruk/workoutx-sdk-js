/**
 * Error raised for any non-2xx response from the WorkoutX API.
 *
 * The original parsed body (when JSON) is preserved on `.body`, and common
 * fields the API returns (`error`, `message`, `tip`, `docs`) are surfaced
 * directly so callers don't have to dig.
 */
export class WorkoutXError extends Error {
  /** HTTP status code (e.g. 401, 404, 429, 503). */
  readonly status: number;
  /** Short error label from the API body, e.g. "Not Found". */
  readonly code?: string;
  /** Hint the API sometimes returns to help fix the request. */
  readonly tip?: string;
  /** Docs URL the API sometimes returns. */
  readonly docs?: string;
  /** Raw parsed response body (object when JSON, string otherwise). */
  readonly body: unknown;
  /** The request path that failed, e.g. "/v1/exercises/lunges". */
  readonly path: string;

  constructor(args: {
    status: number;
    path: string;
    body: unknown;
    message: string;
    code?: string;
    tip?: string;
    docs?: string;
  }) {
    super(args.message);
    this.name = "WorkoutXError";
    this.status = args.status;
    this.path = args.path;
    this.body = args.body;
    this.code = args.code;
    this.tip = args.tip;
    this.docs = args.docs;
  }

  /** True for 429 (rate limit / quota). */
  get isRateLimited(): boolean {
    return this.status === 429;
  }

  /** True for 401/403 (auth/plan problems). */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /** True for 404. */
  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/** Raised when a network/transport failure prevents getting any response. */
export class WorkoutXConnectionError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "WorkoutXConnectionError";
    this.cause = cause;
  }
}
