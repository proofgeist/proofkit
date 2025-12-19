import type { FMTable } from "../../orm/table";
import { FMTable as FMTableClass } from "../../orm/table";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { getBaseTableConfig } from "../../orm/table";
import { isColumn } from "../../orm/column";

/**
 * Helper function to get container field names from a table.
 * Container fields cannot be selected via $select in FileMaker OData API.
 */
function getContainerFieldNames(table: FMTable<any, any>): string[] {
  const baseTableConfig = getBaseTableConfig(table);
  if (!baseTableConfig || !baseTableConfig.containerFields) {
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
  table: FMTable<any, any> | undefined,
  includeSpecialColumns?: boolean,
): string[] | undefined {
  if (!table) return undefined;

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
    
    return fields;
  }

  if (Array.isArray(defaultSelect)) {
    // Filter out container fields
    return [
      ...new Set(defaultSelect.filter((f) => !containerFields.includes(f))),
    ];
  }

  // Check if defaultSelect is a Record<string, Column> (resolved from function)
  if (
    typeof defaultSelect === "object" &&
    defaultSelect !== null &&
    !Array.isArray(defaultSelect)
  ) {
    // Extract field names from Column instances
    const fieldNames: string[] = [];
    for (const value of Object.values(defaultSelect)) {
      if (isColumn(value)) {
        fieldNames.push(value.fieldName);
      }
    }
    if (fieldNames.length > 0) {
      // Filter out container fields
      return [
        ...new Set(fieldNames.filter((f) => !containerFields.includes(f))),
      ];
    }
  }

  // defaultSelect is "all" or undefined
  return undefined;
}
