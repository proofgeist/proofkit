import { isColumn } from "../../orm/column";
import type { FMTable } from "../../orm/table";
import { FMTable as FMTableClass, getBaseTableConfig } from "../../orm/table";

/**
 * Helper function to get container field names from a table.
 * Container fields cannot be selected via $select in FileMaker OData API.
 */
// biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
function getContainerFieldNames(table: FMTable<any, any>): string[] {
  const baseTableConfig = getBaseTableConfig(table);
  if (!baseTableConfig?.containerFields) {
    return [];
  }
  return baseTableConfig.containerFields as string[];
}

/**
 * Gets default select fields from a table definition.
 * Returns undefined if defaultSelect is "all".
 * Automatically filters out container fields since they cannot be selected via $select.
 *
 * @param table - The table occurrence
 * @param includeSpecialColumns - If true, includes ROWID and ROWMODID when defaultSelect is "schema"
 */
export function getDefaultSelectFields(
  // biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
  table: FMTable<any, any> | undefined,
  includeSpecialColumns?: boolean,
): string[] | undefined {
  if (!table) {
    return undefined;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Type assertion for Symbol property access
  const defaultSelect = (table as any)[FMTableClass.Symbol.DefaultSelect];
  const containerFields = getContainerFieldNames(table);

  if (defaultSelect === "schema") {
    const baseTableConfig = getBaseTableConfig(table);
    const allFields = Object.keys(baseTableConfig.schema);
    // Filter out container fields
    const fields = [...new Set(allFields.filter((f) => !containerFields.includes(f)))];

    // Add special columns if requested
    if (includeSpecialColumns) {
      fields.push("ROWID", "ROWMODID");
    }

    // Return undefined (meaning "all") when schema has no fields with validators,
    // rather than an empty array which would generate an empty $select=
    return fields.length > 0 ? fields : undefined;
  }

  if (Array.isArray(defaultSelect)) {
    // Filter out container fields
    return [...new Set(defaultSelect.filter((f) => !containerFields.includes(f)))];
  }

  // Check if defaultSelect is a Record<string, Column> (resolved from function)
  if (typeof defaultSelect === "object" && defaultSelect !== null && !Array.isArray(defaultSelect)) {
    // Extract field names from Column instances
    const fieldNames: string[] = [];
    for (const value of Object.values(defaultSelect)) {
      if (isColumn(value)) {
        fieldNames.push(value.fieldName);
      }
    }
    if (fieldNames.length > 0) {
      // Filter out container fields
      return [...new Set(fieldNames.filter((f) => !containerFields.includes(f)))];
    }
  }

  // defaultSelect is "all" or undefined
  return undefined;
}
