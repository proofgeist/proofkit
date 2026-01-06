import type { StandardSchemaV1 } from "@standard-schema/spec";
import { Column } from "./column";
import type { ContainerDbType, FieldBuilder, FieldBuilder as FieldBuilderType } from "./field-builders";
// import { z } from "zod/v4";

/**
 * Extract the output type from a FieldBuilder.
 * This is what you get when reading from the database.
 *
 * This type extracts the TOutput type parameter, which is set by readValidator()
 * and represents the transformed/validated output type.
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for type inference with infer
export type InferFieldOutput<F> = F extends FieldBuilder<infer TOutput, any, any, any> ? TOutput : never;

/**
 * Extract the input type from a FieldBuilder.
 * This is what you pass when writing to the database.
 *
 * This type extracts the TInput type parameter, which is set by writeValidator()
 * and represents the transformed/validated input type.
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for type inference with infer
type InferFieldInput<F> = F extends FieldBuilder<any, infer TInput, any, any> ? TInput : never;

/**
 * Build a schema type from field builders (output/read types).
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any FieldBuilder configuration
type InferSchemaFromFields<TFields extends Record<string, FieldBuilder<any, any, any, any>>> = {
  [K in keyof TFields]: InferFieldOutput<TFields[K]>;
};

/**
 * Build an input schema type from field builders (input/write types).
 * Used for insert and update operations.
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any FieldBuilder configuration
type InferInputSchemaFromFields<TFields extends Record<string, FieldBuilder<any, any, any, any>>> = {
  [K in keyof TFields]: InferFieldInput<TFields[K]>;
};

/**
 * Check if a field is a container field by inspecting its TDbType.
 * Container fields have a branded TDbType that extends ContainerDbType.
 */
type IsContainerField<F> =
  // biome-ignore lint/suspicious/noExplicitAny: Required for type inference with infer
  F extends FieldBuilder<any, any, infer TDbType, any>
    ? NonNullable<TDbType> extends ContainerDbType
      ? true
      : false
    : false;

/**
 * Extract only selectable (non-container) field keys from a fields record.
 * Container fields are excluded because they cannot be selected via $select in FileMaker OData.
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any FieldBuilder configuration
type SelectableFieldKeys<TFields extends Record<string, FieldBuilder<any, any, any, any>>> = {
  [K in keyof TFields]: IsContainerField<TFields[K]> extends true ? never : K;
}[keyof TFields];

/**
 * Build a schema type excluding container fields (for query return types).
 * This is used to ensure container fields don't appear in the return type
 * when using defaultSelect: "schema" or "all".
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any FieldBuilder configuration
type _InferSelectableSchemaFromFields<TFields extends Record<string, FieldBuilder<any, any, any, any>>> = {
  [K in SelectableFieldKeys<TFields>]: InferFieldOutput<TFields[K]>;
};

/**
 * Internal Symbols for table properties (hidden from IDE autocomplete).
 * These are used to store internal configuration that shouldn't be visible
 * when users access table columns.
 * @internal - Not exported from public API, only accessible via FMTable.Symbol
 */
const FMTableName = Symbol.for("fmodata:FMTableName");
const FMTableEntityId = Symbol.for("fmodata:FMTableEntityId");
const FMTableSchema = Symbol.for("fmodata:FMTableSchema");
const FMTableFields = Symbol.for("fmodata:FMTableFields");
const FMTableNavigationPaths = Symbol.for("fmodata:FMTableNavigationPaths");
const FMTableDefaultSelect = Symbol.for("fmodata:FMTableDefaultSelect");
const FMTableBaseTableConfig = Symbol.for("fmodata:FMTableBaseTableConfig");
const FMTableUseEntityIds = Symbol.for("fmodata:FMTableUseEntityIds");
const FMTableComment = Symbol.for("fmodata:FMTableComment");

