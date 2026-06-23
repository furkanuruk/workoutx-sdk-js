import type { HttpClient } from "../http.js";
import { WorkoutXError } from "../errors.js";
import type {
  Exercise,
  PaginatedList,
  PageParams,
  SearchParams,
  AlternativesParams,
  CalorieEstimate,
  JsonObject,
} from "../types.js";

/** Access to `/v1/exercises/*`. Authenticated with the API key. */
export class ExercisesResource {
  constructor(private readonly http: HttpClient) {}

  /** List exercises (paginated). */
  list(params: PageParams = {}): Promise<PaginatedList<Exercise>> {
    return this.http.request("/v1/exercises", { query: { ...params } });
  }

  /**
   * Look up a single exercise by its exact numeric ID (e.g. "0001").
   *
   * Note: IDs are not sequential — there are gaps. To resolve a human name
   * like "lunges", use {@link byName} instead. See {@link find} for a helper
   * that tries an ID first and falls back to a name search.
   */
  get(id: string): Promise<Exercise> {
    return this.http.request(`/v1/exercises/${encodeURIComponent(id)}`);
  }

  /** Find exercises whose name contains the given text. */
  byName(name: string, params: PageParams = {}): Promise<Exercise[]> {
    return this.http.request(`/v1/exercises/name/${encodeURIComponent(name)}`, {
      query: { ...params },
    });
  }

  /** Filter exercises by body part (e.g. "back"). */
  byBodyPart(bodyPart: string, params: PageParams = {}): Promise<PaginatedList<Exercise>> {
    return this.http.request(`/v1/exercises/bodyPart/${encodeURIComponent(bodyPart)}`, {
      query: { ...params },
    });
  }

  /** Filter exercises by target muscle (e.g. "abs"). */
  byTarget(target: string, params: PageParams = {}): Promise<PaginatedList<Exercise>> {
    return this.http.request(`/v1/exercises/target/${encodeURIComponent(target)}`, {
      query: { ...params },
    });
  }

  /** Filter exercises by equipment (e.g. "barbell"). */
  byEquipment(equipment: string, params: PageParams = {}): Promise<PaginatedList<Exercise>> {
    return this.http.request(`/v1/exercises/equipment/${encodeURIComponent(equipment)}`, {
      query: { ...params },
    });
  }

  /** Multi-filter search (plan-gated: requires the `multiFilter` feature). */
  search(params: SearchParams = {}): Promise<PaginatedList<Exercise>> {
    return this.http.request("/v1/exercises/search", { query: { ...params } });
  }

  /** Exercises similar to the given exercise ID. */
  similar(id: string, params: PageParams = {}): Promise<PaginatedList<Exercise>> {
    return this.http.request(`/v1/exercises/${encodeURIComponent(id)}/similar`, {
      query: { ...params },
    });
  }

  /** Alternatives that hit the same target with different equipment. */
  alternatives(id: string, params: AlternativesParams = {}): Promise<PaginatedList<Exercise>> {
    return this.http.request(`/v1/exercises/${encodeURIComponent(id)}/alternatives`, {
      query: { ...params },
    });
  }

  /** Estimated calories burned for an exercise. */
  calories(id: string, params: JsonObject = {}): Promise<CalorieEstimate> {
    return this.http.request(`/v1/exercises/${encodeURIComponent(id)}/calories`, {
      query: { ...params } as never,
    });
  }

  /** Dataset changelog (plan-gated: requires the `datasetSync` feature). */
  changes(params: JsonObject = {}): Promise<JsonObject> {
    return this.http.request("/v1/exercises/changes", { query: { ...params } as never });
  }

  /** List of all body parts. */
  bodyPartList(): Promise<string[]> {
    return this.http.request("/v1/exercises/bodyPartList");
  }

  /** List of all target muscles. */
  targetList(): Promise<string[]> {
    return this.http.request("/v1/exercises/targetList");
  }

  /** List of all equipment types. */
  equipmentList(): Promise<string[]> {
    return this.http.request("/v1/exercises/equipmentList");
  }

  /** List of all secondary muscles. */
  secondaryMuscleList(): Promise<string[]> {
    return this.http.request("/v1/exercises/secondaryMuscleList");
  }

  /**
   * Convenience resolver: treat `idOrName` as an ID first, and if that 404s,
   * fall back to a name search and return the first match. Saves callers from
   * the common "/v1/exercises/lunges → 404" mistake.
   *
   * Returns `null` when neither an ID nor a name match is found.
   */
  async find(idOrName: string): Promise<Exercise | null> {
    try {
      return await this.get(idOrName);
    } catch (err) {
      if (!(err instanceof WorkoutXError) || !err.isNotFound) throw err;
    }
    const matches = await this.byName(idOrName, { limit: 1 });
    return matches[0] ?? null;
  }
}
