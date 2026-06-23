import { describe, it, expect } from "vitest";
import { WorkoutX } from "../src/index.js";
import { mockFetch, pathOf } from "./helpers.js";

describe("billing", () => {
  it("status uses the bearer token", async () => {
    const fetch = mockFetch({ json: { status: "active", plan: "pro" } });
    const wx = new WorkoutX({ scan: { token: "jwt" }, fetch });

    const s = await wx.billing.status();
    expect(s.plan).toBe("pro");
    const req = fetch.last();
    expect(pathOf(req)).toBe("/v1/billing/status");
    expect(req.headers["authorization"]).toBe("Bearer jwt");
  });

  it("checkout posts planId + billingCycle and returns the Stripe url", async () => {
    const fetch = mockFetch({ json: { url: "https://checkout.stripe.com/abc" } });
    const wx = new WorkoutX({ scan: { token: "jwt" }, fetch });

    const { url } = await wx.billing.checkout("pro", "yearly");
    expect(url).toBe("https://checkout.stripe.com/abc");
    const req = fetch.last();
    expect(req.method).toBe("POST");
    expect(pathOf(req)).toBe("/v1/billing/checkout");
    expect(req.body).toEqual({ planId: "pro", billingCycle: "yearly" });
  });

  it("checkout defaults the cycle to monthly", async () => {
    const fetch = mockFetch({ json: { url: "x" } });
    const wx = new WorkoutX({ scan: { token: "jwt" }, fetch });

    await wx.billing.checkout("basic");
    expect(fetch.last().body).toEqual({ planId: "basic", billingCycle: "monthly" });
  });

  it("portal POSTs with no body", async () => {
    const fetch = mockFetch({ json: { url: "https://billing.stripe.com/p" } });
    const wx = new WorkoutX({ scan: { token: "jwt" }, fetch });

    await wx.billing.portal();
    const req = fetch.last();
    expect(req.method).toBe("POST");
    expect(pathOf(req)).toBe("/v1/billing/portal");
    expect(req.body).toBeUndefined();
  });
});
