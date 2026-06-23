import type { HttpClient } from "../http.js";
import type { Supplement, PageParams, JsonObject } from "../types.js";

/** Access to `/v1/supplements/*`. Authenticated with the API key. */
export class SupplementsResource {
  constructor(private readonly http: HttpClient) {}

  /** List supplements (paginated). */
  list(params: PageParams = {}): Promise<JsonObject> {
    return this.http.request("/v1/supplements", { query: { ...params } });
  }

  /** Available supplement filters. */
  filters(): Promise<JsonObject> {
    return this.http.request("/v1/supplements/filters");
  }

  /** Build a recommended stack (plan-gated: requires `supplementStacks`). */
  stack(params: JsonObject = {}): Promise<JsonObject> {
    return this.http.request("/v1/supplements/stack", { query: { ...params } as never });
  }

  /** Supplements recommended for a given exercise. */
  forExercise(exerciseId: string): Promise<JsonObject> {
    return this.http.request(`/v1/supplements/exercise/${encodeURIComponent(exerciseId)}`);
  }

  /** Get a single supplement by ID. */
  get(id: string): Promise<Supplement> {
    return this.http.request(`/v1/supplements/${encodeURIComponent(id)}`);
  }
}
