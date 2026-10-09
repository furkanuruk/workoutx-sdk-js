export { WorkoutX, DEFAULT_BASE_URL } from "./client.js";
export type { WorkoutXOptions, ScanAuth } from "./client.js";
export { WorkoutXError, WorkoutXConnectionError } from "./errors.js";
export type {
  Exercise,
  Supplement,
  PaginatedList,
  PageParams,
  SearchParams,
  AlternativesParams,
  CalorieEstimate,
  WorkoutGenerateParams,
  WorkoutProgramParams,
  ApiTimestamp,
  JsonObject,
} from "./types.js";

export { ExercisesResource } from "./resources/exercises.js";
export { GifsResource } from "./resources/gifs.js";
export { WorkoutResource } from "./resources/workout.js";
export { SupplementsResource } from "./resources/supplements.js";
export { ScanResource } from "./resources/scan.js";
export { AuthResource } from "./resources/auth.js";
export type { AuthLoginResult } from "./resources/auth.js";
export { BillingResource } from "./resources/billing.js";
export { V2Resource } from "./resources/v2.js";
export type {
  ExerciseV2,
  MediaLinks,
  MuscleV2,
  V2SearchParams,
  V2Page,
  LegacyLookup,
  VocabEntry,
} from "./resources/v2.js";
