import type { HttpClient } from "../http.js";
import type { PageParams, JsonObject } from "../types.js";

/**
 * Access to the Body Scan product (`/v1/scan/*`).
 *
 * Unlike the exercise endpoints (API key), these require a logged-in user's
 * Bearer token. Supply it via the client's `scan` option — either a ready
 * `token`, or `email`/`password` for automatic login on first use.
 */
export class ScanResource {
  constructor(private readonly http: HttpClient) {}

  /** Body-scan credit balance + usage stats for the current user. */
  credits(): Promise<JsonObject> {
    return this.http.request("/v1/scan/credits", { auth: "bearer" });
  }

  /** Current user's body-scan profile. */
  me(): Promise<JsonObject> {
    return this.http.request("/v1/scan/me", { auth: "bearer" });
  }

  /** Paginated scan history. */
  history(params: PageParams = {}): Promise<JsonObject> {
    return this.http.request("/v1/scan/history", { auth: "bearer", query: { ...params } });
  }

  /** List the user's body-scan API keys. */
  listKeys(): Promise<JsonObject[]> {
    return this.http.request("/v1/scan/keys", { auth: "bearer" });
  }

  /** Create a body-scan API key. */
  createKey(name: string): Promise<JsonObject> {
    return this.http.request("/v1/scan/keys", { auth: "bearer", method: "POST", body: { name } });
  }

  /** Delete a body-scan API key by ID. */
  deleteKey(id: string): Promise<JsonObject> {
    return this.http.request(`/v1/scan/keys/${encodeURIComponent(id)}`, {
      auth: "bearer",
      method: "DELETE",
    });
  }

  /** Create a Stripe checkout session for a credit pack. */
  checkout(body: JsonObject = {}): Promise<JsonObject> {
    return this.http.request("/v1/scan/checkout", { auth: "bearer", method: "POST", body });
  }

  /** Public list of available credit packs (no auth required). */
  packs(): Promise<JsonObject> {
    return this.http.request("/v1/scan/packs");
  }
}
