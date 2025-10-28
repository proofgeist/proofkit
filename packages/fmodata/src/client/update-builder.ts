import type {
  ExecutionContext,
  ExecutableBuilder,
  Result,
  WithSystemFields,
  ExecuteOptions,
} from "../types";
import { getAcceptHeader } from "../types";
import type { TableOccurrence } from "./table-occurrence";
import type { BaseTable } from "./base-table";
import { QueryBuilder } from "./query-builder";
import { type FFetchOptions } from "@fetchkit/ffetch";
import {
  transformFieldNamesToIds,
  transformTableName,
  getTableIdentifiers,
} from "../transform";

/**
 * Initial update builder returned from EntitySet.update(data)
 * Requires calling .byId() or .where() before .execute() is available
 */
export class UpdateBuilder<
  T extends Record<string, any>,
  BT extends BaseTable<any, any, any, any>,
  ReturnPreference extends "minimal" | "representation" = "minimal",
> {
  private tableName: string;
  private databaseName: string;
  private context: ExecutionContext;
  private occurrence?: TableOccurrence<any, any, any, any>;
  private data: Partial<T>;
  private returnPreference: ReturnPreference;

  private databaseUseEntityIds: boolean;

  constructor(config: {
    occurrence?: TableOccurrence<any, any, any, any>;
    tableName: string;
    databaseName: string;
    context: ExecutionContext;
    data: Partial<T>;
    returnPreference: ReturnPreference;
    databaseUseEntityIds?: boolean;
  }) {
    this.occurrence = config.occurrence;
    this.tableName = config.tableName;
    this.databaseName = config.databaseName;
    this.context = config.context;
    this.data = config.data;
    this.returnPreference = config.returnPreference;
    this.databaseUseEntityIds = config.databaseUseEntityIds ?? false;
  }

  /**
   * Update a single record by ID
   * Returns updated count by default, or full record if returnFullRecord was set to true
   */
  byId(
    id: string | number,
  ): ExecutableUpdateBuilder<T, true, ReturnPreference> {
    return new ExecutableUpdateBuilder<T, true, ReturnPreference>({
      occurrence: this.occurrence,
      tableName: this.tableName,
      databaseName: this.databaseName,
      context: this.context,
      data: this.data,
      mode: "byId",
      recordId: id,
      returnPreference: this.returnPreference,
      databaseUseEntityIds: this.databaseUseEntityIds,
    });
  }

  /**
   * Update records matching a filter query
   * Returns updated count by default, or full record if returnFullRecord was set to true
   * @param fn Callback that receives a QueryBuilder for building the filter
   */
  where(
    fn: (
      q: QueryBuilder<WithSystemFields<T>>,
    ) => QueryBuilder<WithSystemFields<T>>,
  ): ExecutableUpdateBuilder<T, true, ReturnPreference> {
    // Create a QueryBuilder for the user to configure
    const queryBuilder = new QueryBuilder<
      WithSystemFields<T>,
      keyof WithSystemFields<T>,
      false,
      false,
      undefined
    >({
      occurrence: undefined,
      tableName: this.tableName,
      databaseName: this.databaseName,
      context: this.context,
    });

    // Let the user configure it
    const configuredBuilder = fn(queryBuilder);

    return new ExecutableUpdateBuilder<T, true, ReturnPreference>({
      occurrence: this.occurrence,
      tableName: this.tableName,
      databaseName: this.databaseName,
      context: this.context,
      data: this.data,
      mode: "byFilter",
      queryBuilder: configuredBuilder,
      returnPreference: this.returnPreference,
      databaseUseEntityIds: this.databaseUseEntityIds,
    });
  }
}

/**
 * Executable update builder - has execute() method
 * Returned after calling .byId() or .where()
 * Can return either updated count or full record based on returnFullRecord option
 */
export class ExecutableUpdateBuilder<
  T extends Record<string, any>,
  IsByFilter extends boolean,
  ReturnPreference extends "minimal" | "representation" = "minimal",
