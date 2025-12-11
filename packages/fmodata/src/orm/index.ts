// Field builders - main API for defining table schemas
export {
  FieldBuilder,
  textField,
  numberField,
  dateField,
  timeField,
  timestampField,
  containerField,
  calcField,
  type ContainerDbType,
} from "./field-builders";

// Column references - used in queries and filters
export { Column, isColumn } from "./column";

// Filter operators - eq, gt, lt, and, or, etc.
export {
  FilterExpression,
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
  OrderByExpression,
  isOrderByExpression,
  asc,
  desc,
} from "./operators";

// Table definition - fmTableOccurrence function
export {
  fmTableOccurrence,
  FMTable,
  type FMTableWithColumns,
  type InferTableSchema,
  // Helper functions for accessing FMTable internals
  getTableName,
  getTableEntityId,
  // getTableFields,
  getDefaultSelect,
  getBaseTableConfig,
  isUsingEntityIds,
  getFieldId,
  getFieldName,
  getTableId,
  getTableColumns,
} from "./table";