/**
 * Base table class with Symbol-based internal properties.
 * This follows the Drizzle ORM pattern where internal configuration
 * is stored via Symbols, keeping it hidden from IDE autocomplete.
 */
export class FMTable<
  // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any FieldBuilder configuration, default allows untyped tables
  TFields extends Record<string, FieldBuilder<any, any, any, any>> = any,
  TName extends string = string,
  TNavigationPaths extends readonly string[] = readonly string[],
> {
  /**
   * Internal Symbols for accessing table metadata.
   * @internal - Not intended for public use. Access table properties via columns instead.
   */
  static readonly Symbol = {
    Name: FMTableName,
    EntityId: FMTableEntityId,
    UseEntityIds: FMTableUseEntityIds,
    Schema: FMTableSchema,
    Fields: FMTableFields,
    NavigationPaths: FMTableNavigationPaths,
    DefaultSelect: FMTableDefaultSelect,
    BaseTableConfig: FMTableBaseTableConfig,
    Comment: FMTableComment,
  };

  /** @internal */
  [FMTableName]: TName;

  /** @internal */
  [FMTableEntityId]?: `FMTID:${string}`;

  /** @internal */
  [FMTableUseEntityIds]?: boolean;

  /** @internal */
  [FMTableComment]?: string;

  /** @internal */
  [FMTableSchema]: Partial<Record<keyof TFields, StandardSchemaV1>>;

  /** @internal */
  [FMTableFields]: TFields;

  /** @internal */
  [FMTableNavigationPaths]: TNavigationPaths;

  /** @internal */
  // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any Column configuration
  [FMTableDefaultSelect]: "all" | "schema" | Record<string, Column<any, any, TName>>;

  /** @internal */
  [FMTableBaseTableConfig]: {
    schema: Partial<Record<keyof TFields, StandardSchemaV1>>;
    inputSchema?: Partial<Record<keyof TFields, StandardSchemaV1>>;
    idField?: keyof TFields;
    required: readonly (keyof TFields)[];
    readOnly: readonly (keyof TFields)[];
    containerFields: readonly (keyof TFields)[];
    fmfIds?: Record<keyof TFields, `FMFID:${string}`>;
  };

  constructor(config: {
    name: TName;
    entityId?: `FMTID:${string}`;
    useEntityIds?: boolean;
    comment?: string;
    schema: Partial<Record<keyof TFields, StandardSchemaV1>>;
    fields: TFields;
    navigationPaths: TNavigationPaths;
    // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any Column configuration
    defaultSelect: "all" | "schema" | Record<string, Column<any, any, TName>>;
    baseTableConfig: {
      schema: Partial<Record<keyof TFields, StandardSchemaV1>>;
      inputSchema?: Partial<Record<keyof TFields, StandardSchemaV1>>;
      idField?: keyof TFields;
      required: readonly (keyof TFields)[];
      readOnly: readonly (keyof TFields)[];
      containerFields: readonly (keyof TFields)[];
      fmfIds?: Record<keyof TFields, `FMFID:${string}`>;
    };
  }) {
    this[FMTableName] = config.name;
    this[FMTableEntityId] = config.entityId;
    this[FMTableUseEntityIds] = config.useEntityIds;
    this[FMTableComment] = config.comment;
    this[FMTableSchema] = config.schema;
    this[FMTableFields] = config.fields;
    this[FMTableNavigationPaths] = config.navigationPaths;
    this[FMTableDefaultSelect] = config.defaultSelect;
    this[FMTableBaseTableConfig] = config.baseTableConfig;
  }
}

/**
 * Type helper to extract the column map from fields.
 * Table name is baked into each column type for validation.
 * Container fields are marked with IsContainer=true.
 * Columns include both output type (for reading) and input type (for writing/filtering).
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any FieldBuilder configuration
export type ColumnMap<TFields extends Record<string, FieldBuilder<any, any, any, any>>, TName extends string> = {
  [K in keyof TFields]: Column<
    InferFieldOutput<TFields[K]>,
    InferFieldInput<TFields[K]>,
    TName,
    IsContainerField<TFields[K]>
  >;
};

/**
 * Extract only selectable (non-container) columns from a table.
 * This is used to prevent selecting container fields in queries.
 */
