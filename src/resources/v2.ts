import type { HttpClient } from "../http.js";
import type { JsonObject, Supplement } from "../types.js";

/**
 * Language for `lang`: translates names, instructions, tips, muscles and terms.
 * Filters always take the English values.
 */
export type V2Lang = "en" | "tr" | "de" | "es" | "fr" | "zh-SG" | "zh-HK";

/** Signed, expiring media links. Never store these: store the exercise id. */
export interface MediaLinks {
  /** ISO time after which the links stop working (about 24 h after issue). */
  expiresAt: string;
  mediaVersion: number;
  /** True on the Free plan (360p previews with a watermark). */
  watermarked: boolean;
  /** 720p MP4 loop (600x720); 360p watermarked on Free. Best choice for apps. */
  mp4: string;
  /** Still frame for lists and placeholders. */
  poster: string;
}

export interface MuscleV2 {
  group: string;
  anatomical: string[];
}

/** An exercise from the v2 catalog. Male and female versions are separate exercises. */
export interface ExerciseV2 {
  id: string;
  name: string;
  model: "male" | "female";
  /** The same movement with the other model, when it exists. */
  counterpartId: string | null;
  category: string;
  bodyPart: string;
  target: string;
  equipment: string;
  equipmentDetail: string[];
  apparatus: string[];
  primaryMuscles: MuscleV2[];
  secondaryMuscles: MuscleV2[];
  instructions: string[];
  tips: string[];
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  mechanic: "compound" | "isolation";
  force: "push" | "pull" | "static" | "carry";
  isUnilateral: boolean;
  met: number;
  caloriesPerMinute: number;
  recommendedSets: string;
  recommendedReps: string;
  loopSeconds: number | null;
  /** v1 ids this exercise replaces. */
  legacyIds: string[];
  /** Joint the target muscle acts through (derived, not clinical advice). Null for cardio. */
  jointFocus?: string | null;
  /** Exertion band derived from `met`. */
  intensityLevel?: "gentle" | "moderate" | "vigorous";
  /** Descriptive tags, e.g. "joint-friendly". */
  movementTags?: string[];
  /** Present when the exercise was translated with `lang`. */
  lang?: V2Lang;
  /**
   * Null if media isn't configured on the server, or if the exercise is past
   * the plan's distinct-exercise limit (then `mediaLimitReached` is true).
   */
  media: MediaLinks | null;
  /** True when your plan's limit of different exercises per 30 days is used up. */
  mediaLimitReached?: boolean;
}

export interface V2SearchParams {
  bodyPart?: string;
  target?: string;
  equipment?: string;
  category?: string;
  model?: "male" | "female";
  difficulty?: string;
  mechanic?: string;
  force?: string;
  /** Primary or secondary muscle group, e.g. "Glutes". */
  muscle?: string;
  /** Substring of the exercise name. */
  name?: string;
  /** Joint & Rehab filter (Growth, Scale, legacy Ultra), e.g. "knee". */
  jointFocus?: string;
  /** Joint & Rehab filter (Growth, Scale, legacy Ultra): "gentle", "moderate" or "vigorous". */
  intensityLevel?: string;
  /** Joint & Rehab filter (Growth, Scale, legacy Ultra), e.g. "joint-friendly". */
  movementTag?: string;
  lang?: V2Lang;
  limit?: number;
  offset?: number;
}

/** `lang` for single-exercise lookups. */
export interface V2LangParams {
  lang?: V2Lang;
}

export interface V2Page {
  total: number;
  limit: number;
  offset: number;
  results: ExerciseV2[];
}

export interface LegacyLookup {
  v1Id: string;
  v1Name: string;
  /** exact / equivalent: same movement. alternative / closest: a suggested substitute. */
  match: "exact" | "equivalent" | "alternative" | "closest" | "none";
  exercise: ExerciseV2 | null;
}

export interface VocabEntry {
  value: string;
  count: number;
}

