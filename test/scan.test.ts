import { describe, it, expect } from "vitest";
import { WorkoutX } from "../src/index.js";
import { mockFetch, pathOf } from "./helpers.js";

describe("scan", () => {
  it("packs is public — no auth header attached", async () => {
    const fetch = mockFetch({ json: { packs: [] } });
    const wx = new WorkoutX({ fetch });

    await wx.scan.packs();
    const req = fetch.last();
    expect(pathOf(req)).toBe("/v1/scan/packs");
    expect(req.headers["authorization"]).toBeUndefined();
    expect(req.headers["x-workoutx-key"]).toBeUndefined();
  });

  it("credits sends the bearer token", async () => {
    const fetch = mockFetch({ json: { credits: 3 } });
    const wx = new WorkoutX({ scan: { token: "jwt" }, fetch });

    await wx.scan.credits();
    expect(pathOf(fetch.last())).toBe("/v1/scan/credits");
    expect(fetch.last().headers["authorization"]).toBe("Bearer jwt");
  });

  it("createKey / deleteKey use the right verbs", async () => {
    const fetch = mockFetch({ json: {} });
    const wx = new WorkoutX({ scan: { token: "jwt" }, fetch });

    await wx.scan.createKey("k");
    expect(fetch.last().method).toBe("POST");
    expect(pathOf(fetch.last())).toBe("/v1/scan/keys");

    await wx.scan.deleteKey("id1");
    expect(fetch.last().method).toBe("DELETE");
    expect(pathOf(fetch.last())).toBe("/v1/scan/keys/id1");
  });

  it("setScanToken lets a key-only client reach bearer endpoints", async () => {
    const fetch = mockFetch({ json: { credits: 1 } });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    wx.setScanToken("late-token");
    await wx.scan.credits();
    expect(fetch.last().headers["authorization"]).toBe("Bearer late-token");
  });
});