export type SelectableColumnMap<
  // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any FieldBuilder configuration
  TFields extends Record<string, FieldBuilder<any, any, any, any>>,
  TName extends string,
> = {
  [K in SelectableFieldKeys<TFields>]: Column<InferFieldOutput<TFields[K]>, InferFieldInput<TFields[K]>, TName, false>;
};

/**
 * Validates that a select object doesn't contain container field columns.
 * Returns never if any container fields are found, otherwise returns the original type.
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any Column configuration
export type ValidateNoContainerFields<TSelect extends Record<string, Column<any, any, any, any>>> = {
  // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any Column configuration
  [K in keyof TSelect]: TSelect[K] extends Column<any, any, any, true> ? never : TSelect[K];
} extends TSelect
  ? TSelect
  : {
      // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any Column configuration
      [K in keyof TSelect]: TSelect[K] extends Column<any, any, any, true>
        ? "❌ Container fields cannot be selected. Use .getSingleField() instead."
        : TSelect[K];
    };

/**
 * Extract the keys from a defaultSelect function's return type.
 * Used to infer which fields are selected by default for type narrowing.
 */
type _ExtractDefaultSelectKeys<
  TDefaultSelect,
  // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any FieldBuilder configuration
  TFields extends Record<string, FieldBuilder<any, any, any, any>>,
  TName extends string,
> = TDefaultSelect extends (columns: ColumnMap<TFields, TName>) => infer R
  ? keyof R
  : TDefaultSelect extends "schema"
    ? keyof TFields
    : keyof TFields; // "all" defaults to all keys

/**
 * Complete table type with both metadata (via Symbols) and column accessors.
 * This is the return type of fmTableOccurrence - users see columns directly,
 * but internal config is hidden via Symbols.
 */
export type FMTableWithColumns<
  // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any FieldBuilder configuration
  TFields extends Record<string, FieldBuilder<any, any, any, any>>,
  TName extends string,
  TNavigationPaths extends readonly string[] = readonly string[],
> = FMTable<TFields, TName, TNavigationPaths> & ColumnMap<TFields, TName>;

/**
 * Options for fmTableOccurrence function.
 * Provides autocomplete-friendly typing while preserving inference for navigationPaths.
 */
export interface FMTableOccurrenceOptions<
  // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any FieldBuilder configuration
  TFields extends Record<string, FieldBuilder<any, any, any, any>>,
  TName extends string,
> {
  /** The entity ID (FMTID) for this table occurrence */
  entityId?: `FMTID:${string}`;

  /** The comment for this table */
  comment?: string;

  /**
   * Default select behavior:
   * - "all": Select all fields (including related tables)
   * - "schema": Select only schema-defined fields (default)
   * - function: Custom selection from columns
   */
  // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any Column configuration
  defaultSelect?: "all" | "schema" | ((columns: ColumnMap<TFields, TName>) => Record<string, Column<any, any, TName>>);

  /** Navigation paths available from this table (for expand operations) */
  navigationPaths?: readonly string[];

  /** Whether to use entity IDs (FMTID/FMFID) instead of names in queries */
  useEntityIds?: boolean;
}

/**
 * Create a table occurrence with field builders.
 * This is the main API for defining tables in the new ORM style.
 *
 * @example
 * const users = fmTableOccurrence("users", {
 *   id: textField().primaryKey().entityId("FMFID:1"),
 *   name: textField().notNull().entityId("FMFID:6"),
 *   active: numberField()
 *     .outputValidator(z.coerce.boolean())
 *     .inputValidator(z.boolean().transform(v => v ? 1 : 0))
 *     .entityId("FMFID:7"),
 * }, {
 *   entityId: "FMTID:100",
 *   defaultSelect: "schema",
 *   navigationPaths: ["contacts"],
 * });
 *
 * // Access columns
 * users.id    // Column<string, "id">
 * users.name  // Column<string, "name">
 *
 * // Use in queries
 * db.from(users).select("id", "name").where(eq(users.active, true))
 */