/** Params for {@link V2Resource.similar}. */
export interface V2SimilarParams {
  /** "male" / "female": that model only. "any": one clip per movement. Default: the exercise's model. */
  model?: "male" | "female" | "any";
  limit?: number;
  offset?: number;
  lang?: V2Lang;
}

/** Params for {@link V2Resource.alternatives}. */
export interface V2AlternativesParams extends V2SimilarParams {
  /** Prefer this equipment (ranked first, not a filter). */
  equipment?: string;
  /** Leave out this equipment instead of the exercise's own. */
  excludeEquipment?: string;
}

/** A full v2 exercise in a ranked list, with its score. */
export interface RankedExerciseV2 extends ExerciseV2 {
  /** Higher is closer. */
  score: number;
}

/** A ranked page from {@link V2Resource.similar} or {@link V2Resource.alternatives}. */
export interface V2RankedPage {
  /** The exercise the list was built for. */
  exerciseId: string;
  /** The model filter applied. */
  model: "male" | "female" | "any";
  total: number;
  limit: number;
  offset: number;
  results: RankedExerciseV2[];
}

/** Params for {@link V2Resource.calories}. */
export interface V2CaloriesParams {
  /** Body weight in kg. Default 70. */
  weightKg?: number;
  /** Duration in minutes. Default 10. */
  minutes?: number;
  /** Translates name, bodyPart and target. */
  lang?: V2Lang;
}

/** Calorie estimate from {@link V2Resource.calories}. */
export interface CalorieEstimateV2 {
  id: string;
  name: string;
  model: "male" | "female";
  bodyPart: string;
  target: string;
  weightKg: number;
  minutes: number;
  met: number;
  /** kcal per minute at 70 kg (MET x 3.5 x 70 / 200). */
  baseKcalPerMin: number;
  /** kcal per minute scaled to `weightKg`. */
  kcalPerMin: number;
  totalKcal: number;
  note: string;
  /** Present when translated with `lang`. */
  lang?: V2Lang;
}

export type V2WorkoutGoal = "muscle_gain" | "strength" | "fat_loss" | "endurance" | "mobility" | "general_fitness";
export type V2WorkoutLevel = "beginner" | "intermediate" | "advanced";
/**
 * Session templates for {@link V2WorkoutGenerateParams.split}. The `_b` and `_c`
 * variants lead with other lifts, for a second or third day of the same split.
 * v1's "push_pull_legs" and "upper_lower" still work.
 */
export type V2WorkoutSplit =
  | "full_body" | "full_body_b" | "full_body_c"
  | "upper" | "upper_b" | "lower" | "lower_b"
  | "push" | "push_b" | "pull" | "pull_b" | "legs" | "legs_b"
  | "core" | "conditioning" | "mobility"
  | "push_pull_legs" | "upper_lower";
/** Joints for `avoidJoints`. General guidance, not medical advice. */
export type V2WorkoutJoint = "knee" | "shoulder" | "lumbar_spine" | "elbow" | "wrist" | "hip" | "ankle";
/**
 * How exercises are grouped. "auto" (default): circuit for fat_loss and
 * endurance, straight sets for strength and mobility, otherwise supersets for
 * sessions up to 60 minutes.
 */
export type V2WorkoutFormat = "auto" | "straight" | "superset" | "circuit";
/** The format a response actually uses (never "auto"). */
export type V2WorkoutResolvedFormat = Exclude<V2WorkoutFormat, "auto">;
export type V2WorkoutRole = "main" | "secondary" | "accessory" | "core" | "conditioning" | "mobility";

