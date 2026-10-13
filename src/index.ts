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
export { V2Resource, V2WorkoutResource, V2SupplementsResource } from "./resources/v2.js";
export type {
  ExerciseV2,
  MediaLinks,
  MuscleV2,
  V2Lang,
  V2LangParams,
  V2SearchParams,
  V2Page,
  LegacyLookup,
  VocabEntry,
  V2SimilarParams,
  V2AlternativesParams,
  RankedExerciseV2,
  V2RankedPage,
  V2CaloriesParams,
  CalorieEstimateV2,
  V2WorkoutGoal,
  V2WorkoutLevel,
  V2WorkoutSplit,
  V2WorkoutJoint,
  V2WorkoutFormat,
  V2WorkoutResolvedFormat,
  V2WorkoutRole,
  V2WorkoutGenerateParams,
  V2WorkoutProgramParams,
  WorkoutAlternativeV2,
  WorkoutPrescriptionV2,
  WorkoutExerciseV2,
  WorkoutStepV2,
  WorkoutWarmupV2,
  WorkoutCooldownV2,
  WorkoutSummaryV2,
  WorkoutCircuitV2,
  WorkoutV2,
  ProgramScheduleDayV2,
  ProgramProgressionV2,
  ProgramBlockV2,
  ProgramVolumeV2,
  ProgramStepV2,
  ProgramSessionExerciseV2,
  ProgramSessionV2,
  ProgramExerciseV2,
  ProgramDayV2,
  ProgramWeekV2,
  ProgramV2,
  V2SupplementListParams,
  V2SupplementPage,
  V2ForExerciseParams,
  V2SupplementStackParams,
} from "./resources/v2.js";