export function fmTableOccurrence<
  const TName extends string,
  // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any FieldBuilder configuration
  const TFields extends Record<string, FieldBuilder<any, any, any, any>>,
  const TNavPaths extends readonly string[] = readonly [],
>(
  name: TName,
  fields: TFields,
  options?: FMTableOccurrenceOptions<TFields, TName> & {
    /** Navigation paths available from this table (for expand operations) */
    navigationPaths?: TNavPaths;
  },
): FMTableWithColumns<TFields, TName, TNavPaths> {
  // Extract configuration from field builders
  const fieldConfigs = Object.entries(fields).map(([fieldName, builder]) => ({
    fieldName,
    // biome-ignore lint/suspicious/noExplicitAny: Internal property access for builder pattern
    config: (builder as any)._getConfig(),
  }));

  // Find primary key field
  const primaryKeyField = fieldConfigs.find((f) => f.config.primaryKey);
  const idField = primaryKeyField?.fieldName;

  // Collect required fields (notNull fields)
  const required = fieldConfigs.filter((f) => f.config.notNull).map((f) => f.fieldName);

  // Collect read-only fields
  const readOnly = fieldConfigs.filter((f) => f.config.readOnly).map((f) => f.fieldName);

  // Collect container fields (cannot be selected via $select)
  const containerFields = fieldConfigs.filter((f) => f.config.fieldType === "container").map((f) => f.fieldName);

  // Collect entity IDs
  const fmfIds: Record<string, `FMFID:${string}`> = {};
  for (const { fieldName, config } of fieldConfigs) {
    if (config.entityId) {
      fmfIds[fieldName] = config.entityId;
    }
  }

  // Build Zod schema from field builders (output/read validators)
  const outputSchema: Partial<Record<keyof TFields, StandardSchemaV1>> = {};
  // Build input schema from field builders (input/write validators)
  const inputSchema: Record<string, StandardSchemaV1> = {};

  for (const { fieldName, config } of fieldConfigs) {
    // Use outputValidator if provided
    if (config.outputValidator) {
      outputSchema[fieldName as keyof TFields] = config.outputValidator;
    }

    // Store inputValidator if provided (for write operations)
    if (config.inputValidator) {
      inputSchema[fieldName] = config.inputValidator;
    }
  }

  // Build BaseTable-compatible config
  const baseTableConfig = {
    schema: outputSchema as Partial<Record<keyof TFields, StandardSchemaV1>>,
    inputSchema:
      Object.keys(inputSchema).length > 0
        ? (inputSchema as Partial<Record<keyof TFields, StandardSchemaV1>>)
        : undefined,
    idField: idField as keyof TFields | undefined,
    required: required as readonly (keyof TFields)[],
    readOnly: readOnly as readonly (keyof TFields)[],
    containerFields: containerFields as readonly (keyof TFields)[],
    fmfIds: (Object.keys(fmfIds).length > 0 ? fmfIds : undefined) as
      | Record<keyof TFields, `FMFID:${string}`>
      | undefined,
  };

  // Create column instances
  const columns = {} as ColumnMap<TFields, TName>;
  for (const [fieldName, builder] of Object.entries(fields)) {
    // biome-ignore lint/suspicious/noExplicitAny: Internal property access for builder pattern
    const config = (builder as any)._getConfig();
    // biome-ignore lint/suspicious/noExplicitAny: Mutation of readonly properties for builder pattern
    (columns as any)[fieldName] = new Column({
      fieldName: String(fieldName),
      entityId: config.entityId,
      tableName: name,
      tableEntityId: options?.entityId,
      inputValidator: config.inputValidator,
    });
  }

  // Resolve defaultSelect: if it's a function, call it with columns; otherwise use as-is
  const defaultSelectOption = options?.defaultSelect ?? "schema";
  // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any Column configuration
  const resolvedDefaultSelect: "all" | "schema" | Record<string, Column<any, any, TName>> =
    typeof defaultSelectOption === "function"
      ? defaultSelectOption(columns as ColumnMap<TFields, TName>)
      : defaultSelectOption;

  // Create the FMTable instance with Symbol-based internal properties
  const navigationPaths = (options?.navigationPaths ?? []) as TNavPaths;
  const table = new FMTable<TFields, TName, TNavPaths>({
    name,
    entityId: options?.entityId,
    useEntityIds: options?.useEntityIds,
    comment: options?.comment,
    schema: outputSchema,
    fields,
    navigationPaths,
    defaultSelect: resolvedDefaultSelect,
    baseTableConfig,
  });

  // Assign columns to the table instance (making them accessible directly)
  Object.assign(table, columns);

  return table as FMTableWithColumns<TFields, TName, TNavPaths>;
}

