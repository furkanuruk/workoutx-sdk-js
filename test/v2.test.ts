import { describe, it, expect } from "vitest";
import { WorkoutX } from "../src/index.js";
import { mockFetch, pathOf, queryOf } from "./helpers.js";

const inHours = (h: number) => new Date(Date.now() + h * 3600e3).toISOString();
const media = (tag: string, expiresAt = inHours(24)) => ({
  expiresAt,
  mediaVersion: 1,
  watermarked: false,
  mp4: `https://media.test/m/v1/ex_AAAAAA/mp4-720.mp4?s=${tag}`,
  poster: `https://media.test/m/v1/ex_AAAAAA/poster.jpg?s=${tag}`,
});

describe("v2", () => {
  it("list sends filters and the key in the header, never in the URL", async () => {
    const fetch = mockFetch({ json: { total: 1, limit: 10, offset: 0, results: [{ id: "ex_AAAAAA", media: media("a") }] } });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    const page = await wx.v2.list({ model: "female", bodyPart: "chest", limit: 10 });

    expect(page.results[0].id).toBe("ex_AAAAAA");
    const req = fetch.last();
    expect(pathOf(req)).toBe("/v2/exercises");
    expect(queryOf(req)).toEqual({ model: "female", bodyPart: "chest", limit: "10" });
    expect(req.headers["x-workoutx-key"]).toBe("wx_test");
    expect(req.url).not.toContain("api-key");
  });

  it("get, media, legacy and vocab routes", async () => {
    const fetch = mockFetch((req) => ({ json: req.url.includes("/media") ? { id: "ex_AAAAAA", media: media("m") } : {} }));
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.v2.get("ex_AAAAAA");
    expect(pathOf(fetch.last())).toBe("/v2/exercises/ex_AAAAAA");
    await wx.v2.media("ex_AAAAAA");
    expect(pathOf(fetch.last())).toBe("/v2/exercises/ex_AAAAAA/media");
    await wx.v2.legacy("0025");
    expect(pathOf(fetch.last())).toBe("/v2/exercises/legacy/0025");
    await wx.v2.muscles();
    expect(pathOf(fetch.last())).toBe("/v2/muscles");
  });

  it("freshMedia reuses links from list() while they are valid", async () => {
    const fetch = mockFetch({ json: { total: 1, limit: 10, offset: 0, results: [{ id: "ex_AAAAAA", media: media("list") }] } });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.v2.list();
    const links = await wx.v2.freshMedia("ex_AAAAAA");

    expect(links?.mp4).toContain("s=list");
    expect(fetch.calls.length).toBe(1);
  });

  it("freshMedia fetches new links when the cached ones are about to expire", async () => {
    let n = 0;
    const fetch = mockFetch((req) =>
      req.url.includes("/media")
        ? { json: { id: "ex_AAAAAA", media: media(`fresh${++n}`) } }
        : { json: { id: "ex_AAAAAA", media: media("old", inHours(0.05)) } },
    );
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.v2.get("ex_AAAAAA");
    const links = await wx.v2.freshMedia("ex_AAAAAA");

    expect(links?.mp4).toContain("s=fresh1");
    expect(pathOf(fetch.last())).toBe("/v2/exercises/ex_AAAAAA/media");
  });
});
