import type { ODataRecordMetadata } from "./types";
import { StandardSchemaV1 } from "@standard-schema/spec";
import type { FMTable } from "./orm/table";
import {
  ValidationError,
  ResponseStructureError,
  RecordCountMismatchError,
} from "./errors";

/**
 * Validates and transforms input data for insert/update operations.
 * Applies input validators (writeValidators) to transform user input to database format.
 * Fields without input validators are passed through unchanged.
 *
 * @param data - The input data to validate and transform
 * @param inputSchema - Optional schema containing input validators for each field
 * @returns Transformed data ready to send to the server
 * @throws ValidationError if any field fails validation
 */
export async function validateAndTransformInput<T extends Record<string, any>>(
  data: Partial<T>,
  inputSchema?: Record<string, StandardSchemaV1>,
): Promise<Partial<T>> {
  // If no input schema, return data as-is
  if (!inputSchema) {
    return data;
  }

  const transformedData: Record<string, any> = { ...data };

  // Process each field that has an input validator
  for (const [fieldName, fieldSchema] of Object.entries(inputSchema)) {
    // Only process fields that are present in the input data
    if (fieldName in data) {
      const inputValue = data[fieldName];

      try {
        // Run the input validator to transform the value
        let result = fieldSchema["~standard"].validate(inputValue);
        if (result instanceof Promise) {
          result = await result;
        }

        // Check for validation errors
        if (result.issues) {
          throw new ValidationError(
            `Input validation failed for field '${fieldName}'`,
            result.issues,
            {
              field: fieldName,
              value: inputValue,
              cause: result.issues,
            },
          );
        }

        // Store the transformed value
        transformedData[fieldName] = result.value;
      } catch (error) {
        // If it's already a ValidationError, re-throw it
        if (error instanceof ValidationError) {
          throw error;
        }

        // Otherwise, wrap the error
        throw new ValidationError(
          `Input validation failed for field '${fieldName}'`,
          [],
          {
            field: fieldName,
            value: inputValue,
            cause: error,
          },
        );
      }
    }
  }

  // Fields without input validators are already in transformedData (passed through)
  return transformedData as Partial<T>;
}

// Type for expand validation configuration
export type ExpandValidationConfig = {
  relation: string;
  targetSchema?: Record<string, StandardSchemaV1>;
  targetTable?: FMTable<any, any>;
  table?: FMTable<any, any>; // For transformation
  selectedFields?: string[];
  nestedExpands?: ExpandValidationConfig[];
};

/**
 * Validates a single record against a schema, only validating selected fields.
 * Also validates expanded relations if expandConfigs are provided.
 */
export async function validateRecord<T extends Record<string, any>>(
  record: any,
  schema: Record<string, StandardSchemaV1> | undefined,
  selectedFields?: (keyof T)[],
  expandConfigs?: ExpandValidationConfig[],
  includeSpecialColumns?: boolean,
): Promise<
  | { valid: true; data: T & ODataRecordMetadata }
  | { valid: false; error: ValidationError }
