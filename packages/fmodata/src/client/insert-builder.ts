import type {
  ExecutionContext,
  ExecutableBuilder,
  Result,
  ODataRecordMetadata,
  InferSchemaType,
  ExecuteOptions,
  ConditionallyWithODataAnnotations,
  ExecuteMethodOptions,
} from "../types";
import { getAcceptHeader } from "../types";
import type { FMTable } from "../orm/table";
import {
  getBaseTableConfig,
  getTableName,
  getTableId as getTableIdHelper,
  isUsingEntityIds,
} from "../orm/table";
import {
  validateSingleResponse,
  validateAndTransformInput,
} from "../validation";
import { type FFetchOptions } from "@fetchkit/ffetch";
import {
  transformFieldNamesToIds,
  transformResponseFields,
} from "../transform";
import { InvalidLocationHeaderError } from "../errors";
import { safeJsonParse } from "./sanitize-json";
import { parseErrorResponse } from "./error-parser";

export type InsertOptions = {
  return?: "minimal" | "representation";
};

import type { InferSchemaOutputFromFMTable } from "../orm/table";

export class InsertBuilder<
  Occ extends FMTable<any, any> | undefined = undefined,
  ReturnPreference extends "minimal" | "representation" = "representation",
> implements
    ExecutableBuilder<
      ReturnPreference extends "minimal"
        ? { ROWID: number }
        : InferSchemaOutputFromFMTable<NonNullable<Occ>>
    >
{
  private table?: Occ;
  private databaseName: string;
  private context: ExecutionContext;
  private data: Partial<InferSchemaOutputFromFMTable<NonNullable<Occ>>>;
  private returnPreference: ReturnPreference;

  private databaseUseEntityIds: boolean;
  private databaseIncludeSpecialColumns: boolean;

  constructor(config: {
    occurrence?: Occ;
    databaseName: string;
    context: ExecutionContext;
    data: Partial<InferSchemaOutputFromFMTable<NonNullable<Occ>>>;
    returnPreference?: ReturnPreference;
    databaseUseEntityIds?: boolean;
    databaseIncludeSpecialColumns?: boolean;
  }) {
    this.table = config.occurrence;
    this.databaseName = config.databaseName;
    this.context = config.context;
    this.data = config.data;
    this.returnPreference = (config.returnPreference ||
      "representation") as ReturnPreference;
    this.databaseUseEntityIds = config.databaseUseEntityIds ?? false;
    this.databaseIncludeSpecialColumns =
      config.databaseIncludeSpecialColumns ?? false;
  }

  /**
   * Helper to merge database-level useEntityIds with per-request options
   */
  private mergeExecuteOptions(
    options?: RequestInit & FFetchOptions & ExecuteOptions,
  ): RequestInit & FFetchOptions & { useEntityIds?: boolean } {
    // If useEntityIds is not set in options, use the database-level setting
    return {
      ...options,
      useEntityIds: options?.useEntityIds ?? this.databaseUseEntityIds,
    };
  }

  /**
   * Parse ROWID from Location header
   * Expected formats:
   * - contacts(ROWID=4583)
   * - contacts('some-uuid')
   */
  private parseLocationHeader(locationHeader: string | undefined): number {
    if (!locationHeader) {
      throw new InvalidLocationHeaderError(
        "Location header is required but was not provided",
      );
    }

    // Try to match ROWID=number pattern
    const rowidMatch = locationHeader.match(/ROWID=(\d+)/);
    if (rowidMatch && rowidMatch[1]) {
      return parseInt(rowidMatch[1], 10);
    }

    // Try to extract value from parentheses and parse as number
    const parenMatch = locationHeader.match(/\(['"]?([^'"]+)['"]?\)/);
    if (parenMatch && parenMatch[1]) {
      const value = parenMatch[1];
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        return numValue;
      }
    }

    throw new InvalidLocationHeaderError(
      `Could not extract ROWID from Location header: ${locationHeader}`,
      locationHeader,
    );
  }

  /**
   * Gets the table ID (FMTID) if using entity IDs, otherwise returns the table name
   * @param useEntityIds - Optional override for entity ID usage
   */
  private getTableId(useEntityIds?: boolean): string {
    if (!this.table) {
      throw new Error("Table occurrence is required");
    }

    const contextDefault = this.context._getUseEntityIds?.() ?? false;
    const shouldUseIds = useEntityIds ?? contextDefault;

    if (shouldUseIds) {
      if (!isUsingEntityIds(this.table)) {
        throw new Error(
          `useEntityIds is true but table "${getTableName(this.table)}" does not have entity IDs configured`,
        );
      }
      return getTableIdHelper(this.table);
    }

    return getTableName(this.table);
  }

  async execute<EO extends ExecuteOptions>(
    options?: ExecuteMethodOptions<EO>,
  ): Promise<
    Result<
      ReturnPreference extends "minimal"
        ? { ROWID: number }
        : ConditionallyWithODataAnnotations<
            InferSchemaOutputFromFMTable<NonNullable<Occ>>,
            EO["includeODataAnnotations"] extends true ? true : false
          >
    >
  > {
    // Merge database-level useEntityIds with per-request options
    const mergedOptions = this.mergeExecuteOptions(options);

    // Get table identifier with override support
    const tableId = this.getTableId(mergedOptions.useEntityIds);
    const url = `/${this.databaseName}/${tableId}`;

    // Validate and transform input data using input validators (writeValidators)
    let validatedData = this.data;
    if (this.table) {
      const baseTableConfig = getBaseTableConfig(this.table);
      const inputSchema = baseTableConfig.inputSchema;

      try {
        validatedData = await validateAndTransformInput(this.data, inputSchema);
      } catch (error) {
        // If validation fails, return error immediately
        return {
          data: undefined,
          error: error instanceof Error ? error : new Error(String(error)),
        } as any;
      }
    }

    // Transform field names to FMFIDs if using entity IDs
    // Only transform if useEntityIds resolves to true (respects per-request override)
    const shouldUseIds = mergedOptions.useEntityIds ?? false;

    const transformedData =
      this.table && shouldUseIds
        ? transformFieldNamesToIds(validatedData, this.table)
        : validatedData;

    // Set Prefer header based on return preference
    const preferHeader =
      this.returnPreference === "minimal"
        ? "return=minimal"
        : "return=representation";

    // Make POST request with JSON body
    const result = await this.context._makeRequest<any>(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: preferHeader,
        ...((mergedOptions as any)?.headers || {}),
      },
      body: JSON.stringify(transformedData),
      ...mergedOptions,
    });

    if (result.error) {
      return { data: undefined, error: result.error };
    }

    // Handle return=minimal case
    if (this.returnPreference === "minimal") {
      // The response should be empty (204 No Content)
      // _makeRequest will return { _location: string } when there's a Location header
      const responseData = result.data as any;

      if (!responseData || !responseData._location) {
        throw new InvalidLocationHeaderError(
          "Location header is required when using return=minimal but was not found in response",
        );
      }

      const rowid = this.parseLocationHeader(responseData._location);
      return { data: { ROWID: rowid } as any, error: undefined };
    }

    let response = result.data;

    // Transform response field IDs back to names if using entity IDs
    // Only transform if useEntityIds resolves to true (respects per-request override)
    if (this.table && shouldUseIds) {
      response = transformResponseFields(
        response,
        this.table,
        undefined, // No expand configs for insert
      );
    }

    // Get schema from table if available, excluding container fields
    let schema: Record<string, any> | undefined;
    if (this.table) {
      const baseTableConfig = getBaseTableConfig(this.table);
      const containerFields = baseTableConfig.containerFields || [];

      // Filter out container fields from schema
      schema = { ...baseTableConfig.schema };
      for (const containerField of containerFields) {
        delete schema[containerField as string];
      }
    }

    // Validate the response (FileMaker returns the created record)
    const validation = await validateSingleResponse<
      InferSchemaOutputFromFMTable<NonNullable<Occ>>
    >(
      response,
      schema,
      undefined, // No selected fields for insert
      undefined, // No expand configs
      "exact", // Expect exactly one record
    );

    if (!validation.valid) {
      return { data: undefined, error: validation.error };
    }

    // Handle null response (shouldn't happen for insert, but handle it)
    if (validation.data === null) {
      return {
        data: undefined,
        error: new Error("Insert operation returned null response"),
      };
    }

    return { data: validation.data as any, error: undefined };
  }

  getRequestConfig(): { method: string; url: string; body?: any } {
    // For batch operations, use database-level setting (no per-request override available here)
    // Note: Input validation happens in execute() and processResponse() for batch operations
    const tableId = this.getTableId(this.databaseUseEntityIds);

    // Transform field names to FMFIDs if using entity IDs
    const transformedData =
      this.table && this.databaseUseEntityIds
        ? transformFieldNamesToIds(this.data, this.table)
        : this.data;

    return {
      method: "POST",
      url: `/${this.databaseName}/${tableId}`,
      body: JSON.stringify(transformedData),
    };
  }

  toRequest(baseUrl: string, options?: ExecuteOptions): Request {
    const config = this.getRequestConfig();
    const fullUrl = `${baseUrl}${config.url}`;

    // Set Prefer header based on return preference
    const preferHeader =
      this.returnPreference === "minimal"
        ? "return=minimal"
        : "return=representation";

    return new Request(fullUrl, {
      method: config.method,
      headers: {
        "Content-Type": "application/json",
        Accept: getAcceptHeader(options?.includeODataAnnotations),
        Prefer: preferHeader,
      },
      body: config.body,
    });
  }

  async processResponse(
    response: Response,
    options?: ExecuteOptions,
  ): Promise<
    Result<
      ReturnPreference extends "minimal"
        ? { ROWID: number }
        : InferSchemaOutputFromFMTable<NonNullable<Occ>>
    >
  > {
    // Check for error responses (important for batch operations)
    if (!response.ok) {
      const tableName = this.table ? getTableName(this.table) : "unknown";
      const error = await parseErrorResponse(
        response,
        response.url || `/${this.databaseName}/${tableName}`,
      );
      return { data: undefined, error };
    }

    // Handle 204 No Content (common in batch/changeset operations)
    // FileMaker uses return=minimal for changeset operations regardless of Prefer header
    if (response.status === 204) {
      // Check for Location header (for return=minimal)
      if (this.returnPreference === "minimal") {
        const locationHeader =
          response.headers.get("Location") || response.headers.get("location");
        if (locationHeader) {
          const rowid = this.parseLocationHeader(locationHeader);
          return { data: { ROWID: rowid } as any, error: undefined };
        }
        throw new InvalidLocationHeaderError(
          "Location header is required when using return=minimal but was not found in response",
        );
      }

      // For 204 responses without return=minimal, FileMaker doesn't return the created entity
      // This is valid OData behavior for changeset operations
      // We return a success indicator but no actual data
      return {
        data: {} as any,
        error: undefined,
      };
    }

    // If we expected return=minimal but got a body, that's unexpected
    if (this.returnPreference === "minimal") {
      throw new InvalidLocationHeaderError(
        "Expected 204 No Content for return=minimal, but received response with body",
      );
    }

    // Use safeJsonParse to handle FileMaker's invalid JSON with unquoted ? values
    let rawResponse;
    try {
      rawResponse = await safeJsonParse(response);
    } catch (err) {
      // If parsing fails with 204, handle it gracefully
      if (response.status === 204) {
        return {
          data: {} as any,
          error: undefined,
        };
      }
      return {
        data: undefined,
        error: {
          name: "ResponseParseError",
          message: `Failed to parse response JSON: ${err instanceof Error ? err.message : "Unknown error"}`,
          timestamp: new Date(),
        } as any,
      };
    }

    // Validate and transform input data using input validators (writeValidators)
    // This is needed for processResponse because it's called from batch operations
    // where the data hasn't been validated yet
    let validatedData = this.data;
    if (this.table) {
      const baseTableConfig = getBaseTableConfig(this.table);
      const inputSchema = baseTableConfig.inputSchema;
      try {
        validatedData = await validateAndTransformInput(this.data, inputSchema);
      } catch (error) {
        return {
          data: undefined,
          error: error instanceof Error ? error : new Error(String(error)),
        } as any;
      }
    }

    // Transform response field IDs back to names if using entity IDs
    // Only transform if useEntityIds resolves to true (respects per-request override)
    const shouldUseIds = options?.useEntityIds ?? this.databaseUseEntityIds;

    let transformedResponse = rawResponse;
    if (this.table && shouldUseIds) {
      transformedResponse = transformResponseFields(
        rawResponse,
        this.table,
        undefined, // No expand configs for insert
      );
    }

    // Get schema from table if available, excluding container fields
    let schema: Record<string, any> | undefined;
    if (this.table) {
      const baseTableConfig = getBaseTableConfig(this.table);
      const containerFields = baseTableConfig.containerFields || [];

      // Filter out container fields from schema
      schema = { ...baseTableConfig.schema };
      for (const containerField of containerFields) {
        delete schema[containerField as string];
      }
    }

    // Validate the response (FileMaker returns the created record)
    const validation = await validateSingleResponse<
      InferSchemaOutputFromFMTable<NonNullable<Occ>>
    >(
      transformedResponse,
      schema,
      undefined, // No selected fields for insert
      undefined, // No expand configs
      "exact", // Expect exactly one record
    );

    if (!validation.valid) {
      return { data: undefined, error: validation.error };
    }

    // Handle null response (shouldn't happen for insert, but handle it)
    if (validation.data === null) {
      return {
        data: undefined,
        error: new Error("Insert operation returned null response"),
      };
    }

    return { data: validation.data as any, error: undefined };
  }
}
