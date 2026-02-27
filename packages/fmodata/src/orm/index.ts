/** biome-ignore-all lint/performance/noBarrelFile: Re-exporting all ORM utilities */
// Field builders - main API for defining table schemas

// Column references - used in queries and filters
export { Column, ColumnFunction, isColumn, isColumnFunction } from "./column";
export {
  type ContainerDbType,
  calcField,
  containerField,
  dateField,
  FieldBuilder,
  type ListFieldOptions,
  listField,
  numberField,
  textField,
  timeField,
  timestampField,
} from "./field-builders";

// Filter operators - eq, gt, lt, and, or, etc.
export {
  and,
  asc,
  contains,
  desc,
  endsWith,
  eq,
  FilterExpression,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  isOrderByExpression,
  lt,
  lte,
  matchesPattern,
  ne,
  not,
  notInArray,
  // OrderBy operators
  OrderByExpression,
  or,
  startsWith,
  tolower,
  toupper,
  trim,
} from "./operators";

// Table definition - fmTableOccurrence function
export {
  FMTable,
  type FMTableWithColumns,
  fmTableOccurrence,
  getBaseTableConfig,
  // getTableFields,
  getDefaultSelect,
  getFieldId,
  getFieldName,
  getTableColumns,
  getTableEntityId,
  getTableId,
  // Helper functions for accessing FMTable internals
  getTableName,
  type InferTableSchema,
  isUsingEntityIds,
} from "./table";
