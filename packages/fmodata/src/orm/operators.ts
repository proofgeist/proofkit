import { needsFieldQuoting } from "../client/builders/select-utils";
import { type Column, ColumnFunction, isColumn, isColumnFunction } from "./column";

/**
 * FilterExpression represents a filter condition that can be used in where() clauses.
 * Internal representation of operator expressions that get converted to OData filter syntax.
 */
export class FilterExpression {
  readonly operator: string;
  // biome-ignore lint/suspicious/noExplicitAny: Operands can be Column, FilterExpression, or any value type
  readonly operands: (Column | any | FilterExpression)[];

  // biome-ignore lint/suspicious/noExplicitAny: Operands can be Column, FilterExpression, or any value type
  constructor(operator: string, operands: (Column | any | FilterExpression)[]) {
    this.operator = operator;
    this.operands = operands;
  }

  /**
   * Convert this expression to OData filter syntax.
   * @internal Used by QueryBuilder
   */
  toODataFilter(useEntityIds?: boolean): string {
    switch (this.operator) {
      // Comparison operators
      case "eq":
        return this._binaryOp("eq", useEntityIds);
      case "ne":
        return this._binaryOp("ne", useEntityIds);
      case "gt":
        return this._binaryOp("gt", useEntityIds);
      case "gte":
        return this._binaryOp("ge", useEntityIds);
      case "lt":
        return this._binaryOp("lt", useEntityIds);
      case "lte":
        return this._binaryOp("le", useEntityIds);
      case "in":
        return this._inOp(useEntityIds);
      case "notIn":
        return this._notInOp(useEntityIds);

      // String operators
      case "contains":
        return this._functionOp("contains", useEntityIds);
      case "startsWith":
        return this._functionOp("startswith", useEntityIds);
      case "endsWith":
        return this._functionOp("endswith", useEntityIds);
      case "matchesPattern":
        return this._functionOp("matchesPattern", useEntityIds);

      // Null checks
      case "isNull":
        return this._isNullOp(useEntityIds);
      case "isNotNull":
        return this._isNotNullOp(useEntityIds);

      // Logical operators
      case "and":
        return this._logicalOp("and", useEntityIds);
      case "or":
        return this._logicalOp("or", useEntityIds);
      case "not":
        return this._notOp(useEntityIds);

      default:
        throw new Error(`Unknown operator: ${this.operator}`);
    }
  }

  private _binaryOp(op: string, useEntityIds?: boolean): string {
    const [left, right] = this.operands;
    // For binary ops, the column is typically the first operand and value is the second
    // But we also support column-to-column comparisons, so check both
    let columnForValue: typeof left | typeof right | undefined;
    if (isColumn(left) && !isColumn(right)) {
      columnForValue = left;
    } else if (isColumn(right) && !isColumn(left)) {
      columnForValue = right;
    } else {
      columnForValue = undefined;
    }
    const leftStr = this._operandToString(left, useEntityIds, columnForValue);
    const rightStr = this._operandToString(right, useEntityIds, columnForValue);
    return `${leftStr} ${op} ${rightStr}`;
  }

  private _functionOp(fnName: string, useEntityIds?: boolean): string {
    const [column, value] = this.operands;
    const columnInstance = isColumn(column) ? column : undefined;
    const columnStr = this._operandToString(column, useEntityIds);
    const valueStr = this._operandToString(value, useEntityIds, columnInstance);
    return `${fnName}(${columnStr}, ${valueStr})`;
  }

  private _inOp(useEntityIds?: boolean): string {
    const [column, values] = this.operands;
    const columnInstance = isColumn(column) ? column : undefined;
    const columnStr = this._operandToString(column, useEntityIds);
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic array of values from user input
    const valuesStr = (values as any[]).map((v) => this._operandToString(v, useEntityIds, columnInstance)).join(", ");
    return `${columnStr} in (${valuesStr})`;
  }

  private _notInOp(useEntityIds?: boolean): string {
    const [column, values] = this.operands;
    const columnInstance = isColumn(column) ? column : undefined;
    const columnStr = this._operandToString(column, useEntityIds);
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic array of values from user input
    const valuesStr = (values as any[]).map((v) => this._operandToString(v, useEntityIds, columnInstance)).join(", ");
    return `not (${columnStr} in (${valuesStr}))`;
  }

  private _isNullOp(useEntityIds?: boolean): string {
    const [column] = this.operands;
    const columnStr = this._operandToString(column, useEntityIds);
    return `${columnStr} eq null`;
  }

