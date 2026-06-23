import { WorkoutXError, WorkoutXConnectionError } from "./errors.js";

export type QueryValue = string | number | boolean | undefined | null;
export type Query = Record<string, QueryValue>;

export interface HttpConfig {
  baseUrl: string;
  /** API key for exercises/gifs/workout/supplements (sent as X-WorkoutX-Key). */
  apiKey?: string;
  /** Bearer token for the body-scan endpoints. */
  getBearer?: () => Promise<string | undefined> | string | undefined;
  /** Per-request timeout in ms. Default 30000. */
  timeout: number;
  /** Max retries for transient failures (429 / 5xx / network). Default 2. */
  maxRetries: number;
  /** Extra headers merged into every request. */
  defaultHeaders: Record<string, string>;
  fetch: typeof fetch;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  query?: Query;
  body?: unknown;
  /** Which credential to attach. "key" = X-WorkoutX-Key, "bearer" = Authorization. */
  auth?: "key" | "bearer";
  /** Override the default Accept/return handling to get raw bytes. */
  raw?: boolean;
  signal?: AbortSignal;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildUrl(baseUrl: string, path: string, query?: Query): string {
  const url = new URL(baseUrl.replace(/\/$/, "") + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export class HttpClient {
  constructor(private readonly cfg: HttpConfig) {}

  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const method = opts.method ?? "GET";
    const url = buildUrl(this.cfg.baseUrl, path, opts.query);

    const headers: Record<string, string> = {
      Accept: opts.raw ? "*/*" : "application/json",
      ...this.cfg.defaultHeaders,
    };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";

    if (opts.auth === "bearer") {
      const token = await this.resolveBearer();
      if (!token) {
        throw new WorkoutXError({
          status: 401,
          path,
          body: null,
          code: "Unauthorized",
          message:
            "Body-scan endpoints require authentication. Provide `scan.token` or `scan.email`/`scan.password` when constructing the client.",
        });
      }
      headers["Authorization"] = `Bearer ${token}`;
    } else if (this.cfg.apiKey) {
      // Default to API-key auth for the exercise product surface.
      headers["X-WorkoutX-Key"] = this.cfg.apiKey;
    }

    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.cfg.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.cfg.timeout);
      const signal = opts.signal
        ? anySignal([opts.signal, controller.signal])
        : controller.signal;

      let res: Response;
      try {
        res = await this.cfg.fetch(url, {
          method,
          headers,
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
          signal,
        });
      } catch (err) {
        clearTimeout(timer);
        lastErr = err;
        // Network/abort failures are retryable.
        if (attempt < this.cfg.maxRetries) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new WorkoutXConnectionError(
          `Request to ${path} failed: ${(err as Error)?.message ?? err}`,
          err,
        );
      }
      clearTimeout(timer);

      // Retry on 429 + 5xx (transient).
      if ((res.status === 429 || res.status >= 500) && attempt < this.cfg.maxRetries) {
        const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
        await sleep(retryAfter ?? backoffMs(attempt));
        continue;
      }

      if (!res.ok) throw await toError(res, path);

      if (opts.raw) return (await res.arrayBuffer()) as unknown as T;

      const text = await res.text();
      if (!text) return undefined as unknown as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as unknown as T;
      }
    }

    // Exhausted retries on a transient status — surface the last response error.
    throw lastErr instanceof Error
      ? lastErr
      : new WorkoutXConnectionError(`Request to ${path} failed after retries.`);
  }

  private async resolveBearer(): Promise<string | undefined> {
    if (!this.cfg.getBearer) return undefined;
    const v = this.cfg.getBearer();
    return v instanceof Promise ? await v : v;
  }
}

function backoffMs(attempt: number): number {
  // 250ms, 500ms, 1s ... with jitter.
  return Math.min(2000, 250 * 2 ** attempt) + Math.random() * 100;
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const secs = Number(header);
  if (!Number.isNaN(secs)) return secs * 1000;
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

async function toError(res: Response, path: string): Promise<WorkoutXError> {
  let body: unknown = null;
  let parsed: Record<string, unknown> = {};
  const text = await res.text().catch(() => "");
  if (text) {
    try {
      parsed = JSON.parse(text);
      body = parsed;
    } catch {
      body = text;
    }
  }
  const message =
    (parsed.message as string) ||
    (parsed.error as string) ||
    `${res.status} ${res.statusText} for ${path}`;
  return new WorkoutXError({
    status: res.status,
    path,
    body,
    message,
    code: parsed.error as string | undefined,
    tip: parsed.tip as string | undefined,
    docs: parsed.docs as string | undefined,
  });
}

/** Combine multiple AbortSignals (timeout + caller-provided). */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}