// /**
//  * Type guard to check if a value is a TableOccurrence or FMTable.
//  * Supports both Symbol-based (new) and underscore-prefixed (legacy) formats.
//  */
// function isTableOccurrence(value: any): value is TableOccurrence {
//   if (!value || typeof value !== "object") {
//     return false;
//   }

//   // Check for Symbol-based format (new FMTable class)
//   if (
//     FMTableName in value &&
//     FMTableSchema in value &&
//     FMTableFields in value
//   ) {
//     return typeof value[FMTableName] === "string";
//   }

//   // Check for underscore-prefixed format (legacy interface)
//   if ("_name" in value && "_schema" in value && "_fields" in value) {
//     return typeof value._name === "string";
//   }

//   return false;
// }

/**
 * Helper to extract the schema type from a TableOccurrence or FMTable.
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for type inference with infer
export type InferTableSchema<T> = T extends FMTable<infer TFields, any> ? InferSchemaFromFields<TFields> : never;

/**
 * Extract the schema type from an FMTable instance.
 * This is used to infer the schema from table objects passed to db.from(), expand(), etc.
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
export type InferSchemaOutputFromFMTable<T extends FMTable<any, any>> =
  // biome-ignore lint/suspicious/noExplicitAny: Required for type inference with infer
  T extends FMTable<infer TFields, any> ? InferSchemaFromFields<TFields> : never;

/**
 * Extract the input schema type from an FMTable instance.
 * This is used for insert and update operations where we need write types.
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
export type InferInputSchemaFromFMTable<T extends FMTable<any, any>> =
  // biome-ignore lint/suspicious/noExplicitAny: Required for type inference with infer
  T extends FMTable<infer TFields, any> ? InferInputSchemaFromFields<TFields> : never;

/**
 * Helper type to check if a FieldBuilder's input type excludes null and undefined.
 * This checks the TInput type parameter, which preserves nullability from notNull().
 */
type FieldInputExcludesNullish<F> =
  // biome-ignore lint/suspicious/noExplicitAny: Required for type inference with infer
  F extends FieldBuilder<any, infer TInput, any>
    ? null extends TInput
      ? false
      : undefined extends TInput
        ? false
        : true
    : false;

/**
 * Check if a FieldBuilder is readOnly at the type level
 */
type IsFieldReadOnly<F> =
  // biome-ignore lint/suspicious/noExplicitAny: Required for type inference with infer
  F extends FieldBuilderType<any, any, any, infer ReadOnly> ? (ReadOnly extends true ? true : false) : false;

