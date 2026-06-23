import { describe, it, expect } from "vitest";
import { WorkoutX, WorkoutXConnectionError } from "../src/index.js";
import { mockFetch, pathOf } from "./helpers.js";

describe("http behaviour", () => {
  it("scan endpoints auto-login with email/password then cache the token", async () => {
    const fetch = mockFetch((req) => {
      if (pathOf(req) === "/v1/auth/login") return { json: { token: "tok-1", user: {}, apiKeys: [] } };
      return { json: { credits: 5 } };
    });
    const wx = new WorkoutX({ scan: { email: "a@b.com", password: "pw" }, fetch });

    const credits = await wx.scan.credits();
    expect(credits.credits).toBe(5);
    expect(fetch.calls[0] && pathOf(fetch.calls[0])).toBe("/v1/auth/login");
    expect(fetch.last().headers["authorization"]).toBe("Bearer tok-1");

    // Second scan call must not log in again.
    await wx.scan.me();
    expect(fetch.calls.filter((c) => pathOf(c) === "/v1/auth/login")).toHaveLength(1);
  });

  it("concurrent scan calls de-dupe the login request", async () => {
    const fetch = mockFetch((req) => {
      if (pathOf(req) === "/v1/auth/login") return { json: { token: "tok-1", user: {}, apiKeys: [] } };
      return { json: { ok: true } };
    });
    const wx = new WorkoutX({ scan: { email: "a@b.com", password: "pw" }, fetch });

    await Promise.all([wx.scan.credits(), wx.scan.me(), wx.scan.history()]);
    expect(fetch.calls.filter((c) => pathOf(c) === "/v1/auth/login")).toHaveLength(1);
  });

  it("retries on 503 then succeeds", async () => {
    let n = 0;
    const fetch = mockFetch(() => {
      n += 1;
      return n < 2 ? { status: 503, json: { error: "Service Unavailable" } } : { json: { ok: true } };
    });
    const wx = new WorkoutX({ apiKey: "wx_test", maxRetries: 2, fetch });

    const res = await wx.exercises.list();
    expect(res).toEqual({ ok: true });
    expect(n).toBe(2);
  });

  it("surfaces a connection error after exhausting retries", async () => {
    const fetch = (() => {
      throw new TypeError("network down");
    }) as unknown as typeof globalThis.fetch;
    const wx = new WorkoutX({ apiKey: "wx_test", maxRetries: 1, fetch });

    await expect(wx.exercises.list()).rejects.toBeInstanceOf(WorkoutXConnectionError);
  });

  it("merges custom default headers into every request", async () => {
    const fetch = mockFetch({ json: { data: [] } });
    const wx = new WorkoutX({ apiKey: "wx_test", headers: { "X-Trace": "abc" }, fetch });

    await wx.exercises.list();
    expect(fetch.last().headers["x-trace"]).toBe("abc");
    expect(fetch.last().headers["user-agent"]).toContain("workoutx-sdk-js");
  });
});
