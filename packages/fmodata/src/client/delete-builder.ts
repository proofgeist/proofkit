import type {
  ExecutionContext,
  ExecutableBuilder,
  Result,
  WithSystemFields,
  ExecuteOptions,
  ExecuteMethodOptions,
} from "../types";
import { getAcceptHeader } from "../types";
import type { FMTable, InferSchemaOutputFromFMTable } from "../orm/table";
import {
  getTableName,
  getTableId as getTableIdHelper,
  isUsingEntityIds,
} from "../orm/table";
import { QueryBuilder } from "./query-builder";
import { type FFetchOptions } from "@fetchkit/ffetch";
import { parseErrorResponse } from "./error-parser";

/**
 * Initial delete builder returned from EntitySet.delete()
 * Requires calling .byId() or .where() before .execute() is available
 */
export class DeleteBuilder<Occ extends FMTable<any, any>> {
  private databaseName: string;
  private context: ExecutionContext;
  private table: Occ;
  private databaseUseEntityIds: boolean;

  constructor(config: {
    occurrence: Occ;
    databaseName: string;
    context: ExecutionContext;
    databaseUseEntityIds?: boolean;
  }) {
    this.table = config.occurrence;
    this.databaseName = config.databaseName;
    this.context = config.context;
    this.databaseUseEntityIds = config.databaseUseEntityIds ?? false;
  }

  /**
   * Delete a single record by ID
   */
  byId(id: string | number): ExecutableDeleteBuilder<Occ> {
    return new ExecutableDeleteBuilder<Occ>({
      occurrence: this.table,
      databaseName: this.databaseName,
      context: this.context,
      mode: "byId",
      recordId: id,
      databaseUseEntityIds: this.databaseUseEntityIds,
    });
  }

  /**
   * Delete records matching a filter query
   * @param fn Callback that receives a QueryBuilder for building the filter
   */
  where(
    fn: (q: QueryBuilder<Occ>) => QueryBuilder<Occ>,
  ): ExecutableDeleteBuilder<Occ> {
    // Create a QueryBuilder for the user to configure
    const queryBuilder = new QueryBuilder<Occ>({
      occurrence: this.table,
      databaseName: this.databaseName,
      context: this.context,
    });

    // Let the user configure it
    const configuredBuilder = fn(queryBuilder);

    return new ExecutableDeleteBuilder<Occ>({
      occurrence: this.table,
      databaseName: this.databaseName,
      context: this.context,
      mode: "byFilter",
      queryBuilder: configuredBuilder,
      databaseUseEntityIds: this.databaseUseEntityIds,
    });
  }
}

/**
 * Executable delete builder - has execute() method
 * Returned after calling .byId() or .where()
 */