/** Params for {@link V2WorkoutResource.generate}. Arrays are sent comma-separated. */
export interface V2WorkoutGenerateParams {
  /** Default "muscle_gain". */
  goal?: V2WorkoutGoal;
  /** Minutes, 15 to 120. Default 45. */
  duration?: number;
  /** Default "intermediate". */
  level?: V2WorkoutLevel;
  /**
   * e.g. ["barbell", "dumbbell", "bench"], or a preset: "gym" (everything),
   * "home" (body weight, dumbbell, kettlebell, band, bench) or "bodyweight".
   * Omit for a full gym. Body weight is always allowed.
   */
  equipment?: string | readonly string[];
  /** Default "full_body" ("conditioning" for fat_loss and endurance, "mobility" for mobility). Ignored when `bodyFocus` is given. */
  split?: V2WorkoutSplit;
  /** Body parts, muscles or aliases, e.g. ["chest", "back"] or "glutes,hamstrings". Overrides `split`. */
  bodyFocus?: string | readonly string[];
  /** Joints to protect, e.g. ["knee", "lumbar_spine"]: high-stress movements are left out, moderate ones get lighter loads. */
  avoidJoints?: string | readonly V2WorkoutJoint[];
  /** Default "auto". */
  format?: V2WorkoutFormat;
  /** v2 exercise ids to leave out; their other-model clips are left out too. */
  exclude?: string | readonly string[];
  /** Same seed and params, same workout. Every response carries the seed it used. */
  seed?: string | number;
  /** Default "male". A movement that exists only in the other model is used in that model. */
  model?: "male" | "female";
  /** Translates the exercises; the rest of the plan stays English. */
  lang?: V2Lang;
}

/** Params for {@link V2WorkoutResource.program}. Arrays are sent comma-separated. */
export interface V2WorkoutProgramParams {
  /** Default "muscle_gain". */
  goal?: V2WorkoutGoal;
  /** Default "intermediate". */
  level?: V2WorkoutLevel;
  /** 2 to 16. Default 4. */
  weeks?: number;
  /** 2 to 6; sets the weekly split. Default 3. */
  daysPerWeek?: number;
  /** Minutes per session, 20 to 120. Default 60. */
  duration?: number;
  /** As for {@link V2WorkoutGenerateParams.equipment}. Omit for a full gym. */
  equipment?: string | readonly string[];
  /** Joints to protect, e.g. ["shoulder"]. */
  avoidJoints?: string | readonly V2WorkoutJoint[];
  /** Default "auto". */
  format?: V2WorkoutFormat;
  /** Same seed and params, same program. Every response carries the seed it used. */
  seed?: string | number;
  /** Default "male". */
  model?: "male" | "female";
  /** Translates the exercises. */
  lang?: V2Lang;
}

/** A swap suggestion with the same movement pattern. No media: fetch it with `v2.get(id)` when the user swaps. */
export interface WorkoutAlternativeV2 {
  id: string;
  name: string;
  equipment: string;
  model: "male" | "female";
}

/** Sets, reps and effort for one exercise, in a session or a program day. */
export interface WorkoutPrescriptionV2 {
  /** 1-based position in the session. */
  order: number;
  /**
   * "A", "B", …. The same letter with a number ("C1", "C2") is a superset; one
   * letter for every station is a circuit.
   */
  block: string;
  role: V2WorkoutRole;
  sets: number;
  /** Circuits only: rounds through the circuit. */
  rounds?: number;
  /** e.g. "6-8". Timed work has `durationSeconds` instead. */
  reps?: string;
  durationSeconds?: number;
  /** Reps or seconds are for each side. */
  perSide: boolean;
  restSeconds: number;
  /** Reps in reserve: end each set this many reps short of failure. */
  rir?: number;
  /** e.g. "3-0-1-0": seconds lowering, pause, lifting, pause. */
  tempo?: string;
  /** e.g. "70–80% of 1RM". */
  load?: string;
  note?: string;
}

/** One exercise of a generated session. */
export interface WorkoutExerciseV2 extends WorkoutPrescriptionV2 {
  /**
   * Movement pattern, e.g. "squat", "hinge", "push_horizontal", "push_vertical",
   * "pull_horizontal", "pull_vertical", "lunge", "chest_fly", "shoulder_iso",
   * "rear_delt", "biceps", "triceps", "core_stability", "cardio", "stretch", "yoga".
   */
  pattern: string;
  /** The first form tip, or null. */
  cue: string | null;
  /** Why it is in the session, e.g. "Main lift: squat for the quadriceps and glutes." */
  rationale: string;
  alternatives: WorkoutAlternativeV2[];
  /** A full v2 exercise with media links. */
  exercise: ExerciseV2;
}