> implements
    ExecutableBuilder<
      ReturnPreference extends "minimal" ? { updatedCount: number } : T
    >
{
  private tableName: string;
  private databaseName: string;
  private context: ExecutionContext;
  private occurrence?: TableOccurrence<any, any, any, any>;
  private data: Partial<T>;
  private mode: "byId" | "byFilter";
  private recordId?: string | number;
  private queryBuilder?: QueryBuilder<any>;
  private returnPreference: ReturnPreference;
  private databaseUseEntityIds: boolean;

  constructor(config: {
    occurrence?: TableOccurrence<any, any, any, any>;
    tableName: string;
    databaseName: string;
    context: ExecutionContext;
    data: Partial<T>;
    mode: "byId" | "byFilter";
    recordId?: string | number;
    queryBuilder?: QueryBuilder<any>;
    returnPreference: ReturnPreference;
    databaseUseEntityIds?: boolean;
  }) {
    this.occurrence = config.occurrence;
    this.tableName = config.tableName;
    this.databaseName = config.databaseName;
    this.context = config.context;
    this.data = config.data;
    this.mode = config.mode;
    this.recordId = config.recordId;
    this.queryBuilder = config.queryBuilder;
    this.returnPreference = config.returnPreference;
    this.databaseUseEntityIds = config.databaseUseEntityIds ?? false;
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
   * Gets the table ID (FMTID) if using entity IDs, otherwise returns the table name
   * @param useEntityIds - Optional override for entity ID usage
   */
  private getTableId(useEntityIds?: boolean): string {
    if (!this.occurrence) {
      return this.tableName;
    }

    const contextDefault = this.context._getUseEntityIds?.() ?? false;
    const shouldUseIds = useEntityIds ?? contextDefault;

    if (shouldUseIds) {
      const identifiers = getTableIdentifiers(this.occurrence);
      if (!identifiers.id) {
        throw new Error(
          `useEntityIds is true but TableOccurrence "${identifiers.name}" does not have an fmtId defined`,
        );
      }
      return identifiers.id;
    }

    return this.occurrence.getTableName();
  }

  async execute(
    options?: RequestInit & FFetchOptions & { useEntityIds?: boolean },
  ): Promise<
    Result<ReturnPreference extends "minimal" ? { updatedCount: number } : T>
  > {
    // Merge database-level useEntityIds with per-request options
    const mergedOptions = this.mergeExecuteOptions(options);

    // Get table identifier with override support
    const tableId = this.getTableId(mergedOptions.useEntityIds);

    // Transform field names to FMFIDs if using entity IDs
    // Only transform if useEntityIds resolves to true (respects per-request override)
    const shouldUseIds = mergedOptions.useEntityIds ?? false;

    const transformedData =
      this.occurrence?.baseTable && shouldUseIds
        ? transformFieldNamesToIds(this.data, this.occurrence.baseTable)
        : this.data;

    let url: string;

    if (this.mode === "byId") {
      // Update single record by ID: PATCH /{database}/{table}('id')
      url = `/${this.databaseName}/${tableId}('${this.recordId}')`;
    } else {
      // Update by filter: PATCH /{database}/{table}?$filter=...
      if (!this.queryBuilder) {
        throw new Error("Query builder is required for filter-based update");
      }

      // Get the query string from the configured QueryBuilder
      const queryString = this.queryBuilder.getQueryString();
      // The query string will have the tableId already transformed by QueryBuilder
      // Remove the leading "/" and table name from the query string as we'll build our own URL
      const queryParams = queryString.startsWith(`/${tableId}`)
        ? queryString.slice(`/${tableId}`.length)
        : queryString.startsWith(`/${this.tableName}`)
          ? queryString.slice(`/${this.tableName}`.length)
          : queryString;

      url = `/${this.databaseName}/${tableId}${queryParams}`;
    }

    // Set Prefer header based on returnPreference
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.returnPreference === "representation") {
      headers["Prefer"] = "return=representation";
    }

    // Make PATCH request with JSON body
    const result = await this.context._makeRequest(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(transformedData),
      ...mergedOptions,
    });

    if (result.error) {
      return { data: undefined, error: result.error };
    }

    const response = result.data;

    // Handle based on return preference
    if (this.returnPreference === "representation") {
      // Return the full updated record
      return {
        data: response as ReturnPreference extends "minimal"
          ? { updatedCount: number }
          : T,
        error: undefined,
      };
    } else {
      // Return updated count (minimal)
      let updatedCount = 0;

      if (typeof response === "number") {
        updatedCount = response;
      } else if (response && typeof response === "object") {
        // Check if the response has a count property (fallback)
        updatedCount = (response as any).updatedCount || 0;
      }

      return {
        data: { updatedCount } as ReturnPreference extends "minimal"
          ? { updatedCount: number }
          : T,
        error: undefined,
      };
    }
  }

  getRequestConfig(): { method: string; url: string; body?: any } {
    // For batch operations, use database-level setting (no per-request override available here)
    const tableId = this.getTableId(this.databaseUseEntityIds);

    // Transform field names to FMFIDs if using entity IDs
    const transformedData =
      this.occurrence?.baseTable && this.databaseUseEntityIds
        ? transformFieldNamesToIds(this.data, this.occurrence.baseTable)
        : this.data;

    let url: string;

    if (this.mode === "byId") {
      url = `/${this.databaseName}/${tableId}('${this.recordId}')`;
    } else {
      if (!this.queryBuilder) {
        throw new Error("Query builder is required for filter-based update");
      }

      const queryString = this.queryBuilder.getQueryString();
      const queryParams = queryString.startsWith(`/${tableId}`)
        ? queryString.slice(`/${tableId}`.length)
        : queryString.startsWith(`/${this.tableName}`)
          ? queryString.slice(`/${this.tableName}`.length)
          : queryString;

      url = `/${this.databaseName}/${tableId}${queryParams}`;
    }

    return {
      method: "PATCH",
      url,
      body: JSON.stringify(transformedData),
    };
  }

  toRequest(baseUrl: string, options?: ExecuteOptions): Request {
    const config = this.getRequestConfig();
    const fullUrl = `${baseUrl}${config.url}`;

    return new Request(fullUrl, {
      method: config.method,
      headers: {
        "Content-Type": "application/json",
        Accept: getAcceptHeader(options?.includeODataAnnotations),
      },
      body: config.body,
    });
  }

  async processResponse(
    response: Response,
    options?: ExecuteOptions,
  ): Promise<
    Result<ReturnPreference extends "minimal" ? { updatedCount: number } : T>
  > {
    // Check for empty response (204 No Content)
    const text = await response.text();
    if (!text || text.trim() === "") {
      // For 204 No Content, check the fmodata.affected_rows header
      const affectedRows = response.headers.get("fmodata.affected_rows");
      const updatedCount = affectedRows ? parseInt(affectedRows, 10) : 1;
      return {
        data: { updatedCount } as ReturnPreference extends "minimal"
          ? { updatedCount: number }
          : T,
        error: undefined,
      };
    }

    const rawResponse = JSON.parse(text);

    // Handle based on return preference
    if (this.returnPreference === "representation") {
      // Return the full updated record
      return {
        data: rawResponse as ReturnPreference extends "minimal"
          ? { updatedCount: number }
          : T,
        error: undefined,
      };
    } else {
      // Return updated count (minimal)
      let updatedCount = 0;

      if (typeof rawResponse === "number") {
        updatedCount = rawResponse;
      } else if (rawResponse && typeof rawResponse === "object") {
        // Check if the response has a count property (fallback)
        updatedCount = (rawResponse as any).updatedCount || 0;
      }

      return {
        data: { updatedCount } as ReturnPreference extends "minimal"
          ? { updatedCount: number }
          : T,
        error: undefined,
      };
    }
  }
}
