import type { StandardSchemaV1 } from "@standard-schema/spec";

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
  TOutput = any,
  TInput = TOutput,
  TableName extends string = string,
  IsContainer extends boolean = false,
> {
  readonly fieldName: string;
  readonly entityId?: `FMFID:${string}`;
  readonly tableName: TableName;
  readonly tableEntityId?: `FMTID:${string}`;
  readonly inputValidator?: StandardSchemaV1<TInput, any>;

  // Phantom types for TypeScript inference - never actually hold values
  readonly _phantomOutput!: TOutput;
  readonly _phantomInput!: TInput;
  readonly _isContainer!: IsContainer;

  constructor(config: {
    fieldName: string;
    entityId?: `FMFID:${string}`;
    tableName: TableName;
    tableEntityId?: `FMTID:${string}`;
    inputValidator?: StandardSchemaV1<TInput, any>;
  }) {
    this.fieldName = config.fieldName;
    this.entityId = config.entityId;
    this.tableName = config.tableName;
    this.tableEntityId = config.tableEntityId;
    this.inputValidator = config.inputValidator;
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
export function isColumn(value: any): value is Column<any, any, any, any> {
  return value instanceof Column;
}

/**
 * Create a Column with proper type inference from the inputValidator.
 * This helper ensures TypeScript can infer TInput from the validator's input type.
 * @internal
 */
export function createColumn<
  TOutput,
  TInput,
  TName extends string,
  IsContainer extends boolean = false,
>(config: {
  fieldName: string;
  entityId?: `FMFID:${string}`;
  tableName: TName;
  tableEntityId?: `FMTID:${string}`;
  inputValidator?: StandardSchemaV1<TInput, any>;
}): Column<TOutput, TInput, TName, IsContainer> {
  return new Column(config) as Column<TOutput, TInput, TName, IsContainer>;
}
