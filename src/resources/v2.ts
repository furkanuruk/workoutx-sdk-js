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

export type V2WorkoutGoal = "muscle_gain" | "strength" | "fat_loss" | "endurance" | "mobility";
export type V2WorkoutLevel = "beginner" | "intermediate" | "advanced";
export type V2WorkoutSplit =
  | "full_body" | "upper" | "lower" | "push" | "pull" | "legs" | "push_pull_legs" | "upper_lower" | "core";

/** Params for {@link V2WorkoutResource.generate}. Arrays are sent comma-separated. */
export interface V2WorkoutGenerateParams {
  /** Default "muscle_gain". */
  goal?: V2WorkoutGoal;
  /** Minutes, 20 to 120. Default 45. */
  duration?: number;
  /** Default "intermediate". */
  level?: V2WorkoutLevel;
  /** e.g. ["barbell", "dumbbell"] or "barbell,dumbbell". Omit for any. */
  equipment?: string | readonly string[];
  /** Default "full_body". Ignored when `bodyFocus` is given. */
  split?: V2WorkoutSplit;
  /** Body parts, targets or aliases (core, legs, arms), e.g. ["chest", "back"]. */
  bodyFocus?: string | readonly string[];
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
  /** 2 to 12. Default 4. */
  weeks?: number;
  /** 2 to 6; sets the weekly split. Default 3. */
  daysPerWeek?: number;
  /** Minutes per session, 20 to 120. Default 60. */
  duration?: number;
  /** e.g. ["barbell", "dumbbell"] or "barbell,dumbbell". Omit for any. */
  equipment?: string | readonly string[];
  /** Default "male". */
  model?: "male" | "female";
  /** Translates the exercises. */
  lang?: V2Lang;
}

/** One exercise of a workout or program day. */
export interface WorkoutExerciseV2 {
  order: number;
  sets: number;
  /** e.g. "6-8". */
  reps: string;
  restSeconds: number;
  note?: string;
  /** Programs only, e.g. "RPE 8". */
  intensity?: string;
  /** Generator only: the requested `bodyFocus` values this exercise covers. */
  matchedFocus?: string[];
  /** A full v2 exercise with media links. */
  exercise: ExerciseV2;
}

/** Warm-up or cool-down step. */
export interface WorkoutStepV2 {
  activity: string;
  durationMinutes: number;
  note: string;
}

/** A generated workout: the v1 response plus `model`, built from v2 exercises. */
export interface WorkoutV2 {
  goal: string;
  level: string;
  model: "male" | "female";
  /** Pass it back as `seed` to get the same workout. */
  seed: string;
  split: string;
  bodyFocus: string[];
  resolvedBodyFocus: string[];
  equipment: string[];
  /** Present when the request was too narrow and constraints were loosened. */
  filtersRelaxed?: string[];
  /** Present when requested focus values got no exercise. */
  bodyFocusUncovered?: string[];
  totalExercises: number;
  estimatedDurationMinutes: number;
  warmup: WorkoutStepV2[];
  exercises: WorkoutExerciseV2[];
  cooldown: WorkoutStepV2[];
  [key: string]: unknown;
}

/** One training day of a program week. */
export interface ProgramDayV2 {
  day: number;
  /** The split day, e.g. "push". */
  focus: string;
  exercises: WorkoutExerciseV2[];
}

/** One week of a program. */
export interface ProgramWeekV2 {
  week: number;
  phase: "accumulation" | "intensification" | "deload";
  /** e.g. "RPE 7". */
  intensity: string;
  deload: boolean;
  guidance: string;
  days: ProgramDayV2[];
}

/** A multi-week program: the v1 response plus `model`, built from v2 exercises. */
export interface ProgramV2 {
  goal: string;
  level: string;
  model: "male" | "female";
  weeks: number;
  daysPerWeek: number;
  /** One focus per training day, e.g. ["push", "pull", "legs"]. */
  split: string[];
  equipment: string[];
  progressionModel: string;
  sessionDurationMinutes: number;
  program: ProgramWeekV2[];
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
  /** `/v2/workout/*`: workout generator and multi-week programs on v2 exercises. */
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
   * media, similar, alternatives, workout.generate and workout.program) until
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
 * `/v2/workout/*`: the workout generator on v2 exercises. Every `exercise` in a
 * result is a full v2 exercise with media links; `v2.freshMedia` reuses them.
 */
export class V2WorkoutResource {
  constructor(
    private readonly http: HttpClient,
    private readonly remember: (e: ExerciseV2 | null | undefined) => void,
  ) {}

  /** Generate a single workout (Growth, Scale; legacy Pro and Ultra). */
  async generate(params: V2WorkoutGenerateParams = {}): Promise<WorkoutV2> {
    const workout = await this.http.request<WorkoutV2>("/v2/workout/generate", {
      query: {
        ...params,
        equipment: csv(params.equipment),
        bodyFocus: csv(params.bodyFocus),
        exclude: csv(params.exclude),
      },
    });
    for (const e of workout.exercises ?? []) this.remember(e.exercise);
    return workout;
  }

  /** Generate a multi-week program (Scale; legacy Ultra). */
  async program(params: V2WorkoutProgramParams = {}): Promise<ProgramV2> {
    const program = await this.http.request<ProgramV2>("/v2/workout/program", {
      query: { ...params, equipment: csv(params.equipment) },
    });
    for (const week of program.program ?? []) {
      for (const day of week.days ?? []) {
        for (const e of day.exercises ?? []) this.remember(e.exercise);
      }
    }
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
