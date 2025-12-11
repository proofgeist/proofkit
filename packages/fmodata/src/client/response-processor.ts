import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { BaseTable } from "./base-table";
import type { ExecuteOptions } from "../types";
import type { ExpandValidationConfig } from "../validation";
import { ValidationError, ResponseStructureError } from "../errors";
import { transformResponseFields } from "../transform";
import { validateListResponse, validateRecord } from "../validation";

// Type for raw OData responses
export type ODataResponse<T = unknown> = T & {
  "@odata.context"?: string;
  "@odata.count"?: number;
};

export type ODataListResponse<T = unknown> = ODataResponse<{
  value: T[];
}>;

export type ODataRecordResponse<T = unknown> = ODataResponse<
  T & {
    "@id"?: string;
    "@editLink"?: string;
  }
>;


/**
 * Transform field IDs back to names using the base table configuration
 */
export function applyFieldTransformation<T extends Record<string, unknown>>(
  response: ODataResponse<T> | ODataListResponse<T>,
  baseTable: BaseTable<Record<string, StandardSchemaV1>, any, any, any>,
  expandConfigs?: ExpandValidationConfig[],
): ODataResponse<T> | ODataListResponse<T> {
  return transformResponseFields(response, baseTable, expandConfigs) as
    | ODataResponse<T>
    | ODataListResponse<T>;
}

/**
 * Apply schema validation and transformation to data
 */
export async function applyValidation<T extends Record<string, unknown>>(
  data: T | T[],
  schema?: Record<string, StandardSchemaV1>,
  selectedFields?: (keyof T)[],
  expandConfigs?: ExpandValidationConfig[],
): Promise<
  | { valid: true; data: T | T[] }
  | { valid: false; error: ValidationError | ResponseStructureError }
> {
  if (Array.isArray(data)) {
    // Validate as a list
    const validation = await validateListResponse<T>(
      { value: data },
      schema,
      selectedFields as string[] | undefined,
      expandConfigs,
    );
    if (!validation.valid) {
      return { valid: false, error: validation.error };
    }
    return { valid: true, data: validation.data };
  } else {
    // Validate as a single record
    const validation = await validateRecord<T>(
      data,
      schema,
      selectedFields,
      expandConfigs,
    );
    if (!validation.valid) {
      return { valid: false, error: validation.error };
    }
    return { valid: true, data: validation.data };
  }
}

/**
 * Extract value array from OData list response, or wrap single record in array
 */
export function extractListValue<T>(
  response: ODataListResponse<T> | ODataRecordResponse<T>,
): T[] {
  if ("value" in response && Array.isArray(response.value)) {
    return response.value;
  }
  // Single record responses return the record directly
  return [response as T];
}