  private _isNotNullOp(useEntityIds?: boolean): string {
    const [column] = this.operands;
    const columnStr = this._operandToString(column, useEntityIds);
    return `${columnStr} ne null`;
  }

  private _logicalOp(op: string, useEntityIds?: boolean): string {
    const expressions = this.operands.map((expr) => {
      if (expr instanceof FilterExpression) {
        const innerExpr = expr.toODataFilter(useEntityIds);
        // Wrap in parens if it's a logical expression to ensure precedence
        if (expr.operator === "and" || expr.operator === "or") {
          return `(${innerExpr})`;
        }
        return innerExpr;
      }
      throw new Error("Logical operators require FilterExpression operands");
    });
    return expressions.join(` ${op} `);
  }

  private _notOp(useEntityIds?: boolean): string {
    const [expr] = this.operands;
    if (expr instanceof FilterExpression) {
      return `not (${expr.toODataFilter(useEntityIds)})`;
    }
    throw new Error("NOT operator requires a FilterExpression operand");
  }

  private _formatTemporalValue(value: unknown, fieldType: "date" | "time" | "timestamp"): string {
    if (!(value instanceof Date)) {
      return String(value);
    }
    if (fieldType === "date") {
      return value.toISOString().slice(0, 10);
    }
    if (fieldType === "time") {
      return value.toISOString().slice(11, 19);
    }
    return value.toISOString();
  }

