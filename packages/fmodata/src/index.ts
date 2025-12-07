// Barrel file - exports all public API from the client folder

// Main API - use these functions to create tables and occurrences
export { FMServerConnection } from "./client/filemaker-odata";

// NEW ORM API - Drizzle-inspired field builders and operators
export {
  // Field builders
  textField,
  numberField,
  dateField,
  timeField,
  timestampField,
  containerField,
  calcField,
  type FieldBuilder,
  // Table definition
  fmTableOccurrence,
  FMTable,
  type FMTableWithColumns as TableOccurrenceResult,
  type InferTableSchema,
  // Table helper functions
  // getTableFields,
  // getDefaultSelect,
  // getBaseTableConfig,
  // getFieldId,
  // getFieldName,
  // getTableId,
  getTableColumns,
  // Column references
  type Column,
  isColumn,
  // Filter operators
  type FilterExpression,
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  contains,
  startsWith,
  endsWith,
  inArray,
  notInArray,
  isNull,
  isNotNull,
  and,
  or,
  not,
  // OrderBy operators
  type OrderByExpression,
  asc,
  desc,
} from "./orm/index";

// Type-only exports - for type annotations only, not direct instantiation
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
  BatchResult,
  BatchItemResult,
  InferSchemaType,
  ODataRecordMetadata,
  Metadata,
  FetchHandler,
  ExecuteMethodOptions,
  ExecuteOptions,
} from "./types";

// Re-export ffetch errors and types
export {
  TimeoutError,
  AbortError,
  NetworkError,
  RetryLimitError,
  CircuitOpenError,
} from "@fetchkit/ffetch";

export type { FFetchOptions } from "@fetchkit/ffetch";

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
  BatchTruncatedError,
  isHTTPError,
  isValidationError,
  isODataError,
  isSchemaLockedError,
  isResponseStructureError,
  isRecordCountMismatchError,
  isResponseParseError,
  isBatchTruncatedError,
  isFMODataError,
} from "./errors";

export type { FMODataErrorType } from "./errors";

export type { Logger } from "./logger";