export class ExecutableDeleteBuilder<Occ extends FMTable<any, any>>
  implements ExecutableBuilder<{ deletedCount: number }>
{
  private databaseName: string;
  private context: ExecutionContext;
  private table: Occ;
  private mode: "byId" | "byFilter";
  private recordId?: string | number;
  private queryBuilder?: QueryBuilder<Occ>;
  private databaseUseEntityIds: boolean;

  constructor(config: {
    occurrence: Occ;
    databaseName: string;
    context: ExecutionContext;
    mode: "byId" | "byFilter";
    recordId?: string | number;
    queryBuilder?: QueryBuilder<Occ>;
    databaseUseEntityIds?: boolean;
  }) {
    this.table = config.occurrence;
    this.databaseName = config.databaseName;
    this.context = config.context;
    this.mode = config.mode;
    this.recordId = config.recordId;
    this.queryBuilder = config.queryBuilder;
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

  async execute(
    options?: ExecuteMethodOptions<ExecuteOptions>,
  ): Promise<Result<{ deletedCount: number }>> {
    // Merge database-level useEntityIds with per-request options
    const mergedOptions = this.mergeExecuteOptions(options);

    // Get table identifier with override support
    const tableId = this.getTableId(mergedOptions.useEntityIds);

    let url: string;

    if (this.mode === "byId") {
      // Delete single record by ID: DELETE /{database}/{table}('id')
      url = `/${this.databaseName}/${tableId}('${this.recordId}')`;
    } else {
      // Delete by filter: DELETE /{database}/{table}?$filter=...
      if (!this.queryBuilder) {
        throw new Error("Query builder is required for filter-based delete");
      }

      // Get the query string from the configured QueryBuilder
      const queryString = this.queryBuilder.getQueryString();
      // Remove the leading "/" and table name from the query string as we'll build our own URL
      const tableName = getTableName(this.table);
      const queryParams = queryString.startsWith(`/${tableId}`)
        ? queryString.slice(`/${tableId}`.length)
        : queryString.startsWith(`/${tableName}`)
          ? queryString.slice(`/${tableName}`.length)
          : queryString;

      url = `/${this.databaseName}/${tableId}${queryParams}`;
    }

    // Make DELETE request
    const result = await this.context._makeRequest(url, {
      method: "DELETE",
      ...mergedOptions,
    });

    if (result.error) {
      return { data: undefined, error: result.error };
    }

    const response = result.data;

    // OData returns 204 No Content with fmodata.affected_rows header
    // The _makeRequest should handle extracting the header value
    // For now, we'll check if response contains the count
    let deletedCount = 0;

    if (typeof response === "number") {
      deletedCount = response;
    } else if (response && typeof response === "object") {
      // Check if the response has a count property (fallback)
      deletedCount = (response as any).deletedCount || 0;
    }

    return { data: { deletedCount }, error: undefined };
  }

  getRequestConfig(): { method: string; url: string; body?: any } {
    // For batch operations, use database-level setting (no per-request override available here)
    const tableId = this.getTableId(this.databaseUseEntityIds);

    let url: string;

    if (this.mode === "byId") {
      url = `/${this.databaseName}/${tableId}('${this.recordId}')`;
    } else {
      if (!this.queryBuilder) {
        throw new Error("Query builder is required for filter-based delete");
      }

      const queryString = this.queryBuilder.getQueryString();
      const tableName = getTableName(this.table);
      const queryParams = queryString.startsWith(`/${tableId}`)
        ? queryString.slice(`/${tableId}`.length)
        : queryString.startsWith(`/${tableName}`)
          ? queryString.slice(`/${tableName}`.length)
          : queryString;

      url = `/${this.databaseName}/${tableId}${queryParams}`;
    }

    return {
      method: "DELETE",
      url,
    };
  }

  toRequest(baseUrl: string, options?: ExecuteOptions): Request {
    const config = this.getRequestConfig();
    const fullUrl = `${baseUrl}${config.url}`;

    return new Request(fullUrl, {
      method: config.method,
      headers: {
        Accept: getAcceptHeader(options?.includeODataAnnotations),
      },
    });
  }

  async processResponse(
    response: Response,
    options?: ExecuteOptions,
  ): Promise<Result<{ deletedCount: number }>> {
    // Check for error responses (important for batch operations)
    if (!response.ok) {
      const tableName = getTableName(this.table);
      const error = await parseErrorResponse(
        response,
        response.url || `/${this.databaseName}/${tableName}`,
      );
      return { data: undefined, error };
    }

    // Check for empty response (204 No Content)
    const text = await response.text();
    if (!text || text.trim() === "") {
      // For 204 No Content, check the fmodata.affected_rows header
      const affectedRows = response.headers.get("fmodata.affected_rows");
      const deletedCount = affectedRows ? parseInt(affectedRows, 10) : 1;
      return { data: { deletedCount }, error: undefined };
    }

    const rawResponse = JSON.parse(text);

    // OData returns 204 No Content with fmodata.affected_rows header
    // The _makeRequest should handle extracting the header value
    // For now, we'll check if response contains the count
    let deletedCount = 0;

    if (typeof rawResponse === "number") {
      deletedCount = rawResponse;
    } else if (rawResponse && typeof rawResponse === "object") {
      // Check if the response has a count property (fallback)
      deletedCount = (rawResponse as any).deletedCount || 0;
    }

    return { data: { deletedCount }, error: undefined };
  }
}
