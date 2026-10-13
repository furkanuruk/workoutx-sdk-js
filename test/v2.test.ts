import { describe, it, expect } from "vitest";
import { WorkoutX, WorkoutXError } from "../src/index.js";
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

/** A v2 exercise as the API returns it (only what the SDK reads), media tagged `s=<tag>`. */
const exercise = (id: string, tag: string) => ({ id, name: `Exercise ${id}`, media: media(tag) });
const slot = (order: number, id: string, tag: string) => ({
  order, sets: 4, reps: "6-8", restSeconds: 90, exercise: exercise(id, tag),
});

describe("v2 lang and Joint & Rehab filters", () => {
  it("list sends lang and the Joint & Rehab filters", async () => {
    const fetch = mockFetch({ json: { total: 0, limit: 10, offset: 0, results: [] } });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.v2.list({ jointFocus: "knee", intensityLevel: "gentle", movementTag: "joint-friendly", lang: "zh-HK" });

    expect(pathOf(fetch.last())).toBe("/v2/exercises");
    expect(queryOf(fetch.last())).toEqual({
      jointFocus: "knee", intensityLevel: "gentle", movementTag: "joint-friendly", lang: "zh-HK",
    });
  });

  it("get and legacy take an optional lang; calls without it send no query", async () => {
    const fetch = mockFetch({ json: {} });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.v2.get("ex_SAWOOH");
    expect(fetch.last().url).toBe("https://api.workoutxapp.com/v2/exercises/ex_SAWOOH");
    await wx.v2.get("ex_SAWOOH", { lang: "tr" });
    expect(pathOf(fetch.last())).toBe("/v2/exercises/ex_SAWOOH");
    expect(queryOf(fetch.last())).toEqual({ lang: "tr" });

    await wx.v2.legacy("0025");
    expect(fetch.last().url).toBe("https://api.workoutxapp.com/v2/exercises/legacy/0025");
    await wx.v2.legacy("0025", { lang: "de" });
    expect(pathOf(fetch.last())).toBe("/v2/exercises/legacy/0025");
    expect(queryOf(fetch.last())).toEqual({ lang: "de" });
  });
});

describe("v2 similar, alternatives, calories", () => {
  it("similar maps model/limit/offset/lang and returns the ranked page", async () => {
    const fetch = mockFetch({
      json: {
        exerciseId: "ex_SAWOOH", model: "any", total: 42, limit: 2, offset: 4,
        results: [{ ...exercise("ex_WOZL6H", "a"), score: 95 }, { ...exercise("ex_KK4RJV", "b"), score: 80 }],
      },
    });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    const page = await wx.v2.similar("ex_SAWOOH", { model: "any", limit: 2, offset: 4, lang: "fr" });

    expect(pathOf(fetch.last())).toBe("/v2/exercises/ex_SAWOOH/similar");
    expect(queryOf(fetch.last())).toEqual({ model: "any", limit: "2", offset: "4", lang: "fr" });
    expect(page).toMatchObject({ exerciseId: "ex_SAWOOH", model: "any", total: 42, limit: 2, offset: 4 });
    expect(page.results.map((e) => [e.id, e.score])).toEqual([["ex_WOZL6H", 95], ["ex_KK4RJV", 80]]);
  });

  it("alternatives forwards equipment, excludeEquipment, model and paging", async () => {
    const fetch = mockFetch({ json: { exerciseId: "ex_SAWOOH", model: "male", total: 0, limit: 5, offset: 0, results: [] } });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.v2.alternatives("ex_SAWOOH", {
      equipment: "dumbbell", excludeEquipment: "barbell", model: "male", limit: 5, offset: 0, lang: "es",
    });

    expect(pathOf(fetch.last())).toBe("/v2/exercises/ex_SAWOOH/alternatives");
    expect(queryOf(fetch.last())).toEqual({
      equipment: "dumbbell", excludeEquipment: "barbell", model: "male", limit: "5", offset: "0", lang: "es",
    });
  });

  it("calories maps weightKg/minutes/lang and parses the estimate", async () => {
    const fetch = mockFetch({
      json: {
        id: "ex_SAWOOH", name: "Barbell Bench Press", model: "male", bodyPart: "Chest", target: "Pectorals",
        weightKg: 80, minutes: 30, met: 5, baseKcalPerMin: 6.1, kcalPerMin: 6.97, totalKcal: 209.1, note: "Estimate",
      },
    });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    const est = await wx.v2.calories("ex_SAWOOH", { weightKg: 80, minutes: 30, lang: "es" });

    expect(pathOf(fetch.last())).toBe("/v2/exercises/ex_SAWOOH/calories");
    expect(queryOf(fetch.last())).toEqual({ weightKg: "80", minutes: "30", lang: "es" });
    expect(est).toMatchObject({ id: "ex_SAWOOH", kcalPerMin: 6.97, totalKcal: 209.1 });
  });

  it("freshMedia reuses links from similar() and alternatives() without a request", async () => {
    const fetch = mockFetch((req) => {
      const id = pathOf(req).endsWith("/similar") ? "ex_WOZL6H" : "ex_KK4RJV";
      return { json: { exerciseId: "ex_SAWOOH", model: "male", total: 1, limit: 10, offset: 0, results: [{ ...exercise(id, id), score: 70 }] } };
    });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.v2.similar("ex_SAWOOH");
    await wx.v2.alternatives("ex_SAWOOH", { model: "female" });
    const fromSimilar = await wx.v2.freshMedia("ex_WOZL6H");
    const fromAlternatives = await wx.v2.freshMedia("ex_KK4RJV");

    expect(fromSimilar?.mp4).toContain("s=ex_WOZL6H");
    expect(fromAlternatives?.mp4).toContain("s=ex_KK4RJV");
    expect(fetch.calls).toHaveLength(2);
  });
});

