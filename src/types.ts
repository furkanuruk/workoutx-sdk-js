/**
 * Shared types for the WorkoutX SDK.
 *
 * These mirror the shapes returned by the WorkoutX API
 * (https://api.workoutxapp.com). Fields that depend on the caller's plan
 * (e.g. extended metadata only available on paid tiers) are marked optional.
 */

/** Firestore-style timestamp returned by the API. */
export interface ApiTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

/** A single exercise record. */
export interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
  gifUrl?: string;
  createdAt?: ApiTimestamp;
  updatedAt?: ApiTimestamp;
  /** Plan-gated / computed fields may also appear depending on the endpoint. */
  [key: string]: unknown;
}

/** Standard paginated list envelope used by exercise list endpoints. */
export interface PaginatedList<T> {
  total: number;
  count: number;
  data: T[];
}

/** Common pagination params accepted by list endpoints. */
export interface PageParams {
  limit?: number;
  offset?: number;
}

/** Query params for {@link ExercisesResource.search}. */
export interface SearchParams extends PageParams {
  name?: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
  secondaryMuscle?: string;
  /** Ultra-gated filters — only effective on plans that allow them. */
  jointFocus?: string;
  intensityLevel?: string;
  movementTag?: string;
}

/** Query params for {@link ExercisesResource.alternatives}. */
export interface AlternativesParams extends PageParams {
  /** Prefer alternatives using this equipment. */
  equipment?: string;
  /** Exclude alternatives using this equipment. */
  excludeEquipment?: string;
}

/** Result of an exercise calorie estimate. */
export interface CalorieEstimate {
  id: string;
  name: string;
  [key: string]: unknown;
}

/** A supplement record. */
export interface Supplement {
  id: string;
  name: string;
  [key: string]: unknown;
}

/** Params for {@link WorkoutResource.generate}. */
export interface WorkoutGenerateParams {
  goal?: string;
  days?: number;
  equipment?: string;
  level?: string;
  [key: string]: unknown;
}

/** Params for {@link WorkoutResource.program}. */
export interface WorkoutProgramParams {
  goal?: string;
  weeks?: number;
  daysPerWeek?: number;
  [key: string]: unknown;
}

/** Generic JSON object response for endpoints with flexible shapes. */
export type JsonObject = Record<string, unknown>;
