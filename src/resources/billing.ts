import type { HttpClient } from "../http.js";
import type { JsonObject } from "../types.js";

/**
 * Subscription billing (`/v1/billing/*`). All methods require the Bearer
 * token from {@link AuthResource.login} (same token used by `scan.*`).
 *
 * `POST /v1/billing/webhook` (Stripe's server-to-server callback) is
 * intentionally not wrapped here — it requires the raw request body and
 * Stripe-Signature header from an actual HTTP server, not a client SDK call.
 */
export class BillingResource {
  constructor(private readonly http: HttpClient) {}

  /** Current subscription status, plan, and renewal date for the logged-in user. */
  status(): Promise<JsonObject> {
    return this.http.request("/v1/billing/status", { auth: "bearer" });
  }

  /** Create a Stripe Checkout session for upgrading to a paid plan. */
  checkout(
    planId: "basic" | "pro" | "ultra",
    billingCycle: "monthly" | "yearly" = "monthly",
  ): Promise<{ url: string }> {
    return this.http.request("/v1/billing/checkout", {
      auth: "bearer",
      method: "POST",
      body: { planId, billingCycle },
    });
  }

  /** Open the Stripe Customer Portal for the logged-in user to manage/cancel their subscription. */
  portal(): Promise<{ url: string }> {
    return this.http.request("/v1/billing/portal", { auth: "bearer", method: "POST" });
  }
}