/** A warm-up or cool-down item of a generated session. */
export interface WorkoutStepV2 {
  durationSeconds: number;
  /** `durationSeconds` is for each side. */
  perSide: boolean;
  note: string;
  /** A full v2 exercise with media links. */
  exercise: ExerciseV2;
}

export interface WorkoutWarmupV2 {
  minutes: number;
  /** Ramp-up sets before the first main lift, e.g. "Before Barbell Full Squat: 2 ramp-up sets at …". */
  rampUp?: string;
  items: WorkoutStepV2[];
}

export interface WorkoutCooldownV2 {
  minutes: number;
  items: WorkoutStepV2[];
}

/** Totals for a generated session. */
export interface WorkoutSummaryV2 {
  totalExercises: number;
  /** Sets times rounds, over every exercise. */
  workingSets: number;
  /** Movement patterns in the session, in order. */
  patterns: string[];
  /** Sets per muscle group, most first (secondary muscles count half). */
  muscles: { group: string; sets: number }[];
}

/** Circuit timing; present when `format` is "circuit". */
export interface WorkoutCircuitV2 {
  rounds: number;
  workSeconds: number;
  restSeconds: number;
  restBetweenRoundsSeconds: number;
}

/** A session from `/v2/workout/generate`, built from movement patterns. */
export interface WorkoutV2 {
  goal: V2WorkoutGoal;
  level: V2WorkoutLevel;
  model: "male" | "female";
  /** Pass it back as `seed` to get the same workout. */
  seed: string;
  /** The template used, e.g. "full_body"; "custom" for `bodyFocus`. */
  split: string;
  format: V2WorkoutResolvedFormat;
  targetDurationMinutes: number;
  estimatedDurationMinutes: number;
  /** Equipment allowed, or ["any"] for a full gym. */
  equipment: string[];
  /** The joints you asked to protect. */
  avoidJoints?: V2WorkoutJoint[];
  /** Present when `format` is "circuit". */
  circuit?: WorkoutCircuitV2;
  summary: WorkoutSummaryV2;
  warmup: WorkoutWarmupV2;
  exercises: WorkoutExerciseV2[];
  cooldown: WorkoutCooldownV2;
  /** e.g. joint-care guidance, or why nothing fit the filters. */
  notes?: string[];
  [key: string]: unknown;
}

/** One training day of the weekly schedule. */
export interface ProgramScheduleDayV2 {
  day: number;
  /** "Monday" … "Sunday". */
  weekday: string;
  /** The session template, "A", "B", …. */
  session: string;
  /** e.g. "Upper (horizontal push and pull)". */
  name: string;
}

export interface ProgramProgressionV2 {
  name: string;
  summary: string;
  /** How to progress from session to session. */
  rule: string;
  /** Weeks per block (a deload week ends each block), or null when the program has no deloads. */
  deloadEvery: number | null;
}

export interface ProgramBlockV2 {
  block: number;
  weeks: number[];
  /** "Foundation" or "Progression"; strength programs: "Volume", "Strength" or "Peak". */
  focus: string;
  deloadWeek?: number;
}

/** Weekly working sets for a muscle group in a normal week, against a target range. */
export interface ProgramVolumeV2 {
  group: string;
  sets: number;
  /** [low, high] sets per week. */
  target: [number, number];
  status: "low" | "ok" | "high";
}

/** A warm-up or cool-down item of a program session. `exerciseId` is in `exerciseLibrary`. */
export interface ProgramStepV2 {
  exerciseId: string;
  name: string;
  durationSeconds: number;
  perSide: boolean;
  note: string;
}

