import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { QueryOptions } from "odata-query";
import type { FMTable } from "../../orm/table";
import type { Result } from "../../types";
import { RecordCountMismatchError } from "../../errors";
import { transformResponseFields } from "../../transform";
import { validateListResponse, validateSingleResponse } from "../../validation";
import type { ExpandValidationConfig } from "../../validation";
import type { ExpandConfig } from "./expand-builder";
import { FMTable as FMTableClass } from "../../orm/table";
import { InternalLogger } from "../../logger";

/**
 * Configuration for processing query responses
 */
export interface ProcessQueryResponseConfig<T> {
  occurrence?: FMTable<any, any>;
  singleMode: "exact" | "maybe" | false;
  queryOptions: Partial<QueryOptions<T>>;
  expandConfigs: ExpandConfig[];
  skipValidation?: boolean;
  useEntityIds?: boolean;
  // Mapping from field names to output keys (for renamed fields in select)
  fieldMapping?: Record<string, string>;
  logger: InternalLogger;
}

/**
 * Builds expand validation configs from internal expand configurations.
 * These are used to validate expanded navigation properties.
 */
function buildExpandValidationConfigs(
  configs: ExpandConfig[],
): ExpandValidationConfig[] {
  return configs.map((config) => {
    // Get target table/occurrence from config (stored during expand call)
    const targetTable = config.targetTable;

    // Extract schema from target table/occurrence
    let targetSchema: Record<string, StandardSchemaV1> | undefined;
    if (targetTable) {
      const tableSchema = (targetTable as any)[FMTableClass.Symbol.Schema];
      if (tableSchema) {
        const zodSchema = tableSchema["~standard"]?.schema;
        if (
          zodSchema &&
          typeof zodSchema === "object" &&
          "shape" in zodSchema
        ) {
          targetSchema = zodSchema.shape as Record<string, StandardSchemaV1>;
        }
      }
    }

    // Extract selected fields from options
    const selectedFields = config.options?.select
      ? Array.isArray(config.options.select)
        ? config.options.select.map((f) => String(f))
        : [String(config.options.select)]
      : undefined;

    return {
      relation: config.relation,
      targetSchema: targetSchema,
      targetTable: targetTable,
      table: targetTable, // For transformation
      selectedFields: selectedFields,
      nestedExpands: undefined, // TODO: Handle nested expands if needed
    };
  });
}

/**
 * Extracts records from response data without validation.
 * Handles both single and list responses.
 */
function extractRecords(
  data: any,
  singleMode: "exact" | "maybe" | false,
): Result<any> {
  const resp = data as any;
  if (singleMode !== false) {
    const records = resp.value ?? [resp];
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
        return {
          data: undefined,
          error: new RecordCountMismatchError("one", 0),
        };
      }
      return { data: null as any, error: undefined };
    }

    const record = Array.isArray(records) ? records[0] : records;
    return { data: record as any, error: undefined };
  } else {
    // Handle list response structure
    const records = resp.value ?? [];
    return { data: records as any, error: undefined };
  }
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
 * Processes a query response by transforming field IDs and validating the data.
 * This function consolidates the response processing logic that was duplicated
 * across multiple navigation branches in QueryBuilder.execute().
 */
export async function processQueryResponse<T>(
  response: any,
  config: ProcessQueryResponseConfig<T>,
): Promise<Result<any>> {
  const { occurrence, singleMode, skipValidation, useEntityIds, fieldMapping } =
    config;

  // Transform response if needed
  let data = response;
  if (occurrence && useEntityIds) {
    const expandValidationConfigs = buildExpandValidationConfigs(
      config.expandConfigs,
    );
    data = transformResponseFields(
      response,
      occurrence,
      expandValidationConfigs,
    );
  }

  // Skip validation path
  if (skipValidation) {
    const result = extractRecords(data, singleMode);
    // Rename fields AFTER extraction (but before returning)
    if (result.data && fieldMapping && Object.keys(fieldMapping).length > 0) {
      return {
        ...result,
        data: renameFieldsInResponse(result.data, fieldMapping),
      };
    }
    return result;
  }

  // Validation path
  // Get schema from occurrence if available
  let schema: Record<string, StandardSchemaV1> | undefined;
  if (occurrence) {
    const tableSchema = (occurrence as any)[FMTableClass.Symbol.Schema];
    if (tableSchema) {
      const zodSchema = tableSchema["~standard"]?.schema;
      if (zodSchema && typeof zodSchema === "object" && "shape" in zodSchema) {
        schema = zodSchema.shape as Record<string, StandardSchemaV1>;
      }
    }
  }

  const selectedFields = config.queryOptions.select
    ? ((Array.isArray(config.queryOptions.select)
        ? config.queryOptions.select.map((f) => String(f))
        : [String(config.queryOptions.select)]) as (keyof T)[])
    : undefined;
  const expandValidationConfigs = buildExpandValidationConfigs(
    config.expandConfigs,
  );

  // Validate with original field names
  const validationResult =
    singleMode !== false
      ? await validateSingleResponse(
          data,
          schema,
          selectedFields as string[] | undefined,
          expandValidationConfigs,
          singleMode,
        )
      : await validateListResponse(
          data,
          schema,
          selectedFields as string[] | undefined,
          expandValidationConfigs,
        );

  if (!validationResult.valid) {
    return { data: undefined, error: validationResult.error };
  }

  // Rename fields AFTER validation completes
  if (fieldMapping && Object.keys(fieldMapping).length > 0) {
    return {
      data: renameFieldsInResponse(validationResult.data, fieldMapping),
      error: undefined,
    };
  }

  return { data: validationResult.data as any, error: undefined };
}
