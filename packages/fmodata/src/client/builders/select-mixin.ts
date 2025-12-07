import { InternalLogger } from "../../logger";
import { isColumn, type Column } from "../../orm/column";

/**
 * Utility function for processing select() calls.
 * Used by both QueryBuilder and RecordBuilder to eliminate duplication.
 *
 * @param fields - Field names or Column references
 * @returns Object with selectedFields array
 */
export function processSelectFields(
  ...fields: (string | Column<any, any, string>)[]
): { selectedFields: string[] } {
  const fieldNames = fields.map((field) => {
    if (isColumn(field)) {
      return field.fieldName as string;
    }
    return String(field);
  });
  return { selectedFields: [...new Set(fieldNames)] };
}

/**
 * Processes select() calls with field renaming support.
 * Validates columns belong to the correct table and builds field mapping for renamed fields.
 * Used by both QueryBuilder and RecordBuilder to eliminate duplication.
 *
 * @param fields - Object mapping output keys to column references
 * @param tableName - Expected table name for validation
 * @returns Object with selectedFields array and fieldMapping for renamed fields
 */
export function processSelectWithRenames<TTableName extends string>(
  fields: Record<string, Column<any, any, TTableName>>,
  tableName: string,
  logger: InternalLogger,
): { selectedFields: string[]; fieldMapping: Record<string, string> } {
  const selectedFields: string[] = [];
  const fieldMapping: Record<string, string> = {};

  for (const [outputKey, column] of Object.entries(fields)) {
    if (!isColumn(column)) {
      throw new Error(
        `select() expects column references, but got: ${typeof column}`,
      );
    }

    // Warn (not throw) on table mismatch for consistency
    if (column.tableName !== tableName) {
      logger.warn(
        `Column ${column.toString()} is from table "${column.tableName}", but query is for table "${tableName}"`,
      );
    }

    const fieldName = column.fieldName;
    selectedFields.push(fieldName);

    // Build mapping from field name to output key (only if renamed)
    if (fieldName !== outputKey) {
      fieldMapping[fieldName] = outputKey;
    }
  }

  return {
    selectedFields,
    fieldMapping: Object.keys(fieldMapping).length > 0 ? fieldMapping : {},
  };
}

/**
 * Legacy class name for backward compatibility.
 * @deprecated Use processSelectFields function instead
 */
export class SelectMixin {
  static processSelect = processSelectFields;
}