> {
  // Extract OData metadata fields (don't validate them - include if present)
  const { "@id": id, "@editLink": editLink, ...rest } = record;

  // Only include metadata fields if they actually exist and have values
  const metadata: Partial<ODataRecordMetadata> = {};
  if (id) metadata["@id"] = id;
  if (editLink) metadata["@editLink"] = editLink;

  // If no schema, just return the data with metadata
  // Exclude special columns if includeSpecialColumns is false
  if (!schema) {
    const { ROWID, ROWMODID, ...restWithoutSystemFields } = rest;
    const specialColumns: { ROWID?: number; ROWMODID?: number } = {};
    if (includeSpecialColumns) {
      if (ROWID !== undefined) specialColumns.ROWID = ROWID;
      if (ROWMODID !== undefined) specialColumns.ROWMODID = ROWMODID;
    }
    return {
      valid: true,
      data: {
        ...restWithoutSystemFields,
        ...specialColumns,
        ...metadata,
      } as T & ODataRecordMetadata,
    };
  }

  // Extract FileMaker special columns - preserve them if includeSpecialColumns is enabled
  // Note: Special columns are excluded when using single() method (per OData spec behavior)
  const { ROWID, ROWMODID, ...restWithoutSystemFields } = rest;
  const specialColumns: { ROWID?: number; ROWMODID?: number } = {};
  // Only include special columns if explicitly enabled (they're excluded for single() by design)
  if (includeSpecialColumns) {
    if (ROWID !== undefined) specialColumns.ROWID = ROWID;
    if (ROWMODID !== undefined) specialColumns.ROWMODID = ROWMODID;
  }

  // If selected fields are specified, validate only those fields
  if (selectedFields && selectedFields.length > 0) {
    const validatedRecord: Record<string, any> = {};

    for (const field of selectedFields) {
      const fieldName = String(field);
      const fieldSchema = schema[fieldName];

      if (fieldSchema) {
        const input = rest[fieldName];
        try {
          let result = fieldSchema["~standard"].validate(input);
          if (result instanceof Promise) result = await result;

          // if the `issues` field exists, the validation failed
          if (result.issues) {
            return {
              valid: false,
              error: new ValidationError(
                `Validation failed for field '${fieldName}'`,
                result.issues,
                {
                  field: fieldName,
                  value: input,
                  cause: result.issues,
                },
              ),
            };
          }

          validatedRecord[fieldName] = result.value;
        } catch (originalError) {
          // If the validator throws directly, wrap it
          return {
            valid: false,
            error: new ValidationError(
              `Validation failed for field '${fieldName}'`,
              [],
              {
                field: fieldName,
                value: input,
                cause: originalError,
              },
            ),
          };
        }
      } else {
        // For fields not in schema (like when explicitly selecting ROWID/ROWMODID)
        // Check if it's a special column that was destructured earlier
        if (fieldName === "ROWID" || fieldName === "ROWMODID") {
          // Use the destructured value since it was removed from rest
          if (fieldName === "ROWID" && ROWID !== undefined) {
            validatedRecord[fieldName] = ROWID;
          } else if (fieldName === "ROWMODID" && ROWMODID !== undefined) {
            validatedRecord[fieldName] = ROWMODID;
          }
        } else {
          // For other fields not in schema, include them from the original response
          validatedRecord[fieldName] = rest[fieldName];
        }
      }
    }

    // Validate expanded relations
    if (expandConfigs && expandConfigs.length > 0) {
      for (const expandConfig of expandConfigs) {
        const expandValue = rest[expandConfig.relation];

        // Check if expand field is missing
        if (expandValue === undefined) {
          // Check for inline error array (FileMaker returns errors inline when expand fails)
          if (Array.isArray(rest.error) && rest.error.length > 0) {
            // Extract error message from inline error
            const errorDetail = rest.error[0]?.error;
            if (errorDetail?.message) {
              const errorMessage = errorDetail.message;
              // Check if the error is related to this expand by checking if:
              // 1. The error mentions the relation name, OR
              // 2. The error mentions any of the selected fields
              const isRelatedToExpand =
                errorMessage
                  .toLowerCase()
                  .includes(expandConfig.relation.toLowerCase()) ||
                (expandConfig.selectedFields &&
                  expandConfig.selectedFields.some((field) =>
                    errorMessage.toLowerCase().includes(field.toLowerCase()),
                  ));

              if (isRelatedToExpand) {
                return {
                  valid: false,
                  error: new ValidationError(
                    `Validation failed for expanded relation '${expandConfig.relation}': ${errorMessage}`,
                    [],
                    {
                      field: expandConfig.relation,
                    },
                  ),
                };
              }
            }
          }
          // If no inline error but expand was expected, that's also an issue
          // However, this might be a legitimate case (e.g., no related records)
          // So we'll only fail if there's an explicit error array
        } else {
          // Original validation logic for when expand exists
          if (Array.isArray(expandValue)) {
            // Validate each item in the expanded array
            const validatedExpandedItems: any[] = [];
            for (let i = 0; i < expandValue.length; i++) {
              const item = expandValue[i];
              const itemValidation = await validateRecord(
                item,
                expandConfig.targetSchema,
                expandConfig.selectedFields as string[] | undefined,
                expandConfig.nestedExpands,
                includeSpecialColumns,
              );
              if (!itemValidation.valid) {
                return {
                  valid: false,
                  error: new ValidationError(
                    `Validation failed for expanded relation '${expandConfig.relation}' at index ${i}: ${itemValidation.error.message}`,
                    itemValidation.error.issues,
                    {
                      field: expandConfig.relation,
                      cause: itemValidation.error.cause,
                    },
                  ),
                };
              }
              validatedExpandedItems.push(itemValidation.data);
            }
            validatedRecord[expandConfig.relation] = validatedExpandedItems;
          } else {
            // Single expanded item (shouldn't happen in OData, but handle it)
            const itemValidation = await validateRecord(
              expandValue,
              expandConfig.targetSchema,
              expandConfig.selectedFields as string[] | undefined,
              expandConfig.nestedExpands,
              includeSpecialColumns,
            );
            if (!itemValidation.valid) {
              return {
                valid: false,
                error: new ValidationError(
                  `Validation failed for expanded relation '${expandConfig.relation}': ${itemValidation.error.message}`,
                  itemValidation.error.issues,
                  {
                    field: expandConfig.relation,
                    cause: itemValidation.error.cause,
                  },
                ),
              };
            }
            validatedRecord[expandConfig.relation] = itemValidation.data;
          }
        }
      }
    }

    // Merge validated data with metadata and special columns
    return {
      valid: true,
      data: { ...validatedRecord, ...specialColumns, ...metadata } as T &
        ODataRecordMetadata,
    };
  }

  // Validate all fields in schema, but exclude ROWID/ROWMODID by default (unless includeSpecialColumns is enabled)
  const validatedRecord: Record<string, any> = { ...restWithoutSystemFields };

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const input = rest[fieldName];
    try {
      let result = fieldSchema["~standard"].validate(input);
      if (result instanceof Promise) result = await result;

      // if the `issues` field exists, the validation failed
      if (result.issues) {
        return {
          valid: false,
          error: new ValidationError(
            `Validation failed for field '${fieldName}'`,
            result.issues,
            {
              field: fieldName,
              value: input,
              cause: result.issues,
            },
          ),
        };
      }

      validatedRecord[fieldName] = result.value;
    } catch (originalError) {
      // If the validator throws an error directly, catch and wrap it
      // This preserves the original error instance for instanceof checks
      return {
        valid: false,
        error: new ValidationError(
          `Validation failed for field '${fieldName}'`,
          [],
          {
            field: fieldName,
            value: input,
            cause: originalError,
          },
        ),
      };
    }
  }

  // Validate expanded relations even when not using selected fields
  if (expandConfigs && expandConfigs.length > 0) {
    for (const expandConfig of expandConfigs) {
      const expandValue = rest[expandConfig.relation];

      // Check if expand field is missing
      if (expandValue === undefined) {
        // Check for inline error array (FileMaker returns errors inline when expand fails)
        if (Array.isArray(rest.error) && rest.error.length > 0) {
          // Extract error message from inline error
          const errorDetail = rest.error[0]?.error;
          if (errorDetail?.message) {
            const errorMessage = errorDetail.message;
            // Check if the error is related to this expand by checking if:
            // 1. The error mentions the relation name, OR
            // 2. The error mentions any of the selected fields
            const isRelatedToExpand =
              errorMessage
                .toLowerCase()
                .includes(expandConfig.relation.toLowerCase()) ||
              (expandConfig.selectedFields &&
                expandConfig.selectedFields.some((field) =>
                  errorMessage.toLowerCase().includes(field.toLowerCase()),
                ));

            if (isRelatedToExpand) {
              return {
                valid: false,
                error: new ValidationError(
                  `Validation failed for expanded relation '${expandConfig.relation}': ${errorMessage}`,
                  [],
                  {
                    field: expandConfig.relation,
                  },
                ),
              };
            }
          }
        }
        // If no inline error but expand was expected, that's also an issue
        // However, this might be a legitimate case (e.g., no related records)
        // So we'll only fail if there's an explicit error array
      } else {
        // Original validation logic for when expand exists
        if (Array.isArray(expandValue)) {
          // Validate each item in the expanded array
          const validatedExpandedItems: any[] = [];
          for (let i = 0; i < expandValue.length; i++) {
            const item = expandValue[i];
            const itemValidation = await validateRecord(
              item,
              expandConfig.targetSchema,
              expandConfig.selectedFields as string[] | undefined,
              expandConfig.nestedExpands,
              includeSpecialColumns,
            );
            if (!itemValidation.valid) {
              return {
                valid: false,
                error: new ValidationError(
                  `Validation failed for expanded relation '${expandConfig.relation}' at index ${i}: ${itemValidation.error.message}`,
                  itemValidation.error.issues,
                  {
                    field: expandConfig.relation,
                    cause: itemValidation.error.cause,
                  },
                ),
              };
            }
            validatedExpandedItems.push(itemValidation.data);
          }
          validatedRecord[expandConfig.relation] = validatedExpandedItems;
        } else {
          // Single expanded item (shouldn't happen in OData, but handle it)
          const itemValidation = await validateRecord(
            expandValue,
            expandConfig.targetSchema,
            expandConfig.selectedFields as string[] | undefined,
            expandConfig.nestedExpands,
            includeSpecialColumns,
          );
          if (!itemValidation.valid) {
            return {
              valid: false,
              error: new ValidationError(
                `Validation failed for expanded relation '${expandConfig.relation}': ${itemValidation.error.message}`,
                itemValidation.error.issues,
                {
                  field: expandConfig.relation,
                  cause: itemValidation.error.cause,
                },
              ),
            };
          }
          validatedRecord[expandConfig.relation] = itemValidation.data;
        }
      }
    }
  }

  return {
    valid: true,
    data: { ...validatedRecord, ...specialColumns, ...metadata } as T &
      ODataRecordMetadata,
  };
}

