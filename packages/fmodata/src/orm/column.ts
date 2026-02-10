import type { StandardSchemaV1 } from "@standard-schema/spec";
import { needsFieldQuoting } from "../client/builders/select-utils";

/**
 * Column represents a type-safe reference to a table field.
 * Used in queries, filters, and operators to provide autocomplete and type checking.
 *
 * @template TOutput - The TypeScript type when reading from the database (output type)
 * @template TInput - The TypeScript type when writing to the database (input type, for filters)
 * @template TableName - The table name as a string literal type (for validation)
 * @template IsContainer - Whether this column represents a container field (cannot be selected)
 */
export class Column<
  // biome-ignore lint/suspicious/noExplicitAny: Default type parameter for flexibility
  TOutput = any,
  TInput = TOutput,
  TableName extends string = string,
  IsContainer extends boolean = false,
> {
  readonly fieldName: string;
  readonly entityId?: `FMFID:${string}`;
  readonly tableName: TableName;
  readonly tableEntityId?: `FMTID:${string}`;
  // biome-ignore lint/suspicious/noExplicitAny: Required for type inference with infer
  readonly inputValidator?: StandardSchemaV1<TInput, any>;
  readonly fieldType?: string;

  // Phantom types for TypeScript inference - never actually hold values
  readonly _phantomOutput!: TOutput;
  readonly _phantomInput!: TInput;
  readonly _isContainer!: IsContainer;

  constructor(config: {
    fieldName: string;
    entityId?: `FMFID:${string}`;
    tableName: TableName;
    tableEntityId?: `FMTID:${string}`;
    // biome-ignore lint/suspicious/noExplicitAny: Required for type inference with infer
    inputValidator?: StandardSchemaV1<TInput, any>;
    fieldType?: string;
  }) {
    this.fieldName = config.fieldName;
    this.entityId = config.entityId;
    this.tableName = config.tableName;
    this.tableEntityId = config.tableEntityId;
    this.inputValidator = config.inputValidator;
    this.fieldType = config.fieldType;
  }

  /**
   * Get the field identifier (entity ID if available, otherwise field name).
   * Used when building OData queries.
   */
  getFieldIdentifier(useEntityIds?: boolean): string {
    if (useEntityIds && this.entityId) {
      return this.entityId;
    }
    return this.fieldName;
  }

  /**
   * Get the table identifier (entity ID if available, otherwise table name).
   * Used when building OData queries.
   */
  getTableIdentifier(useEntityIds?: boolean): string {
    if (useEntityIds && this.tableEntityId) {
      return this.tableEntityId;
    }
    return this.tableName;
  }

  /**
   * Check if this column is from a specific table.
   * Useful for validation in cross-table operations.
   */
  isFromTable(tableName: string): boolean {
    return this.tableName === tableName;
  }

  /**
   * Create a string representation for debugging.
   */
  toString(): string {
    return `${this.tableName}.${this.fieldName}`;
  }
}

/**
 * Type guard to check if a value is a Column instance.
 */
// biome-ignore lint/suspicious/noExplicitAny: Type guard accepting any value type, generic constraint accepting any Column configuration
export function isColumn(value: any): value is Column<any, any, any, any> {
  return value instanceof Column;
}

/**
 * ColumnFunction wraps a Column with an OData string function (tolower, toupper, trim).
 * Since it extends Column, it passes `isColumn()` checks and works with all existing operators.
 * Supports nesting: `tolower(trim(col))` → `tolower(trim(name))`.
 */
export class ColumnFunction<
  // biome-ignore lint/suspicious/noExplicitAny: Default type parameter for flexibility
  TOutput = any,
  TInput = TOutput,
  TableName extends string = string,
  IsContainer extends boolean = false,
> extends Column<TOutput, TInput, TableName, IsContainer> {
  readonly fnName: string;
  readonly innerColumn: Column<TOutput, TInput, TableName, IsContainer>;

  constructor(fnName: string, innerColumn: Column<TOutput, TInput, TableName, IsContainer>) {
    super({
      fieldName: innerColumn.fieldName,
      entityId: innerColumn.entityId,
      tableName: innerColumn.tableName,
      tableEntityId: innerColumn.tableEntityId,
      inputValidator: innerColumn.inputValidator,
      fieldType: innerColumn.fieldType,
    });
    this.fnName = fnName;
    this.innerColumn = innerColumn;
  }

  toFilterString(useEntityIds?: boolean): string {
    if (isColumnFunction(this.innerColumn)) {
      return `${this.fnName}(${this.innerColumn.toFilterString(useEntityIds)})`;
    }
    const fieldIdentifier = this.innerColumn.getFieldIdentifier(useEntityIds);
    const quoted = needsFieldQuoting(fieldIdentifier) ? `"${fieldIdentifier}"` : fieldIdentifier;
    return `${this.fnName}(${quoted})`;
  }
}

/**
 * Type guard to check if a value is a ColumnFunction instance.
 */
// biome-ignore lint/suspicious/noExplicitAny: Type guard accepting any value type
export function isColumnFunction(value: any): value is ColumnFunction<any, any, any, any> {
  return value instanceof ColumnFunction;
}

/**
 * Create a Column with proper type inference from the inputValidator.
 * This helper ensures TypeScript can infer TInput from the validator's input type.
 * @internal
 */
export function createColumn<TOutput, TInput, TName extends string, IsContainer extends boolean = false>(config: {
  fieldName: string;
  entityId?: `FMFID:${string}`;
  tableName: TName;
  tableEntityId?: `FMTID:${string}`;
  // biome-ignore lint/suspicious/noExplicitAny: Required for type inference with infer
  inputValidator?: StandardSchemaV1<TInput, any>;
  fieldType?: string;
}): Column<TOutput, TInput, TName, IsContainer> {
  return new Column(config) as Column<TOutput, TInput, TName, IsContainer>;
}
