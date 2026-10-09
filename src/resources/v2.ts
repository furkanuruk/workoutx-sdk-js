import type { HttpClient } from "../http.js";

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
  limit?: number;
  offset?: number;
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

/** Links are refreshed when they have less than this left. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** Access to `/v2/*`: the new exercise catalog with signed media links. */
export class V2Resource {
  private readonly mediaCache = new Map<string, MediaLinks>();

  constructor(private readonly http: HttpClient) {}

  /** Search the catalog. All filters are optional and case-insensitive. */
  async list(params: V2SearchParams = {}): Promise<V2Page> {
    const page = await this.http.request<V2Page>("/v2/exercises", { query: { ...params } });
    for (const e of page.results) this.remember(e);
    return page;
  }

  async get(id: string): Promise<ExerciseV2> {
    const e = await this.http.request<ExerciseV2>(`/v2/exercises/${encodeURIComponent(id)}`);
    this.remember(e);
    return e;
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
   * Links you can use right now. Reuses links fetched earlier (by list/get/media)
   * until they are close to expiry, then fetches new ones. Call this when you
   * display an exercise.
   */
  async freshMedia(id: string): Promise<MediaLinks | null> {
    const cached = this.mediaCache.get(id);
    if (cached && Date.parse(cached.expiresAt) - Date.now() > REFRESH_MARGIN_MS) return cached;
    return this.media(id);
  }

  /** Map a v1 exercise id (e.g. "0025") to its v2 exercise. */
  legacy(v1Id: string): Promise<LegacyLookup> {
    return this.http.request(`/v2/exercises/legacy/${encodeURIComponent(v1Id)}`);
  }

  bodyParts(): Promise<VocabEntry[]> { return this.http.request("/v2/bodyParts"); }
  targets(): Promise<VocabEntry[]> { return this.http.request("/v2/targets"); }
  equipment(): Promise<VocabEntry[]> { return this.http.request("/v2/equipment"); }
  categories(): Promise<VocabEntry[]> { return this.http.request("/v2/categories"); }
  muscles(): Promise<VocabEntry[]> { return this.http.request("/v2/muscles"); }

  private remember(e: ExerciseV2): void {
    if (e?.media) this.mediaCache.set(e.id, e.media);
  }
}
