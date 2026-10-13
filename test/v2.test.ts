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
const exercise = (id: string, tag: string, name = `Exercise ${id}`) => ({ id, name, media: media(tag) });

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

/**
 * A session as /v2/workout/generate returns it, modeled on a real response.
 * Exercises are trimmed to what the SDK reads; media tagged `s=<tag>`.
 */
const sessionResponse = () => ({
  goal: "muscle_gain", level: "intermediate", model: "female", seed: "doc1", split: "full_body", format: "superset",
  targetDurationMinutes: 45, estimatedDurationMinutes: 41, equipment: ["bench", "body weight", "dumbbell"],
  avoidJoints: ["knee"],
  summary: {
    totalExercises: 3, workingSets: 9, patterns: ["squat", "hinge", "push_vertical"],
    muscles: [{ group: "Quads", sets: 4.5 }, { group: "Glutes", sets: 4.5 }, { group: "Hamstrings", sets: 3 }],
  },
  warmup: {
    minutes: 6,
    rampUp: "Before Dumbbell Front Squat: 2 ramp-up sets at about 50% × 10 and 75% × 5 of your working weight.",
    items: [
      { durationSeconds: 240, perSide: false, note: "Easy pace: raise your heart rate and body temperature.",
        exercise: exercise("ex_L4EMF6", "warm", "Walking") },
      { durationSeconds: 40, perSide: false, note: "Controlled, full range of motion.",
        exercise: exercise("ex_UBH37I", "warm2", "Lying on Side Arm Circle Warm Up") },
    ],
  },
  exercises: [
    {
      order: 1, block: "A", role: "main", pattern: "squat", sets: 3, reps: "6-8", perSide: false, restSeconds: 120,
      rir: 2, tempo: "3-0-1-0", load: "70–80% of 1RM",
      cue: "Ensure your elbows stay up and forward to keep the dumbbells stable on your shoulders.",
      rationale: "Main lift: squat for the quadriceps and glutes.",
      note: "Joint care: use a pain-free range and a load you control easily.",
      alternatives: [
        { id: "ex_O6QQUL", name: "Bodyweight Full Squat With Overhead Press", equipment: "Body Weight", model: "male" },
        { id: "ex_KNIBLJ", name: "Bodyweight Squat", equipment: "Body Weight", model: "male" },
      ],
      exercise: exercise("ex_TFXRNX", "main", "Dumbbell Front Squat"),
    },
    {
      order: 2, block: "B1", role: "secondary", pattern: "hinge", sets: 3, reps: "8-10", perSide: false, restSeconds: 60,
      rir: 2, tempo: "3-0-1-0", cue: "Focus on hinging at the hips rather than bending at the waist.",
      rationale: "Secondary lift: hip hinge for the hamstrings and glutes.",
      alternatives: [{ id: "ex_JUDO37", name: "Bodyweight Hip Thrust", equipment: "Body Weight", model: "female" }],
      exercise: exercise("ex_UA3FUQ", "b1", "Dumbbell Romanian Deadlift"),
    },
    {
      order: 3, block: "B2", role: "secondary", pattern: "push_vertical", sets: 3, reps: "8-10", perSide: false, restSeconds: 90,
      rir: 2, cue: null, rationale: "Secondary lift: overhead press for the shoulders.", alternatives: [],
      exercise: exercise("ex_DSOP01", "b2", "Dumbbell Seated Shoulder Press"),
    },
  ],
  cooldown: {
    minutes: 2,
    items: [
      { durationSeconds: 30, perSide: true, note: "Stretch for the quads; breathe slowly, no bouncing.",
        exercise: exercise("ex_CWLQWA", "cool", "Standing Quadriceps Stretch") },
    ],
  },
  notes: ["Joint care for knee: high-stress movements are left out and moderate ones use lighter loads and higher reps. This is general guidance, not medical advice."],
});