/**
 * Compute insert data type from FMTable, making notNull fields required.
 * Fields are required if their FieldBuilder's TInput type excludes null/undefined.
 * All other fields are optional (can be omitted).
 * readOnly fields are excluded (including primaryKey/idField since they're automatically readOnly).
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
export type InsertDataFromFMTable<T extends FMTable<any, any>> =
  // biome-ignore lint/suspicious/noExplicitAny: Required for type inference with infer
  T extends FMTable<infer TFields, any>
    ? {
        [K in keyof TFields as IsFieldReadOnly<TFields[K]> extends true
          ? never
          : FieldInputExcludesNullish<TFields[K]> extends true
            ? K
            : never]: InferFieldInput<TFields[K]>;
      } & {
        [K in keyof TFields as IsFieldReadOnly<TFields[K]> extends true
          ? never
          : FieldInputExcludesNullish<TFields[K]> extends true
            ? never
            : K]?: InferFieldInput<TFields[K]>;
      }
    : never;

/**
 * Compute update data type from FMTable.
 * All fields are optional, but readOnly fields are excluded (including primaryKey/idField).
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
export type UpdateDataFromFMTable<T extends FMTable<any, any>> =
  // biome-ignore lint/suspicious/noExplicitAny: Required for type inference with infer
  T extends FMTable<infer TFields, any>
    ? {
        [K in keyof TFields as IsFieldReadOnly<TFields[K]> extends true ? never : K]?: InferFieldInput<TFields[K]>;
      }
    : never;

/**
 * Extract the table name type from an FMTable.
 * This is a workaround since we can't directly index Symbols in types.
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration, required for type inference with infer
export type ExtractTableName<T extends FMTable<any, any>> = T extends FMTable<any, infer Name> ? Name : never;

/**
 * Validates that a target table's name matches one of the source table's navigationPaths.
 * Used to ensure type-safe expand/navigate operations.
 */
export type ValidExpandTarget<
  // biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
  SourceTable extends FMTable<any, any, any> | undefined,
  // biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
  TargetTable extends FMTable<any, any, any>,
  // biome-ignore lint/suspicious/noExplicitAny: Required for type inference with infer
> = SourceTable extends FMTable<any, any, infer SourceNavPaths>
  ? ExtractTableName<TargetTable> extends SourceNavPaths[number]
    ? TargetTable
    : never
  : TargetTable;

// ============================================================================
// Helper Functions for Accessing FMTable Internal Properties
// ============================================================================