describe("v2.workout", () => {
  it("generate maps every param and joins arrays with commas", async () => {
    const fetch = mockFetch({ json: { goal: "strength", level: "advanced", model: "female", seed: "abc123", exercises: [] } });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.v2.workout.generate({
      goal: "strength", duration: 60, level: "advanced", equipment: ["barbell", "dumbbell"], split: "push",
      bodyFocus: ["chest", "triceps"], exclude: ["ex_WOZL6H", "ex_KK4RJV"], seed: "abc123", model: "female", lang: "de",
    });

    expect(pathOf(fetch.last())).toBe("/v2/workout/generate");
    expect(queryOf(fetch.last())).toEqual({
      goal: "strength", duration: "60", level: "advanced", equipment: "barbell,dumbbell", split: "push",
      bodyFocus: "chest,triceps", exclude: "ex_WOZL6H,ex_KK4RJV", seed: "abc123", model: "female", lang: "de",
    });
  });

  it("generate passes comma-separated strings through and omits unset params", async () => {
    const fetch = mockFetch({ json: { exercises: [] } });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.v2.workout.generate({ equipment: "barbell,dumbbell", exclude: "ex_SAWOOH" });
    expect(queryOf(fetch.last())).toEqual({ equipment: "barbell,dumbbell", exclude: "ex_SAWOOH" });

    await wx.v2.workout.generate();
    expect(fetch.last().url).toBe("https://api.workoutxapp.com/v2/workout/generate");
  });

  it("program maps params and joins equipment", async () => {
    const fetch = mockFetch({ json: { goal: "strength", level: "beginner", model: "male", program: [] } });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.v2.workout.program({
      goal: "strength", level: "beginner", weeks: 8, daysPerWeek: 4, duration: 50,
      equipment: ["barbell", "dumbbell"], model: "male", lang: "fr",
    });

    expect(pathOf(fetch.last())).toBe("/v2/workout/program");
    expect(queryOf(fetch.last())).toEqual({
      goal: "strength", level: "beginner", weeks: "8", daysPerWeek: "4", duration: "50",
      equipment: "barbell,dumbbell", model: "male", lang: "fr",
    });
  });

  it("exercises from generate() and program() fill the media cache for freshMedia", async () => {
    const fetch = mockFetch((req) =>
      pathOf(req) === "/v2/workout/generate"
        ? { json: { goal: "muscle_gain", level: "intermediate", model: "male", seed: "s1", warmup: [], cooldown: [],
            exercises: [slot(1, "ex_SAWOOH", "gen")] } }
        : { json: { goal: "muscle_gain", level: "intermediate", model: "male",
            program: [{ week: 1, days: [{ day: 1, focus: "push", exercises: [slot(1, "ex_WOZL6H", "prog")] }] }] } },
    );
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    const workout = await wx.v2.workout.generate({ goal: "muscle_gain" });
    const program = await wx.v2.workout.program({ weeks: 2 });

    expect(workout.seed).toBe("s1");
    expect(workout.exercises[0]?.exercise.id).toBe("ex_SAWOOH");
    expect(program.program[0]?.days[0]?.exercises[0]?.exercise.id).toBe("ex_WOZL6H");
    expect((await wx.v2.freshMedia("ex_SAWOOH"))?.mp4).toContain("s=gen");
    expect((await wx.v2.freshMedia("ex_WOZL6H"))?.mp4).toContain("s=prog");
    expect(fetch.calls).toHaveLength(2);
  });
});