/** A program as /v2/workout/program returns it, modeled on a real response. */
const programResponse = () => {
  const day = (rir: number, deload = false) => ({
    day: 1, weekday: "Monday", session: "A", name: "Full body A",
    exercises: [
      { order: 1, block: "A", role: "main", exerciseId: "ex_NEMYLA", name: "Barbell Full Squat", sets: deload ? 2 : 3,
        perSide: false, restSeconds: 120, reps: "6-8", rir, load: deload ? "About 60% of your usual working weight" : "70–80% of 1RM",
        tempo: "3-0-1-0", ...(deload ? { note: "Deload: lighter and fewer sets. Leave the gym feeling fresh." } : {}) },
      { order: 2, block: "B", role: "main", exerciseId: "ex_SAWOOH", name: "Barbell Bench Press", sets: deload ? 2 : 3,
        perSide: false, restSeconds: 120, reps: "6-8", rir, load: "70–80% of 1RM", tempo: "3-0-1-0" },
    ],
  });
  return {
    goal: "muscle_gain", level: "intermediate", model: "male", seed: "doc2", weeks: 6, daysPerWeek: 3,
    sessionDurationMinutes: 60, equipment: ["any"],
    schedule: [
      { day: 1, weekday: "Monday", session: "A", name: "Full body A" },
      { day: 2, weekday: "Wednesday", session: "B", name: "Full body B" },
      { day: 3, weekday: "Friday", session: "C", name: "Full body C" },
    ],
    progressionModel: {
      name: "Double progression with rising effort",
      summary: "Each block starts about 3 reps short of failure and gets closer every week. A deload week ends each block.",
      rule: "When you reach the top of the rep range on every set, add 2.5–5% load next session and work back up the range.",
      deloadEvery: 5,
    },
    blocks: [
      { block: 1, weeks: [1, 2, 3, 4, 5], focus: "Foundation", deloadWeek: 5 },
      { block: 2, weeks: [6], focus: "Progression" },
    ],
    weeklyVolume: [
      { group: "Chest", sets: 13.5, target: [10, 16], status: "ok" },
      { group: "Triceps", sets: 9, target: [10, 16], status: "low" },
    ],
    sessions: [
      {
        session: "A", name: "Full body A", split: "full_body", goal: "muscle_gain", format: "superset", estimatedDurationMinutes: 57,
        warmup: {
          minutes: 6,
          rampUp: "Before Barbell Full Squat: 2 ramp-up sets at about 50% × 10 and 75% × 5 of your working weight.",
          items: [{ exerciseId: "ex_YOPLC7", name: "Treadmill Walk", durationSeconds: 240, perSide: false,
            note: "Easy pace: raise your heart rate and body temperature." }],
        },
        cooldown: {
          minutes: 2,
          items: [{ exerciseId: "ex_5P2L5F", name: "Fixed Bar Stretch", durationSeconds: 30, perSide: false,
            note: "Stretch for the shoulders; breathe slowly, no bouncing." }],
        },
        exercises: [
          { order: 1, block: "A", role: "main", pattern: "squat", exerciseId: "ex_NEMYLA", name: "Barbell Full Squat",
            cue: "Keep your chest up and back straight to maintain proper posture and alignment.",
            rationale: "Main lift: squat for the quadriceps and glutes.",
            alternatives: [{ id: "ex_NN32EP", name: "Cable Goblet Squat", equipment: "Cable", model: "male" }] },
          { order: 2, block: "B", role: "main", pattern: "push_horizontal", exerciseId: "ex_SAWOOH", name: "Barbell Bench Press",
            cue: "Keep your feet flat on the floor to maintain stability and support your lower back.",
            rationale: "Main lift: horizontal press for the chest.",
            alternatives: [{ id: "ex_WOZL6H", name: "Push Ups Bodyweight", equipment: "Body Weight", model: "male" }] },
        ],
      },
    ],
    program: [
      { week: 1, block: 1, phase: "accumulation", deload: false,
        guidance: "First week of the block: leave a few reps in reserve and focus on technique.", days: [day(3)] },
      { week: 5, block: 1, phase: "deload", deload: true,
        guidance: "Deload week: lighter loads and fewer sets so you start the next block fresh.", days: [day(4, true)] },
    ],
    exerciseLibrary: [
      exercise("ex_NEMYLA", "lib-squat", "Barbell Full Squat"),
      exercise("ex_SAWOOH", "lib-bench", "Barbell Bench Press"),
      exercise("ex_YOPLC7", "lib-walk", "Treadmill Walk"),
      exercise("ex_5P2L5F", "lib-stretch", "Fixed Bar Stretch"),
    ],
  };
};