/** An exercise of a session template. Week-by-week prescriptions are in `program`. */
export interface ProgramSessionExerciseV2 {
  order: number;
  block: string;
  role: V2WorkoutRole;
  pattern: string;
  /** In `exerciseLibrary`. */
  exerciseId: string;
  name: string;
  cue: string | null;
  rationale: string;
  alternatives: WorkoutAlternativeV2[];
}

/** A session template ("A", "B", …) of a program. */
export interface ProgramSessionV2 {
  session: string;
  name: string;
  split: string;
  /** Fat-loss and endurance programs mix strength days and conditioning circuits. */
  goal: V2WorkoutGoal;
  format: V2WorkoutResolvedFormat;
  estimatedDurationMinutes: number;
  warmup: { minutes: number; rampUp?: string; items: ProgramStepV2[] };
  cooldown: { minutes: number; items: ProgramStepV2[] };
  exercises: ProgramSessionExerciseV2[];
  notes?: string[];
}

/**
 * One exercise of a program day: this week's prescription. `exerciseId` is in
 * `exerciseLibrary`; accessories can rotate to an alternative from block 2.
 */
export interface ProgramExerciseV2 extends WorkoutPrescriptionV2 {
  exerciseId: string;
  name: string;
}

/** One training day of a program week. */
export interface ProgramDayV2 {
  day: number;
  weekday: string;
  session: string;
  name: string;
  exercises: ProgramExerciseV2[];
}

/** One week of a program. */
export interface ProgramWeekV2 {
  week: number;
  block: number;
  phase: "accumulation" | "intensification" | "deload" | "test";
  deload: boolean;
  guidance: string;
  days: ProgramDayV2[];
}

/**
 * A multi-week program from `/v2/workout/program`: session templates,
 * periodised weeks with deloads, and every exercise once in `exerciseLibrary`.
 */
export interface ProgramV2 {
  goal: V2WorkoutGoal;
  level: V2WorkoutLevel;
  model: "male" | "female";
  /** Pass it back as `seed` to get the same program. */
  seed: string;
  weeks: number;
  daysPerWeek: number;
  sessionDurationMinutes: number;
  /** Equipment allowed, or ["any"] for a full gym. */
  equipment: string[];
  avoidJoints?: V2WorkoutJoint[];
  schedule: ProgramScheduleDayV2[];
  progressionModel: ProgramProgressionV2;
  blocks: ProgramBlockV2[];
  /** Empty for goals without volume targets. */
  weeklyVolume: ProgramVolumeV2[];
  sessions: ProgramSessionV2[];
  program: ProgramWeekV2[];
  /** Every exercise used above, once, as a full v2 exercise with media links. */
  exerciseLibrary: ExerciseV2[];
  [key: string]: unknown;
}

/** Params for {@link V2SupplementsResource.list}. */
export interface V2SupplementListParams {
  /** See {@link V2SupplementsResource.filters}. */
  category?: string;
  goal?: string;
  timing?: string;
  /** "strong", "moderate" or "emerging". */
  evidence?: string;
  /** Name, summary or category. */
  search?: string;
  /** Default: the whole list. */
  limit?: number;
  offset?: number;
}

export interface V2SupplementPage {
  total: number;
  limit: number;
  offset: number;
  results: Supplement[];
  /** Informational content only, not medical advice. */
  disclaimer: string;
}

/** Params for {@link V2SupplementsResource.forExercise}. */
export interface V2ForExerciseParams {
  /** 1 to 20. Default 6. */
  limit?: number;
  /** Translates the exercise summary. */
  lang?: V2Lang;
}

/** Params for {@link V2SupplementsResource.stack}. */
export interface V2SupplementStackParams {
  /** e.g. "muscle_gain", "strength", "fat_loss", "recovery". */
  goal: string;
  /** Stack size: 3, 5 or 8 supplements. Default "standard". */
  level?: "essential" | "standard" | "comprehensive";
}

