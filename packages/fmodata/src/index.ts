// Barrel file - exports all public API from the client folder

// Main API - use these functions to create tables and occurrences
export { defineBaseTable } from "./client/base-table";
export { defineTableOccurrence } from "./client/table-occurrence";
export { buildOccurrences } from "./client/build-occurrences";
export { FMServerConnection } from "./client/filemaker-odata";

// Type-only exports - for type annotations only, not direct instantiation
export type { BaseTable } from "./client/base-table";
export type { TableOccurrence } from "./client/table-occurrence";
export type { Database } from "./client/database";
export type { EntitySet } from "./client/entity-set";
export type {
  SchemaManager,
  Field,
  StringField,
  NumericField,
  DateField,
  TimeField,
  TimestampField,
  ContainerField,
} from "./client/schema-manager";

// Utility types for type annotations
export type {
  Result,
  InferSchemaType,
  InsertData,
  UpdateData,
  ODataRecordMetadata,
  Metadata,
} from "./types";

// Filter types
export type {
  Filter,
  TypedFilter,
  FieldFilter,
  StringOperators,
  NumberOperators,
  BooleanOperators,
  DateOperators,
  LogicalFilter,
} from "./filter-types";

// Re-export ffetch errors
export {
  TimeoutError,
  AbortError,
  NetworkError,
  RetryLimitError,
  CircuitOpenError,
} from "@fetchkit/ffetch";

// Export our errors
export {
  FMODataError,
  HTTPError,
  ODataError,
  SchemaLockedError,
  ValidationError,
  ResponseStructureError,
  RecordCountMismatchError,
  ResponseParseError,
  isHTTPError,
  isValidationError,
  isODataError,
  isSchemaLockedError,
  isResponseStructureError,
  isRecordCountMismatchError,
  isResponseParseError,
  isFMODataError,
} from "./errors";

export type { FMODataErrorType } from "./errors";