describe("v2.workout", () => {
  it("generate maps every param and joins arrays with commas", async () => {
    const fetch = mockFetch({ json: sessionResponse() });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.v2.workout.generate({
      goal: "general_fitness", duration: 15, level: "advanced", equipment: ["dumbbell", "bench"], split: "full_body_b",
      bodyFocus: ["chest", "triceps"], avoidJoints: ["knee", "lumbar_spine"], format: "superset",
      exclude: ["ex_WOZL6H", "ex_KK4RJV"], seed: "abc123", model: "female", lang: "de",
    });

    expect(pathOf(fetch.last())).toBe("/v2/workout/generate");
    expect(queryOf(fetch.last())).toEqual({
      goal: "general_fitness", duration: "15", level: "advanced", equipment: "dumbbell,bench", split: "full_body_b",
      bodyFocus: "chest,triceps", avoidJoints: "knee,lumbar_spine", format: "superset",
      exclude: "ex_WOZL6H,ex_KK4RJV", seed: "abc123", model: "female", lang: "de",
    });
  });

  it("generate passes comma-separated strings through and omits unset params", async () => {
    const fetch = mockFetch({ json: sessionResponse() });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.v2.workout.generate({ equipment: "home", avoidJoints: "shoulder,wrist", exclude: "ex_SAWOOH" });
    expect(queryOf(fetch.last())).toEqual({ equipment: "home", avoidJoints: "shoulder,wrist", exclude: "ex_SAWOOH" });

    await wx.v2.workout.generate({ format: "circuit" });
    expect(queryOf(fetch.last())).toEqual({ format: "circuit" });

    await wx.v2.workout.generate();
    expect(fetch.last().url).toBe("https://api.workoutxapp.com/v2/workout/generate");
  });

  it("program maps params, including seed, format and avoidJoints", async () => {
    const fetch = mockFetch({ json: programResponse() });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.v2.workout.program({
      goal: "general_fitness", level: "beginner", weeks: 16, daysPerWeek: 5, duration: 50,
      equipment: ["barbell", "dumbbell"], avoidJoints: ["shoulder", "elbow"], format: "straight",
      seed: "plan-7", model: "male", lang: "fr",
    });

    expect(pathOf(fetch.last())).toBe("/v2/workout/program");
    expect(queryOf(fetch.last())).toEqual({
      goal: "general_fitness", level: "beginner", weeks: "16", daysPerWeek: "5", duration: "50",
      equipment: "barbell,dumbbell", avoidJoints: "shoulder,elbow", format: "straight",
      seed: "plan-7", model: "male", lang: "fr",
    });

    await wx.v2.workout.program({ avoidJoints: "knee" });
    expect(queryOf(fetch.last())).toEqual({ avoidJoints: "knee" });
  });

  it("generate returns the session: summary, warm-up, blocks with prescriptions, cool-down", async () => {
    const fetch = mockFetch({ json: sessionResponse() });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    const session = await wx.v2.workout.generate({ goal: "muscle_gain", avoidJoints: ["knee"] });

    expect(session).toMatchObject({ seed: "doc1", split: "full_body", format: "superset", estimatedDurationMinutes: 41 });
    expect(session.avoidJoints).toEqual(["knee"]);
    expect(session.circuit).toBeUndefined();
    expect(session.summary.workingSets).toBe(9);
    expect(session.summary.muscles[0]).toEqual({ group: "Quads", sets: 4.5 });
    expect(session.warmup.rampUp).toContain("Dumbbell Front Squat");
    expect(session.warmup.items.map((s) => s.exercise.id)).toEqual(["ex_L4EMF6", "ex_UBH37I"]);

    const [squat, hinge, press] = session.exercises;
    expect(squat).toMatchObject({ block: "A", role: "main", pattern: "squat", reps: "6-8", rir: 2, tempo: "3-0-1-0", load: "70–80% of 1RM" });
    expect(squat?.alternatives[0]).toEqual({ id: "ex_O6QQUL", name: "Bodyweight Full Squat With Overhead Press", equipment: "Body Weight", model: "male" });
    expect([hinge?.block, press?.block]).toEqual(["B1", "B2"]); // a superset
    expect(press?.cue).toBeNull();
    expect(session.cooldown.items[0]?.perSide).toBe(true);
    expect(session.notes?.[0]).toContain("Joint care");
  });

  it("freshMedia reuses links from a session's warm-up, main and cool-down exercises without a request", async () => {
    const fetch = mockFetch((req) =>
      pathOf(req) === "/v2/workout/generate"
        ? { json: sessionResponse() }
        : { json: { id: pathOf(req).split("/")[3], media: media("fetched") } },
    );
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.v2.workout.generate({ seed: "doc1" });

    expect((await wx.v2.freshMedia("ex_L4EMF6"))?.mp4).toContain("s=warm"); // warm-up
    expect((await wx.v2.freshMedia("ex_UBH37I"))?.mp4).toContain("s=warm2"); // warm-up
    expect((await wx.v2.freshMedia("ex_TFXRNX"))?.mp4).toContain("s=main"); // main lift
    expect((await wx.v2.freshMedia("ex_UA3FUQ"))?.mp4).toContain("s=b1"); // superset
    expect((await wx.v2.freshMedia("ex_CWLQWA"))?.mp4).toContain("s=cool"); // cool-down
    expect(fetch.calls).toHaveLength(1);

    // Alternatives are light (no media): their links are fetched.
    expect((await wx.v2.freshMedia("ex_O6QQUL"))?.mp4).toContain("s=fetched");
    expect(pathOf(fetch.last())).toBe("/v2/exercises/ex_O6QQUL/media");
    expect(fetch.calls).toHaveLength(2);
  });

  it("a circuit session carries its timing and rounds", async () => {
    const circuit = {
      ...sessionResponse(), goal: "fat_loss", split: "conditioning", format: "circuit",
      circuit: { rounds: 3, workSeconds: 40, restSeconds: 20, restBetweenRoundsSeconds: 75 },
      exercises: [{
        order: 1, block: "A", role: "conditioning", pattern: "cardio", sets: 1, rounds: 3, durationSeconds: 40,
        perSide: false, restSeconds: 20, cue: null, rationale: "Conditioning: cardio to keep your heart rate up.",
        alternatives: [], exercise: exercise("ex_JJACK1", "jack", "Jumping Jack"),
      }],
    };
    const fetch = mockFetch({ json: circuit });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    const session = await wx.v2.workout.generate({ goal: "fat_loss", format: "circuit" });

    expect(session.circuit).toEqual({ rounds: 3, workSeconds: 40, restSeconds: 20, restBetweenRoundsSeconds: 75 });
    expect(session.exercises[0]).toMatchObject({ rounds: 3, durationSeconds: 40, role: "conditioning" });
    expect(session.exercises[0]?.reps).toBeUndefined();
    expect((await wx.v2.freshMedia("ex_JJACK1"))?.mp4).toContain("s=jack");
    expect(fetch.calls).toHaveLength(1);
  });

  it("program returns schedule, progression, blocks, volume, sessions and weeks that reference the library", async () => {
    const fetch = mockFetch({ json: programResponse() });
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    const program = await wx.v2.workout.program({ weeks: 6, seed: "doc2" });

    expect(program).toMatchObject({ seed: "doc2", weeks: 6, daysPerWeek: 3, sessionDurationMinutes: 60 });
    expect(program.schedule.map((d) => [d.weekday, d.session])).toEqual([["Monday", "A"], ["Wednesday", "B"], ["Friday", "C"]]);
    expect(program.progressionModel.deloadEvery).toBe(5);
    expect(program.blocks[0]).toEqual({ block: 1, weeks: [1, 2, 3, 4, 5], focus: "Foundation", deloadWeek: 5 });
    expect(program.weeklyVolume[1]).toEqual({ group: "Triceps", sets: 9, target: [10, 16], status: "low" });

    const sessionA = program.sessions[0];
    expect(sessionA?.warmup.items[0]?.exerciseId).toBe("ex_YOPLC7");
    expect(sessionA?.exercises[0]).toMatchObject({ pattern: "squat", exerciseId: "ex_NEMYLA", rationale: "Main lift: squat for the quadriceps and glutes." });

    const deload = program.program[1];
    expect(deload).toMatchObject({ week: 5, phase: "deload", deload: true });
    const squat = deload?.days[0]?.exercises[0];
    expect(squat).toMatchObject({ exerciseId: "ex_NEMYLA", sets: 2, rir: 4 });
    expect(squat?.note).toContain("Deload");
    expect(squat).not.toHaveProperty("exercise"); // light refs: the full exercise is in exerciseLibrary

    const library = new Map(program.exerciseLibrary.map((e) => [e.id, e]));
    for (const week of program.program) {
      for (const d of week.days) for (const x of d.exercises) expect(library.has(x.exerciseId)).toBe(true);
    }
  });

  it("freshMedia reuses links from a program's exerciseLibrary without a request", async () => {
    const fetch = mockFetch((req) =>
      pathOf(req) === "/v2/workout/program"
        ? { json: programResponse() }
        : { json: { id: pathOf(req).split("/")[3], media: media("fetched") } },
    );
    const wx = new WorkoutX({ apiKey: "wx_test", fetch });

    await wx.v2.workout.program({ weeks: 6 });

    expect((await wx.v2.freshMedia("ex_NEMYLA"))?.mp4).toContain("s=lib-squat"); // main lift
    expect((await wx.v2.freshMedia("ex_SAWOOH"))?.mp4).toContain("s=lib-bench");
    expect((await wx.v2.freshMedia("ex_YOPLC7"))?.mp4).toContain("s=lib-walk"); // warm-up
    expect((await wx.v2.freshMedia("ex_5P2L5F"))?.mp4).toContain("s=lib-stretch"); // cool-down
    expect(fetch.calls).toHaveLength(1);

    // Not in the library (a swap suggestion): fetched.
    await wx.v2.freshMedia("ex_NN32EP");
    expect(pathOf(fetch.last())).toBe("/v2/exercises/ex_NN32EP/media");
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
