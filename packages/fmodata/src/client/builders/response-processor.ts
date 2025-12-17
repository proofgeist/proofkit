import type { FMTable } from "../../orm/table";
import type { Result } from "../../types";
import type { ExpandValidationConfig } from "../../validation";
import { validateSingleResponse, validateListResponse } from "../../validation";
import { transformResponseFields } from "../../transform";
import { RecordCountMismatchError } from "../../errors";
import { getBaseTableConfig } from "../../orm/table";
import { ExpandBuilder } from "./expand-builder";
import type { ExpandConfig } from "./shared-types";
import { InternalLogger } from "../../logger";

export interface ProcessResponseConfig {
  table?: FMTable<any, any>;
  schema?: Record<string, any>;
  singleMode: "exact" | "maybe" | false;
  selectedFields?: string[];
  expandValidationConfigs?: ExpandValidationConfig[];
  skipValidation?: boolean;
  useEntityIds?: boolean;
  includeSpecialColumns?: boolean;
  // Mapping from field names to output keys (for renamed fields in select)
  fieldMapping?: Record<string, string>;
}

/**
 * Processes OData response with transformation and validation.
 * Shared by QueryBuilder and RecordBuilder.
 */
export async function processODataResponse<T>(
  rawResponse: any,
  config: ProcessResponseConfig,
): Promise<Result<T>> {
  const {
    table,
    schema,
    singleMode,
    selectedFields,
    expandValidationConfigs,
    skipValidation,
    useEntityIds,
    includeSpecialColumns,
    fieldMapping,
  } = config;

  // Transform field IDs back to names if using entity IDs
  let response = rawResponse;
  if (table && useEntityIds) {
    response = transformResponseFields(
      response,
      table,
      expandValidationConfigs,
    );
  }

  // Fast path: skip validation
  if (skipValidation) {
    const result = extractRecords(response, singleMode);
    // Rename fields AFTER extraction (but before returning)
    if (result.data && fieldMapping && Object.keys(fieldMapping).length > 0) {
      if (result.error) {
        return { data: undefined, error: result.error } as Result<T>;
      }
      return {
        data: renameFieldsInResponse(result.data, fieldMapping) as T,
        error: undefined,
      };
    }
    return result as Result<T>;
  }

  // Validation path
  // Note: Special columns are excluded when using QueryBuilder.single() method,
  // but included for RecordBuilder.get() method (both use singleMode: "exact")
  // The exclusion is handled in QueryBuilder's processQueryResponse, not here
  if (singleMode !== false) {
    const validation = await validateSingleResponse<any>(
      response,
      schema,
      selectedFields as any,
      expandValidationConfigs,
      singleMode,
      includeSpecialColumns,
    );

    if (!validation.valid) {
      return { data: undefined, error: validation.error };
    }

    // Rename fields AFTER validation completes
    if (fieldMapping && Object.keys(fieldMapping).length > 0) {
      return {
        data: renameFieldsInResponse(validation.data, fieldMapping) as T,
        error: undefined,
      };
    }

    return { data: validation.data as T, error: undefined };
  }

  const validation = await validateListResponse<any>(
    response,
    schema,
    selectedFields as any,
    expandValidationConfigs,
    includeSpecialColumns,
  );

  if (!validation.valid) {
    return { data: undefined, error: validation.error };
  }

  // Rename fields AFTER validation completes
  if (fieldMapping && Object.keys(fieldMapping).length > 0) {
    return {
      data: renameFieldsInResponse(validation.data, fieldMapping) as T,
      error: undefined,
    };
  }

  return { data: validation.data as T, error: undefined };
}

/**
 * Extracts records from response without validation.
 */
