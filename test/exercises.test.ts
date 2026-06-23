import { describe, it, expect } from "vitest";
import { WorkoutX, WorkoutXError } from "../src/index.js";
import { mockFetch, pathOf, queryOf } from "./helpers.js";

describe("exercises", () => {
  it("lists with pagination and sends the API key header", async () => {
    const fetch = mockFetch({ json: { total: 1, count: 1, data: [{ id: "0001", name: "Sit-up" }] } });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    const page = await wx.exercises.list({ limit: 20, offset: 40 });

    expect(page.data[0].id).toBe("0001");
    const req = fetch.last();
    expect(pathOf(req)).toBe("/v1/exercises");
    expect(queryOf(req)).toEqual({ limit: "20", offset: "40" });
    expect(req.headers["x-workoutx-key"]).toBe("wx_test");
    expect(req.headers["authorization"]).toBeUndefined();
  });

  it("get() encodes the id into the path", async () => {
    const fetch = mockFetch({ json: { id: "0001", name: "Sit-up" } });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.exercises.get("00 1");
    expect(pathOf(fetch.last())).toBe("/v1/exercises/00%201");
  });

  it("byName hits the /name/ route", async () => {
    const fetch = mockFetch({ json: [{ id: "0007", name: "lunges" }] });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    const res = await wx.exercises.byName("lunges", { limit: 1 });
    expect(res[0].name).toBe("lunges");
    expect(pathOf(fetch.last())).toBe("/v1/exercises/name/lunges");
    expect(queryOf(fetch.last())).toEqual({ limit: "1" });
  });

  it("alternatives forwards equipment filters", async () => {
    const fetch = mockFetch({ json: { total: 0, count: 0, data: [] } });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.exercises.alternatives("0001", { equipment: "dumbbell", excludeEquipment: "barbell" });
    expect(pathOf(fetch.last())).toBe("/v1/exercises/0001/alternatives");
    expect(queryOf(fetch.last())).toEqual({ equipment: "dumbbell", excludeEquipment: "barbell" });
  });

  it("find() falls back to a name search on 404", async () => {
    const fetch = mockFetch((req) => {
      if (pathOf(req) === "/v1/exercises/lunges") return { status: 404, json: { error: "Not Found" } };
      return { json: [{ id: "0007", name: "lunges" }] };
    });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    const ex = await wx.exercises.find("lunges");
    expect(ex?.id).toBe("0007");
    expect(fetch.calls).toHaveLength(2);
  });

  it("find() returns null when neither id nor name matches", async () => {
    const fetch = mockFetch((req) => {
      if (pathOf(req).startsWith("/v1/exercises/name/")) return { json: [] };
      return { status: 404, json: { error: "Not Found" } };
    });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    expect(await wx.exercises.find("nope")).toBeNull();
  });
});

describe("workout & supplements", () => {
  it("workout.generate forwards params as query", async () => {
    const fetch = mockFetch({ json: { days: [] } });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.workout.generate({ goal: "hypertrophy", days: 4 });
    expect(pathOf(fetch.last())).toBe("/v1/workout/generate");
    expect(queryOf(fetch.last())).toEqual({ goal: "hypertrophy", days: "4" });
  });

  it("supplements.get encodes the id", async () => {
    const fetch = mockFetch({ json: { id: "creatine", name: "Creatine" } });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    const s = await wx.supplements.get("creatine");
    expect(s.name).toBe("Creatine");
    expect(pathOf(fetch.last())).toBe("/v1/supplements/creatine");
  });
});

describe("gifs", () => {
  it("get() appends .gif, requests raw bytes", async () => {
    const fetch = mockFetch({ body: "GIF89a", headers: { "content-type": "image/gif" } });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    const bytes = await wx.gifs.get("0001");
    expect(bytes).toBeInstanceOf(ArrayBuffer);
    expect(pathOf(fetch.last())).toBe("/v1/gifs/0001.gif");
    expect(fetch.last().headers["accept"]).toBe("*/*");
  });

  it("get() does not double-append .gif", async () => {
    const fetch = mockFetch({ body: "GIF89a" });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });
    await wx.gifs.get("0001.gif");
    expect(pathOf(fetch.last())).toBe("/v1/gifs/0001.gif");
  });

  it("gifUrl() bakes the api key into the query string (no request)", () => {
    const wx = new WorkoutX({ apiKey: "wx_test", fetch: mockFetch({ json: {} }) });
    const url = wx.gifUrl("0001");
    expect(url).toBe("https://api.workoutxapp.com/v1/gifs/0001.gif?api-key=wx_test");
  });
});

describe("errors", () => {
  it("throws a structured WorkoutXError on non-2xx", async () => {
    const fetch = mockFetch({
      status: 404,
      json: { error: "Not Found", message: "No such exercise", tip: "Use byName" },
    });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await expect(wx.exercises.get("bad")).rejects.toMatchObject({
      status: 404,
      code: "Not Found",
      message: "No such exercise",
      tip: "Use byName",
    });
    const err = await wx.exercises.get("bad").catch((e) => e);
    expect(err).toBeInstanceOf(WorkoutXError);
    expect(err.isNotFound).toBe(true);
  });
});