/** "a,b" from ["a", "b"]; strings pass through. */
const csv = (v: string | readonly string[] | undefined): string | undefined =>
  typeof v === "string" || v === undefined ? v : v.join(",");

/** Links are refreshed when they have less than this left. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** Access to `/v2/*`: the new exercise catalog with signed media links. */
export class V2Resource {
  /** `/v2/workout/*`: sessions and multi-week programs on v2 exercises. */
  readonly workout: V2WorkoutResource;
  /** `/v2/supplements/*`: supplements, stacks and picks for a v2 exercise. */
  readonly supplements: V2SupplementsResource;

  private readonly mediaCache = new Map<string, MediaLinks>();

  constructor(private readonly http: HttpClient) {
    this.workout = new V2WorkoutResource(http, (e) => this.remember(e));
    this.supplements = new V2SupplementsResource(http);
  }

  /**
   * Search the catalog. All filters are optional and case-insensitive. The
   * Joint & Rehab filters (`jointFocus`, `intensityLevel`, `movementTag`) need
   * Growth or Scale (legacy Ultra).
   */
  async list(params: V2SearchParams = {}): Promise<V2Page> {
    const page = await this.http.request<V2Page>("/v2/exercises", { query: { ...params } });
    for (const e of page.results) this.remember(e);
    return page;
  }

  async get(id: string, params: V2LangParams = {}): Promise<ExerciseV2> {
    const e = await this.http.request<ExerciseV2>(`/v2/exercises/${encodeURIComponent(id)}`, {
      query: { ...params },
    });
    this.remember(e);
    return e;
  }

  /**
   * Similar exercises, best first: same target, body part or primary muscles
   * (all plans). Never contains the exercise itself or its other-model clip.
   */
  async similar(id: string, params: V2SimilarParams = {}): Promise<V2RankedPage> {
    const page = await this.http.request<V2RankedPage>(`/v2/exercises/${encodeURIComponent(id)}/similar`, {
      query: { ...params },
    });
    for (const e of page.results) this.remember(e);
    return page;
  }

  /** Same target muscle, different equipment, best first (all plans). */
  async alternatives(id: string, params: V2AlternativesParams = {}): Promise<V2RankedPage> {
    const page = await this.http.request<V2RankedPage>(`/v2/exercises/${encodeURIComponent(id)}/alternatives`, {
      query: { ...params },
    });
    for (const e of page.results) this.remember(e);
    return page;
  }

  /** Estimated calories burned (all plans). Defaults: 70 kg, 10 minutes. */
  calories(id: string, params: V2CaloriesParams = {}): Promise<CalorieEstimateV2> {
    return this.http.request(`/v2/exercises/${encodeURIComponent(id)}/calories`, {
      query: { ...params },
    });
  }

  /** Fresh signed links for one exercise. */
  async media(id: string): Promise<MediaLinks | null> {
    const res = await this.http.request<{ id: string; media: MediaLinks | null }>(
      `/v2/exercises/${encodeURIComponent(id)}/media`,
    );
    if (res.media) this.mediaCache.set(id, res.media);
    return res.media;
  }

  /**
   * Links you can use right now. Reuses links fetched earlier (by list, get,
   * media, similar, alternatives, workout.generate and workout.program, including
   * warm-up and cool-down exercises and a program's `exerciseLibrary`) until
   * they are close to expiry, then fetches new ones. Call this when you
   * display an exercise.
   */
  async freshMedia(id: string): Promise<MediaLinks | null> {
    const cached = this.mediaCache.get(id);
    if (cached && Date.parse(cached.expiresAt) - Date.now() > REFRESH_MARGIN_MS) return cached;
    return this.media(id);
  }

  /** Map a v1 exercise id (e.g. "0025") to its v2 exercise. */
  legacy(v1Id: string, params: V2LangParams = {}): Promise<LegacyLookup> {
    return this.http.request(`/v2/exercises/legacy/${encodeURIComponent(v1Id)}`, { query: { ...params } });
  }