function extractRecords<T>(
  response: any,
  singleMode: "exact" | "maybe" | false,
): Result<T> {
  if (singleMode === false) {
    const records = response.value ?? [];
    return { data: records as T, error: undefined };
  }

  const records = response.value ?? [response];
  const count = Array.isArray(records) ? records.length : 1;

  if (count > 1) {
    return {
      data: undefined,
      error: new RecordCountMismatchError(
        singleMode === "exact" ? "one" : "at-most-one",
        count,
      ),
    };
  }

  if (count === 0) {
    if (singleMode === "exact") {
      return { data: undefined, error: new RecordCountMismatchError("one", 0) };
    }
    return { data: null as T, error: undefined };
  }

  const record = Array.isArray(records) ? records[0] : records;
  return { data: record as T, error: undefined };
}

/**
 * Gets schema from a table occurrence, excluding container fields.
 * Container fields are never returned in regular responses (only via getSingleField).
 */
export function getSchemaFromTable(
  table: FMTable<any, any> | undefined,
): Record<string, any> | undefined {
  if (!table) return undefined;
  const baseTableConfig = getBaseTableConfig(table);
  const containerFields = baseTableConfig.containerFields || [];

  // Filter out container fields from schema
  const schema = { ...baseTableConfig.schema };
  for (const containerField of containerFields) {
    delete schema[containerField as string];
  }

  return schema;
}

/**
 * Renames fields in response data according to the field mapping.
 * Used when select() is called with renamed fields (e.g., { userEmail: users.email }).
 */
function renameFieldsInResponse(
  data: any,
  fieldMapping: Record<string, string>,
): any {
  if (!data || typeof data !== "object") {
    return data;
  }

  // Handle array responses
  if (Array.isArray(data)) {
    return data.map((item) => renameFieldsInResponse(item, fieldMapping));
  }

  // Handle OData list response structure
  if ("value" in data && Array.isArray(data.value)) {
    return {
      ...data,
      value: data.value.map((item: any) =>
        renameFieldsInResponse(item, fieldMapping),
      ),
    };
  }

  // Handle single record
  const renamed: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    // Check if this field should be renamed
    const outputKey = fieldMapping[key];
    if (outputKey) {
      renamed[outputKey] = value;
    } else {
      renamed[key] = value;
    }
  }
  return renamed;
}

/**
 * Processes query response with expand configs.
 * This is a convenience wrapper that builds validation configs from expand configs.
 */
export async function processQueryResponse<T>(
  response: any,
  config: {
    occurrence?: FMTable<any, any>;
    singleMode: "exact" | "maybe" | false;
    queryOptions: { select?: (keyof T)[] | string[] };
    expandConfigs: ExpandConfig[];
    skipValidation?: boolean;
    useEntityIds?: boolean;
    includeSpecialColumns?: boolean;
    // Mapping from field names to output keys (for renamed fields in select)
    fieldMapping?: Record<string, string>;
    logger: InternalLogger;
  },
): Promise<Result<any>> {
  const {
    occurrence,
    singleMode,
    queryOptions,
    expandConfigs,
    skipValidation,
    useEntityIds,
    includeSpecialColumns,
    fieldMapping,
    logger,
  } = config;

  const expandBuilder = new ExpandBuilder(useEntityIds ?? false, logger);
  const expandValidationConfigs =
    expandBuilder.buildValidationConfigs(expandConfigs);

  const selectedFields = queryOptions.select
    ? Array.isArray(queryOptions.select)
      ? queryOptions.select.map(String)
      : [String(queryOptions.select)]
    : undefined;

  // Process the response first
  let processedResponse = await processODataResponse(response, {
    table: occurrence,
    schema: getSchemaFromTable(occurrence),
    singleMode,
    selectedFields,
    expandValidationConfigs,
    skipValidation,
    useEntityIds,
    includeSpecialColumns,
  });

  // Rename fields if field mapping is provided (for renamed fields in select)
  if (
    processedResponse.data &&
    fieldMapping &&
    Object.keys(fieldMapping).length > 0
  ) {
    processedResponse = {
      ...processedResponse,
      data: renameFieldsInResponse(processedResponse.data, fieldMapping),
    };
  }

  return processedResponse;
}
