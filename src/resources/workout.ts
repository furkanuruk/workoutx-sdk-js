import type { HttpClient } from "../http.js";
import type { WorkoutGenerateParams, WorkoutProgramParams, JsonObject } from "../types.js";

/** Access to `/v1/workout/*`. Authenticated with the API key. */
export class WorkoutResource {
  constructor(private readonly http: HttpClient) {}

  /** Generate a single workout (plan-gated: requires `workoutGenerator`). */
  generate(params: WorkoutGenerateParams = {}): Promise<JsonObject> {
    return this.http.request("/v1/workout/generate", { query: { ...params } as never });
  }

  /** Generate a multi-week program (plan-gated: requires `workoutPrograms`). */
  program(params: WorkoutProgramParams = {}): Promise<JsonObject> {
    return this.http.request("/v1/workout/program", { query: { ...params } as never });
  }
}