/**
 * Get the table name from an FMTable instance.
 * @param table - FMTable instance
 * @returns The table name
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
export function getTableName<T extends FMTable<any, any>>(table: T): string {
  return table[FMTableName];
}

/**
 * Get the entity ID (FMTID) from an FMTable instance.
 * @param table - FMTable instance
 * @returns The entity ID or undefined if not using entity IDs
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
export function getTableEntityId<T extends FMTable<any, any>>(table: T): string | undefined {
  return table[FMTableEntityId];
}

/**
 * Get the schema validator from an FMTable instance.
 * @param table - FMTable instance
 * @returns The StandardSchemaV1 validator record (partial - only fields with validators)
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
export function getTableSchema<T extends FMTable<any, any>>(
  table: T,
): Partial<Record<keyof T[typeof FMTableFields], StandardSchemaV1>> {
  return table[FMTableSchema];
}

/**
 * Get the fields from an FMTable instance.
 * @param table - FMTable instance
 * @returns The fields record
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
export function getTableFields<T extends FMTable<any, any>>(table: T) {
  return table[FMTableFields];
}

/**
 * Get the navigation paths from an FMTable instance.
 * @param table - FMTable instance
 * @returns Array of navigation path names
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
export function getNavigationPaths<T extends FMTable<any, any>>(table: T): readonly string[] {
  return table[FMTableNavigationPaths];
}

/**
 * Get the default select configuration from an FMTable instance.
 * @param table - FMTable instance
 * @returns Default select configuration
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
export function getDefaultSelect<T extends FMTable<any, any>>(table: T) {
  return table[FMTableDefaultSelect];
}

/**
 * Get the base table configuration from an FMTable instance.
 * This provides access to schema, idField, required fields, readOnly fields, and field IDs.
 * @param table - FMTable instance
 * @returns Base table configuration object
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
export function getBaseTableConfig<T extends FMTable<any, any>>(table: T) {
  return table[FMTableBaseTableConfig];
}

/**
 * Check if an FMTable instance is using entity IDs (both FMTID and FMFIDs).
 * @param table - FMTable instance
 * @returns True if using entity IDs, false otherwise
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
export function isUsingEntityIds<T extends FMTable<any, any>>(table: T): boolean {
  return table[FMTableEntityId] !== undefined && table[FMTableBaseTableConfig].fmfIds !== undefined;
}

/**
 * Get the field ID (FMFID) for a given field name, or the field name itself if not using IDs.
 * @param table - FMTable instance
 * @param fieldName - Field name to get the ID for
 * @returns The FMFID string or the original field name
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
export function getFieldId<T extends FMTable<any, any>>(table: T, fieldName: string): string {
  const config = table[FMTableBaseTableConfig];
  if (config.fmfIds && fieldName in config.fmfIds) {
    const fieldId = config.fmfIds[fieldName];
    if (fieldId) {
      return fieldId;
    }
  }
  return fieldName;
}

/**
 * Get the field name for a given field ID (FMFID), or the ID itself if not found.
 * @param table - FMTable instance
 * @param fieldId - The FMFID to get the field name for
 * @returns The field name or the original ID
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
export function getFieldName<T extends FMTable<any, any>>(table: T, fieldId: string): string {
  const config = table[FMTableBaseTableConfig];
  if (config.fmfIds) {
    for (const [fieldName, fmfId] of Object.entries(config.fmfIds)) {
      if (fmfId === fieldId) {
        return fieldName;
      }
    }
  }
  return fieldId;
}
/**
 * Get the table ID (FMTID or name) from an FMTable instance.
 * Returns the FMTID if available, otherwise returns the table name.
 * @param table - FMTable instance
 * @returns The FMTID string or the table name
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
export function getTableId<T extends FMTable<any, any>>(table: T): string {
  return table[FMTableEntityId] ?? table[FMTableName];
}

/**
 * Get the comment from an FMTable instance.
 * @param table - FMTable instance
 * @returns The comment string or undefined if not set
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
export function getTableComment<T extends FMTable<any, any>>(table: T): string | undefined {
  return table[FMTableComment];
}

/**
 * Get all columns from a table as an object.
 * Useful for selecting all fields except some using destructuring.
 *
 * @example
 * const { password, ...cols } = getTableColumns(users)
 * db.from(users).list().select(cols)
 *
 * @param table - FMTable instance
 * @returns Object with all columns from the table
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
export function getTableColumns<T extends FMTable<any, any>>(
  table: T,
): ColumnMap<T[typeof FMTableFields], ExtractTableName<T>> {
  const fields = table[FMTableFields];
  const tableName = table[FMTableName];
  const tableEntityId = table[FMTableEntityId];
  const baseConfig = table[FMTableBaseTableConfig];

  const columns = {} as ColumnMap<T[typeof FMTableFields], ExtractTableName<T>>;
  for (const [fieldName, builder] of Object.entries(fields)) {
    // biome-ignore lint/suspicious/noExplicitAny: Internal property access for builder pattern
    const config = (builder as any)._getConfig();
    // biome-ignore lint/suspicious/noExplicitAny: Mutation of readonly properties for builder pattern
    (columns as any)[fieldName] = new Column({
      fieldName: String(fieldName),
      entityId: baseConfig.fmfIds?.[fieldName],
      tableName,
      tableEntityId,
      inputValidator: config.inputValidator,
    });
  }

  return columns;
}