  bodyParts(): Promise<VocabEntry[]> { return this.http.request("/v2/bodyParts"); }
  targets(): Promise<VocabEntry[]> { return this.http.request("/v2/targets"); }
  equipment(): Promise<VocabEntry[]> { return this.http.request("/v2/equipment"); }
  categories(): Promise<VocabEntry[]> { return this.http.request("/v2/categories"); }
  muscles(): Promise<VocabEntry[]> { return this.http.request("/v2/muscles"); }

  private remember(e: ExerciseV2 | null | undefined): void {
    if (e?.media) this.mediaCache.set(e.id, e.media);
  }
}

/**
 * `/v2/workout/*`: sessions and multi-week programs built from movement
 * patterns on v2 exercises. The media links of every full exercise in a result
 * (session exercises, warm-up and cool-down items, a program's
 * `exerciseLibrary`) are kept for `v2.freshMedia`.
 */
export class V2WorkoutResource {
  constructor(
    private readonly http: HttpClient,
    private readonly remember: (e: ExerciseV2 | null | undefined) => void,
  ) {}

  /**
   * Generate one session (Growth, Scale; legacy Pro and Ultra): warm-up, main
   * work in straight sets, supersets or a circuit, and cool-down.
   */
  async generate(params: V2WorkoutGenerateParams = {}): Promise<WorkoutV2> {
    const workout = await this.http.request<WorkoutV2>("/v2/workout/generate", {
      query: {
        ...params,
        equipment: csv(params.equipment),
        bodyFocus: csv(params.bodyFocus),
        avoidJoints: csv(params.avoidJoints),
        exclude: csv(params.exclude),
      },
    });
    for (const x of workout.exercises ?? []) this.remember(x.exercise);
    for (const step of workout.warmup?.items ?? []) this.remember(step.exercise);
    for (const step of workout.cooldown?.items ?? []) this.remember(step.exercise);
    return workout;
  }

  /**
   * Generate a multi-week program (Scale; legacy Ultra): session templates,
   * periodised weeks with deloads, and every exercise once in `exerciseLibrary`.
   * Exercises in `sessions` and `program` reference the library by `exerciseId`.
   */
  async program(params: V2WorkoutProgramParams = {}): Promise<ProgramV2> {
    const program = await this.http.request<ProgramV2>("/v2/workout/program", {
      query: { ...params, equipment: csv(params.equipment), avoidJoints: csv(params.avoidJoints) },
    });
    for (const e of program.exerciseLibrary ?? []) this.remember(e);
    return program;
  }
}

/**
 * `/v2/supplements/*`: the supplement data on API v2 (Growth, Scale; legacy Pro
 * and Ultra). Exercise lookups take v2 exercise ids. Informational content only.
 */
export class V2SupplementsResource {
  constructor(private readonly http: HttpClient) {}

  /** List supplements, strongest evidence first. Default: the whole list. */
  list(params: V2SupplementListParams = {}): Promise<V2SupplementPage> {
    return this.http.request("/v2/supplements", { query: { ...params } });
  }

  /** Filter values with counts. */
  filters(): Promise<JsonObject> {
    return this.http.request("/v2/supplements/filters");
  }

  /** One supplement by id, e.g. "creatine-monohydrate". */
  get(id: string): Promise<Supplement> {
    return this.http.request(`/v2/supplements/${encodeURIComponent(id)}`);
  }

  /** Supplements relevant to a v2 exercise (e.g. "ex_SAWOOH"), strongest evidence first. */
  forExercise(exerciseId: string, params: V2ForExerciseParams = {}): Promise<JsonObject> {
    return this.http.request(`/v2/supplements/exercise/${encodeURIComponent(exerciseId)}`, {
      query: { ...params },
    });
  }

  /** A goal-based stack with a timing guide (Scale; legacy Ultra). */
  stack(params: V2SupplementStackParams): Promise<JsonObject> {
    return this.http.request("/v2/supplements/stack", { query: { ...params } });
  }
}