/**
 * Validates a list response against a schema.
 */
export async function validateListResponse<T extends Record<string, any>>(
  response: any,
  schema: Record<string, StandardSchemaV1> | undefined,
  selectedFields?: (keyof T)[],
  expandConfigs?: ExpandValidationConfig[],
  includeSpecialColumns?: boolean,
): Promise<
  | { valid: true; data: (T & ODataRecordMetadata)[] }
  | { valid: false; error: ResponseStructureError | ValidationError }
> {
  // Check if response has the expected structure
  if (!response || typeof response !== "object") {
    return {
      valid: false,
      error: new ResponseStructureError("an object", response),
    };
  }

  // Extract @context (for internal validation, but we won't return it)
  const { "@context": context, value, ...rest } = response;

  if (!Array.isArray(value)) {
    return {
      valid: false,
      error: new ResponseStructureError(
        "'value' property to be an array",
        value,
      ),
    };
  }

  // Validate each record in the array
  const validatedRecords: (T & ODataRecordMetadata)[] = [];

  for (let i = 0; i < value.length; i++) {
    const record = value[i];
    const validation = await validateRecord<T>(
      record,
      schema,
      selectedFields,
      expandConfigs,
      includeSpecialColumns,
    );

    if (!validation.valid) {
      return {
        valid: false,
        error: validation.error,
      };
    }

    validatedRecords.push(validation.data);
  }

  return {
    valid: true,
    data: validatedRecords,
  };
}

