/**
 * Test helpers — a fetch mock that records every request and replies with
 * canned responses. The SDK accepts a custom `fetch` impl, so no network
 * interception library is needed.
 */

export interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface MockReply {
  status?: number;
  /** JSON body (object/array) or a raw string. */
  json?: unknown;
  body?: string;
  headers?: Record<string, string>;
}

export interface MockFetch {
  (input: unknown, init?: unknown): Promise<Response>;
  /** All requests captured, in order. */
  calls: CapturedRequest[];
  /** The most recent captured request. */
  last(): CapturedRequest;
}

/**
 * Build a mock fetch. `reply` may be a static reply or a function that
 * receives the captured request and returns one (for status/branching).
 */
export function mockFetch(
  reply: MockReply | ((req: CapturedRequest) => MockReply),
): MockFetch {
  const calls: CapturedRequest[] = [];

  const fn = (async (input: unknown, init: any = {}) => {
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries((init.headers as Record<string, string>) ?? {})) {
      headers[k.toLowerCase()] = v;
    }
    const captured: CapturedRequest = {
      url: String(input),
      method: init.method ?? "GET",
      headers,
      body: init.body !== undefined && init.body !== null ? JSON.parse(init.body) : undefined,
    };
    calls.push(captured);

    const r = typeof reply === "function" ? reply(captured) : reply;
    const status = r.status ?? 200;
    const responseBody = r.body ?? (r.json !== undefined ? JSON.stringify(r.json) : "");
    return new Response(responseBody, {
      status,
      headers: { "content-type": "application/json", ...r.headers },
    });
  }) as MockFetch;

  fn.calls = calls;
  fn.last = () => calls[calls.length - 1];
  return fn;
}

/** Parse the query string of a captured request URL into a plain object. */
export function queryOf(req: CapturedRequest): Record<string, string> {
  const out: Record<string, string> = {};
  new URL(req.url).searchParams.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

/** The path portion of a captured request URL (no host, no query). */
export function pathOf(req: CapturedRequest): string {
  return new URL(req.url).pathname;
}