describe("v2.supplements", () => {
  it("list maps filters and returns the v2 page", async () => {
    const fetch = mockFetch({
      json: {
        total: 1, limit: 5, offset: 0, disclaimer: "Not medical advice.",
        results: [{ id: "creatine-monohydrate", name: "Creatine Monohydrate" }],
      },
    });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    const page = await wx.v2.supplements.list({
      category: "performance", goal: "strength", timing: "pre_workout", evidence: "strong", search: "creatine", limit: 5, offset: 0,
    });

    expect(pathOf(fetch.last())).toBe("/v2/supplements");
    expect(queryOf(fetch.last())).toEqual({
      category: "performance", goal: "strength", timing: "pre_workout", evidence: "strong", search: "creatine", limit: "5", offset: "0",
    });
    expect(page.results[0]?.id).toBe("creatine-monohydrate");
    expect(page.disclaimer).toBe("Not medical advice.");
  });

  it("filters, get, forExercise and stack routes", async () => {
    const fetch = mockFetch({ json: {} });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.v2.supplements.filters();
    expect(pathOf(fetch.last())).toBe("/v2/supplements/filters");

    await wx.v2.supplements.get("creatine monohydrate");
    expect(pathOf(fetch.last())).toBe("/v2/supplements/creatine%20monohydrate");

    await wx.v2.supplements.forExercise("ex_SAWOOH", { limit: 3, lang: "tr" });
    expect(pathOf(fetch.last())).toBe("/v2/supplements/exercise/ex_SAWOOH");
    expect(queryOf(fetch.last())).toEqual({ limit: "3", lang: "tr" });

    await wx.v2.supplements.stack({ goal: "muscle_gain", level: "essential" });
    expect(pathOf(fetch.last())).toBe("/v2/supplements/stack");
    expect(queryOf(fetch.last())).toEqual({ goal: "muscle_gain", level: "essential" });
  });
});

describe("v2 plan gates", () => {
  it("a 403 Plan Upgrade Required surfaces as WorkoutXError with feature and requiredPlan", async () => {
    const fetch = mockFetch((req) => {
      const [feature, requiredPlan] =
        pathOf(req) === "/v2/supplements/stack" ? ["supplementStacks", "scale"] : ["workoutGenerator", "growth"];
      return {
        status: 403,
        json: {
          error: "Plan Upgrade Required", message: "This feature requires a higher plan. Current plan: Starter.",
          feature, requiredPlan, upgrade: "https://workoutxapp.com/dashboard.html#billing",
        },
      };
    });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    const err = await wx.v2.workout.generate({ goal: "strength" }).catch((e) => e);
    expect(err).toBeInstanceOf(WorkoutXError);
    expect(err).toMatchObject({ status: 403, code: "Plan Upgrade Required", path: "/v2/workout/generate" });
    expect(err.isAuthError).toBe(true);
    expect(err.body).toMatchObject({ feature: "workoutGenerator", requiredPlan: "growth" });

    const stackErr = await wx.v2.supplements.stack({ goal: "muscle_gain" }).catch((e) => e);
    expect(stackErr).toBeInstanceOf(WorkoutXError);
    expect(stackErr.status).toBe(403);
    expect(stackErr.body).toMatchObject({ feature: "supplementStacks", requiredPlan: "scale" });

    expect(fetch.calls).toHaveLength(2); // a 403 is not retried
  });
});
