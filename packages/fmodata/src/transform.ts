import type { FMTable } from "./orm/table";
import {
  getBaseTableConfig,
  getFieldId,
  getFieldName,
  getTableId,
  getTableName,
  isUsingEntityIds,
} from "./orm/table";
import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * Transforms field names to FileMaker field IDs (FMFID) in an object
 * @param data - Object with field names as keys
 * @param table - FMTable instance to get field IDs from
 * @returns Object with FMFID keys instead of field names
 */
export function transformFieldNamesToIds<T extends Record<string, any>>(
  data: T,
  table: FMTable<any, any>,
): Record<string, any> {
  const config = getBaseTableConfig(table);
  if (!config.fmfIds) {
    return data;
  }

  const transformed: Record<string, any> = {};
  for (const [fieldName, value] of Object.entries(data)) {
    const fieldId = getFieldId(table, fieldName);
    transformed[fieldId] = value;
  }
  return transformed;
}

/**
 * Transforms FileMaker field IDs (FMFID) to field names in an object
 * @param data - Object with FMFID keys
 * @param table - FMTable instance to get field names from
 * @returns Object with field names as keys instead of FMFIDs
 */
export function transformFieldIdsToNames<T extends Record<string, any>>(
  data: T,
  table: FMTable<any, any>,
): Record<string, any> {
  const config = getBaseTableConfig(table);
  if (!config.fmfIds) {
    return data;
  }

  const transformed: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    // Check if this is an OData metadata field (starts with @)
    if (key.startsWith("@")) {
      transformed[key] = value;
      continue;
    }

    const fieldName = getFieldName(table, key);
    transformed[fieldName] = value;
  }
  return transformed;
}

/**
 * Transforms a field name to FMFID or returns the field name if not using IDs
 * @param fieldName - The field name to transform
 * @param table - FMTable instance to get field ID from
 * @returns The FMFID or field name
 */
export function transformFieldName(
  fieldName: string,
  table: FMTable<any, any>,
): string {
  return getFieldId(table, fieldName);
}

/**
 * Transforms a table name to FMTID or returns the name if not using IDs
 * @param table - FMTable instance to get table ID from
 * @returns The FMTID or table name
 */
export function transformTableName(table: FMTable<any, any>): string {
  return getTableId(table);
}

/**
 * Gets both table name and ID from a table
 * @param table - FMTable instance
 * @returns Object with name (always present) and id (may be undefined if not using IDs)
 */
export function getTableIdentifiers(
  table: FMTable<any, any>,
): { name: string; id: string | undefined } {
  return {
    name: getTableName(table),
    id: isUsingEntityIds(table) ? getTableId(table) : undefined,
  };
}

/**
 * Transforms response data by converting field IDs back to field names recursively.
 * Handles both single records and arrays of records, as well as nested expand relationships.
 *
 * @param data - Response data from FileMaker (can be single record, array, or wrapped in value property)
 * @param table - FMTable instance for the main table
 * @param expandConfigs - Configuration for expanded relations (optional)
 * @returns Transformed data with field names instead of IDs
 */
export function transformResponseFields(
  data: any,
  table: FMTable<any, any>,
  expandConfigs?: Array<{
    relation: string;
    table?: FMTable<any, any>;
  }>,
): any {
  const config = getBaseTableConfig(table);
  if (!config.fmfIds) {
    return data;
  }

  // Handle null/undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle OData list response with value array
  if (data.value && Array.isArray(data.value)) {
    return {
      ...data,
      value: data.value.map((record: any) =>
        transformSingleRecord(record, table, expandConfigs),
      ),
    };
  }

  // Handle array of records
  if (Array.isArray(data)) {
    return data.map((record) =>
      transformSingleRecord(record, table, expandConfigs),
    );
  }

  // Handle single record
  return transformSingleRecord(data, table, expandConfigs);
}

/**
 * Transforms a single record, converting field IDs to names and handling nested expands
 */
function transformSingleRecord(
  record: any,
  table: FMTable<any, any>,
  expandConfigs?: Array<{
    relation: string;
    table?: FMTable<any, any>;
  }>,
): any {
  if (!record || typeof record !== "object") {
    return record;
  }

  const transformed: Record<string, any> = {};

  for (const [key, value] of Object.entries(record)) {
    // Preserve OData metadata fields
    if (key.startsWith("@")) {
      transformed[key] = value;
      continue;
    }

    // Check if this is an expanded relation (by relation name)
    let expandConfig = expandConfigs?.find((ec) => ec.relation === key);

    // If not found by relation name, check if this key is a FMTID
    // (FileMaker returns expanded relations with FMTID keys when using entity IDs)
    if (!expandConfig && key.startsWith("FMTID:")) {
      expandConfig = expandConfigs?.find(
        (ec) =>
          ec.table && isUsingEntityIds(ec.table) && getTableId(ec.table) === key,
      );
    }

    if (expandConfig && expandConfig.table) {
      // Transform the expanded relation data recursively
      // Use the relation name (not the FMTID) as the key
      const relationKey = expandConfig.relation;

      if (Array.isArray(value)) {
        transformed[relationKey] = value.map((nestedRecord) =>
          transformSingleRecord(
            nestedRecord,
            expandConfig.table!,
            undefined, // Don't pass nested expand configs for now
          ),
        );
      } else if (value && typeof value === "object") {
        transformed[relationKey] = transformSingleRecord(
          value,
          expandConfig.table,
          undefined,
        );
      } else {
        transformed[relationKey] = value;
      }
      continue;
    }

    // Transform field ID to field name
    const fieldName = getFieldName(table, key);
    transformed[fieldName] = value;
  }

  return transformed;
}

/**
 * Transforms an array of field names to FMFIDs
 * @param fieldNames - Array of field names
 * @param table - FMTable instance to get field IDs from
 * @returns Array of FMFIDs or field names
 */
export function transformFieldNamesArray(
  fieldNames: string[],
  table: FMTable<any, any>,
): string[] {
  const config = getBaseTableConfig(table);
  if (!config.fmfIds) {
    return fieldNames;
  }

  return fieldNames.map((fieldName) => getFieldId(table, fieldName));
}

/**
 * Transforms a field name in an orderBy string (e.g., "name desc" -> "FMFID:1 desc")
 * @param orderByString - The orderBy string (field name with optional asc/desc)
 * @param table - FMTable instance to get field ID from
 * @returns Transformed orderBy string with FMFID
 */
export function transformOrderByField(
  orderByString: string,
  table: FMTable<any, any> | undefined,
): string {
  if (!table) {
    return orderByString;
  }
  const config = getBaseTableConfig(table);
  if (!config || !config.fmfIds) {
    return orderByString;
  }

  // Parse the orderBy string to extract field name and direction
  const parts = orderByString.trim().split(/\s+/);
  const fieldName = parts[0];
  if (!fieldName) {
    return orderByString;
  }
  const direction = parts[1]; // "asc" or "desc" or undefined

  const fieldId = getFieldId(table, fieldName);
  return direction ? `${fieldId} ${direction}` : fieldId;
}