/**
 * Validates a single record response against a schema.
 */
export async function validateSingleResponse<T extends Record<string, any>>(
  response: any,
  schema: Record<string, StandardSchemaV1> | undefined,
  selectedFields?: (keyof T)[],
  expandConfigs?: ExpandValidationConfig[],
  mode: "exact" | "maybe" = "maybe",
  includeSpecialColumns?: boolean,
): Promise<
  | { valid: true; data: (T & ODataRecordMetadata) | null }
  | { valid: false; error: RecordCountMismatchError | ValidationError }
> {
  // Check for multiple records (error in both modes)
  if (
    response.value &&
    Array.isArray(response.value) &&
    response.value.length > 1
  ) {
    return {
      valid: false,
      error: new RecordCountMismatchError(
        mode === "exact" ? "one" : "at-most-one",
        response.value.length,
      ),
    };
  }

  // Handle empty responses
  if (!response || (response.value && response.value.length === 0)) {
    if (mode === "exact") {
      return {
        valid: false,
        error: new RecordCountMismatchError("one", 0),
      };
    }
    // mode === "maybe" - return null for empty
    return {
      valid: true,
      data: null,
    };
  }

  // Single record validation
  const record = response.value?.[0] ?? response;
  const validation = await validateRecord<T>(
    record,
    schema,
    selectedFields,
    expandConfigs,
    includeSpecialColumns,
  );

  if (!validation.valid) {
    return validation as { valid: false; error: ValidationError };
  }

  return {
    valid: true,
    data: validation.data,
  };
}
