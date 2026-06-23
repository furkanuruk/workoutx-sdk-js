import { describe, it, expect } from "vitest";
import { WorkoutX } from "../src/index.js";
import { mockFetch, pathOf, queryOf } from "./helpers.js";

describe("auth", () => {
  it("register posts the body, no auth header needed", async () => {
    const fetch = mockFetch({ status: 201, json: { requiresVerification: true } });
    const wx = new WorkoutX({ fetch });

    await wx.auth.register({ email: "a@b.com", password: "supersecret", name: "A" });
    const req = fetch.last();
    expect(req.method).toBe("POST");
    expect(pathOf(req)).toBe("/v1/auth/register");
    expect(req.body).toEqual({ email: "a@b.com", password: "supersecret", name: "A" });
  });

  it("login returns the token and caches it for subsequent bearer calls", async () => {
    const fetch = mockFetch((req) => {
      if (pathOf(req) === "/v1/auth/login") {
        return { json: { token: "jwt-123", user: { id: "u1" }, apiKeys: [] } };
      }
      return { json: { id: "u1", email: "a@b.com" } };
    });
    const wx = new WorkoutX({ fetch });

    const res = await wx.auth.login("a@b.com", "pw");
    expect(res.token).toBe("jwt-123");

    // me() must reuse the cached token without re-login.
    await wx.auth.me();
    const meReq = fetch.last();
    expect(pathOf(meReq)).toBe("/v1/auth/me");
    expect(meReq.headers["authorization"]).toBe("Bearer jwt-123");
    expect(fetch.calls.filter((c) => pathOf(c) === "/v1/auth/login")).toHaveLength(1);
  });

  it("updateMe uses PATCH", async () => {
    const fetch = mockFetch({ json: { id: "u1", name: "New" } });
    const wx = new WorkoutX({ scan: { token: "t" }, fetch });

    await wx.auth.updateMe("New");
    const req = fetch.last();
    expect(req.method).toBe("PATCH");
    expect(pathOf(req)).toBe("/v1/auth/me");
    expect(req.body).toEqual({ name: "New" });
  });

  it("createKey / deleteKey / updateKeyPlan hit the right routes & verbs", async () => {
    const fetch = mockFetch({ json: {} });
    const wx = new WorkoutX({ scan: { token: "t" }, fetch });

    await wx.auth.createKey("CI key");
    expect(fetch.last().method).toBe("POST");
    expect(pathOf(fetch.last())).toBe("/v1/auth/keys");

    await wx.auth.deleteKey("key_42");
    expect(fetch.last().method).toBe("DELETE");
    expect(pathOf(fetch.last())).toBe("/v1/auth/keys/key_42");

    await wx.auth.updateKeyPlan("key_42", "pro");
    expect(fetch.last().method).toBe("PATCH");
    expect(pathOf(fetch.last())).toBe("/v1/auth/keys/key_42/plan");
    expect(fetch.last().body).toEqual({ planId: "pro" });
  });

  it("verifyEmail sends the token as a query param (public)", async () => {
    const fetch = mockFetch({ json: { verified: true, apiKey: "wx_x" } });
    const wx = new WorkoutX({ fetch });

    await wx.auth.verifyEmail("tok-abc");
    expect(pathOf(fetch.last())).toBe("/v1/auth/verify-email");
    expect(queryOf(fetch.last())).toEqual({ token: "tok-abc" });
    expect(fetch.last().headers["authorization"]).toBeUndefined();
  });

  it("setWebhook PATCHes with null to clear", async () => {
    const fetch = mockFetch({ json: { webhookUrl: null } });
    const wx = new WorkoutX({ scan: { token: "t" }, fetch });

    await wx.auth.setWebhook(null);
    expect(fetch.last().method).toBe("PATCH");
    expect(pathOf(fetch.last())).toBe("/v1/auth/webhook");
    expect(fetch.last().body).toEqual({ webhookUrl: null });
  });

  it("bearer endpoints without credentials throw a 401 before fetching", async () => {
    const fetch = mockFetch({ json: {} });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await expect(wx.auth.me()).rejects.toMatchObject({ status: 401 });
    expect(fetch.calls).toHaveLength(0);
  });
});