  private _operandToString(
    // biome-ignore lint/suspicious/noExplicitAny: Operand can be Column, FilterExpression, or any value type
    operand: any,
    useEntityIds?: boolean, // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any Column configuration
    column?: Column<any, any, any, any>,
  ): string {
    if (isColumnFunction(operand)) {
      return operand.toFilterString(useEntityIds);
    }

    if (isColumn(operand)) {
      const fieldIdentifier = operand.getFieldIdentifier(useEntityIds);
      // Quote field names in OData filters per FileMaker OData API requirements
      return needsFieldQuoting(fieldIdentifier) ? `"${fieldIdentifier}"` : fieldIdentifier;
    }

    // If we have a column with an input validator, apply it to transform the value
    let value = operand;
    if (column?.inputValidator) {
      try {
        const result = column.inputValidator["~standard"].validate(value);
        // Handle async validators (though they shouldn't be async for filters)
        if (result instanceof Promise) {
          // For filters, we can't use async validators, so skip transformation
          // This is a limitation - async validators won't work in filters
          value = operand;
        } else if ("issues" in result && result.issues) {
          // Validation failed, use original value
          value = operand;
        } else if ("value" in result) {
          // Validation succeeded, use transformed value
          value = result.value;
        }
      } catch (_error) {
        // If validation throws, use the original value (will likely cause a query error)
        // This maintains backward compatibility and allows the server to handle validation
        value = operand;
      }
    }

    // Date/time/timestamp values must be unquoted in OData filters.
    // Date objects are normalized to OData-friendly ISO fragments by field type.
    const ft = column?.fieldType;
    if (ft === "date" || ft === "time" || ft === "timestamp") {
      return this._formatTemporalValue(value, ft);
    }

    if (typeof value === "string") {
      return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
    }
    if (value === null || value === undefined) {
      return "null";
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  }
}

// ============================================================================
// Comparison Operators
// ============================================================================

/**
 * Equal operator - checks if column equals a value or another column.
 *
 * @example
 * eq(users.name, "John")           // name equals "John"
 * eq(users.id, contacts.id_user)   // cross-table comparison
 */
export function eq<TOutput, TInput>(
  column1: Column<TOutput, TInput>,
  column2: Column<TOutput, TInput> | NoInfer<TInput>,
): FilterExpression;
// biome-ignore lint/suspicious/noExplicitAny: Implementation signature for overloads
export function eq(column: Column, value: any): FilterExpression {
  return new FilterExpression("eq", [column, value]);
}

/**
 * Not equal operator - checks if column does not equal a value or another column.
 *
 * @example
 * ne(users.status, "inactive")     // status not equal to "inactive"
 * ne(users.id, contacts.id_user)   // cross-table comparison
 */
export function ne<TOutput, TInput>(
  column1: Column<TOutput, TInput>,
  column2: Column<TOutput, TInput> | NoInfer<TInput>,
): FilterExpression;
// biome-ignore lint/suspicious/noExplicitAny: Implementation signature for overloads
export function ne(column: Column, value: any): FilterExpression {
  return new FilterExpression("ne", [column, value]);
}

/**
 * Greater than operator - checks if column is greater than a value.
 *
 * @example
 * gt(users.age, 18)               // age greater than 18
 */
export function gt<TOutput extends number | string | Date | null, TInput>(
  column: Column<TOutput, TInput>,
  value: NoInfer<TInput>,
): FilterExpression {
  return new FilterExpression("gt", [column, value]);
}

/**
 * Greater than or equal operator - checks if column is >= a value.
 *
 * @example
 * gte(users.age, 18)              // age >= 18
 */
export function gte<TOutput extends number | string | Date | null, TInput>(
  column: Column<TOutput, TInput>,
  value: NoInfer<TInput>,
): FilterExpression {
  return new FilterExpression("gte", [column, value]);
}

/**
 * Less than operator - checks if column is less than a value.
 *
 * @example
 * lt(users.age, 65)               // age less than 65
 */
export function lt<TOutput extends number | string | Date | null, TInput>(
  column: Column<TOutput, TInput>,
  value: NoInfer<TInput>,
): FilterExpression {
  return new FilterExpression("lt", [column, value]);
}

/**
 * Less than or equal operator - checks if column is <= a value.
 *
 * @example
 * lte(users.age, 65)              // age <= 65
 */
export function lte<TOutput extends number | string | Date | null, TInput>(
  column: Column<TOutput, TInput>,
  value: NoInfer<TInput>,
): FilterExpression {
  return new FilterExpression("lte", [column, value]);
}

// ============================================================================
// String Operators
// ============================================================================

/**
 * Contains operator - checks if a string column contains a substring.
 *
 * @example
 * contains(users.name, "John")    // name contains "John"
 */
export function contains<TOutput, TInput>(column: Column<TOutput, TInput>, value: NoInfer<TInput>): FilterExpression {
  return new FilterExpression("contains", [column, value]);
}

/**
 * Starts with operator - checks if a string column starts with a prefix.
 *
 * @example
 * startsWith(users.email, "admin") // email starts with "admin"
 */
export function startsWith<TOutput, TInput>(column: Column<TOutput, TInput>, value: NoInfer<TInput>): FilterExpression {
  return new FilterExpression("startsWith", [column, value]);
}

/**
 * Ends with operator - checks if a string column ends with a suffix.
 *
 * @example
 * endsWith(users.email, "@example.com") // email ends with "@example.com"
 */
export function endsWith<TOutput, TInput>(column: Column<TOutput, TInput>, value: NoInfer<TInput>): FilterExpression {
  return new FilterExpression("endsWith", [column, value]);
}

/**
 * Matches pattern operator - checks if a string column matches a regex pattern.
 *
 * @example
 * matchesPattern(users.name, "^A.*e$") // name matches regex pattern
 */
export function matchesPattern<TOutput extends string | null, TInput>(
  column: Column<TOutput, TInput>,
  pattern: string,
): FilterExpression {
  return new FilterExpression("matchesPattern", [column, pattern]);
}

// ============================================================================
// String Transform Functions
// ============================================================================

/**
 * Wraps a column with OData `tolower()` for case-insensitive comparisons.
 *
 * @example
 * eq(tolower(users.name), "john") // tolower(name) eq 'john'
 */
export function tolower<TOutput extends string | null, TInput, TableName extends string, IsContainer extends boolean>(
  column: Column<TOutput, TInput, TableName, IsContainer>,
): ColumnFunction<TOutput, TInput, TableName, IsContainer> {
  return new ColumnFunction("tolower", column);
}

/**
 * Wraps a column with OData `toupper()` for case-insensitive comparisons.
 *
 * @example
 * eq(toupper(users.name), "JOHN") // toupper(name) eq 'JOHN'
 */
export function toupper<TOutput extends string | null, TInput, TableName extends string, IsContainer extends boolean>(
  column: Column<TOutput, TInput, TableName, IsContainer>,
): ColumnFunction<TOutput, TInput, TableName, IsContainer> {
  return new ColumnFunction("toupper", column);
}

/**
 * Wraps a column with OData `trim()` to remove leading/trailing whitespace.
 *
 * @example
 * eq(trim(users.name), "John") // trim(name) eq 'John'
 */
export function trim<TOutput extends string | null, TInput, TableName extends string, IsContainer extends boolean>(
  column: Column<TOutput, TInput, TableName, IsContainer>,
): ColumnFunction<TOutput, TInput, TableName, IsContainer> {
  return new ColumnFunction("trim", column);
}

// ============================================================================
// Array Operators
// ============================================================================

/**
 * In array operator - checks if column value is in an array of values.
 *
 * @example
 * inArray(users.status, ["active", "pending"]) // status is "active" or "pending"
 */
export function inArray<TOutput, TInput>(column: Column<TOutput, TInput>, values: NoInfer<TInput>[]): FilterExpression {
  return new FilterExpression("in", [column, values]);
}

/**
 * Not in array operator - checks if column value is not in an array of values.
 *
 * @example
 * notInArray(users.status, ["deleted", "banned"]) // status is neither "deleted" nor "banned"
 */
export function notInArray<TOutput, TInput>(
  column: Column<TOutput, TInput>,
  values: NoInfer<TInput>[],
): FilterExpression {
  return new FilterExpression("notIn", [column, values]);
}

// ============================================================================
// Null Check Operators
// ============================================================================

/**
 * Is null operator - checks if column value is null.
 *
 * @example
 * isNull(users.deletedAt)         // deletedAt is null
 */
export function isNull<TOutput, TInput>(column: Column<TOutput, TInput>): FilterExpression {
  return new FilterExpression("isNull", [column]);
}

/**
 * Is not null operator - checks if column value is not null.
 *
 * @example
 * isNotNull(users.email)          // email is not null
 */
export function isNotNull<TOutput, TInput>(column: Column<TOutput, TInput>): FilterExpression {
  return new FilterExpression("isNotNull", [column]);
}

// ============================================================================
// Logical Operators
// ============================================================================

/**
 * AND operator - combines multiple filter expressions with logical AND.
 * All expressions must be true for the record to match.
 *
 * @example
 * and(
 *   eq(users.active, true),
 *   gt(users.age, 18)
 * ) // active is true AND age > 18
 */
export function and(...expressions: FilterExpression[]): FilterExpression {
  if (expressions.length === 0) {
    throw new Error("AND operator requires at least one expression");
  }
  if (expressions.length === 1 && expressions[0] !== undefined) {
    return expressions[0];
  }
  return new FilterExpression("and", expressions);
}

/**
 * OR operator - combines multiple filter expressions with logical OR.
 * At least one expression must be true for the record to match.
 *
 * @example
 * or(
 *   eq(users.role, "admin"),
 *   eq(users.role, "moderator")
 * ) // role is "admin" OR "moderator"
 */
export function or(...expressions: FilterExpression[]): FilterExpression {
  if (expressions.length === 0) {
    throw new Error("OR operator requires at least one expression");
  }
  if (expressions.length === 1 && expressions[0] !== undefined) {
    return expressions[0];
  }
  return new FilterExpression("or", expressions);
}

/**
 * NOT operator - negates a filter expression.
 *
 * @example
 * not(eq(users.status, "deleted")) // status is NOT "deleted"
 */
export function not(expression: FilterExpression): FilterExpression {
  return new FilterExpression("not", [expression]);
}

// ============================================================================
// OrderBy Operators
// ============================================================================

/**
 * OrderByExpression represents a sort order specification for a column.
 * Used in orderBy() clauses to provide type-safe sorting with direction.
 */
export class OrderByExpression<TableName extends string = string> {
  // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any Column configuration
  readonly column: Column<any, any, TableName>;
  readonly direction: "asc" | "desc";

  // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any Column configuration
  constructor(column: Column<any, any, TableName>, direction: "asc" | "desc") {
    this.column = column;
    this.direction = direction;
  }
}

/**
 * Type guard to check if a value is an OrderByExpression instance.
 */
// biome-ignore lint/suspicious/noExplicitAny: Type guard accepting any value type
export function isOrderByExpression(value: any): value is OrderByExpression {
  return value instanceof OrderByExpression;
}

/**
 * Ascending order operator - sorts a column in ascending order.
 *
 * @example
 * asc(users.name)  // Sort by name ascending
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any Column configuration
export function asc<TableName extends string>(column: Column<any, any, TableName>): OrderByExpression<TableName> {
  return new OrderByExpression(column, "asc");
}

/**
 * Descending order operator - sorts a column in descending order.
 *
 * @example
 * desc(users.age)  // Sort by age descending
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any Column configuration
export function desc<TableName extends string>(column: Column<any, any, TableName>): OrderByExpression<TableName> {
  return new OrderByExpression(column, "desc");
}
