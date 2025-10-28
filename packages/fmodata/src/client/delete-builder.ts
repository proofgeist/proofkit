import type {
  ExecutionContext,
  ExecutableBuilder,
  Result,
  WithSystemFields,
  ExecuteOptions,
} from "../types";
import { getAcceptHeader } from "../types";
import type { TableOccurrence } from "./table-occurrence";
import { QueryBuilder } from "./query-builder";
import { type FFetchOptions } from "@fetchkit/ffetch";
import { getTableIdentifiers } from "../transform";

/**
 * Initial delete builder returned from EntitySet.delete()
 * Requires calling .byId() or .where() before .execute() is available
 */
export class DeleteBuilder<T extends Record<string, any>> {
  private tableName: string;
  private databaseName: string;
  private context: ExecutionContext;
  private occurrence?: TableOccurrence<any, any, any, any>;
  private databaseUseEntityIds: boolean;

  constructor(config: {
    occurrence?: TableOccurrence<any, any, any, any>;
    tableName: string;
    databaseName: string;
    context: ExecutionContext;
    databaseUseEntityIds?: boolean;
  }) {
    this.occurrence = config.occurrence;
    this.tableName = config.tableName;
    this.databaseName = config.databaseName;
    this.context = config.context;
    this.databaseUseEntityIds = config.databaseUseEntityIds ?? false;
  }

  /**
   * Delete a single record by ID
   */
  byId(id: string | number): ExecutableDeleteBuilder<T> {
    return new ExecutableDeleteBuilder<T>({
      occurrence: this.occurrence,
      tableName: this.tableName,
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
    fn: (
      q: QueryBuilder<WithSystemFields<T>>,
    ) => QueryBuilder<WithSystemFields<T>>,
  ): ExecutableDeleteBuilder<T> {
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

    return new ExecutableDeleteBuilder<T>({
      occurrence: this.occurrence,
      tableName: this.tableName,
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
export class ExecutableDeleteBuilder<T extends Record<string, any>>
  implements ExecutableBuilder<{ deletedCount: number }>
{
  private tableName: string;
  private databaseName: string;
  private context: ExecutionContext;
  private occurrence?: TableOccurrence<any, any, any, any>;
  private mode: "byId" | "byFilter";
  private recordId?: string | number;
  private queryBuilder?: QueryBuilder<any>;
  private databaseUseEntityIds: boolean;

  constructor(config: {
    occurrence?: TableOccurrence<any, any, any, any>;
    tableName: string;
    databaseName: string;
    context: ExecutionContext;
    mode: "byId" | "byFilter";
    recordId?: string | number;
    queryBuilder?: QueryBuilder<any>;
    databaseUseEntityIds?: boolean;
  }) {
    this.occurrence = config.occurrence;
    this.tableName = config.tableName;
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
      const queryParams = queryString.startsWith(`/${tableId}`)
        ? queryString.slice(`/${tableId}`.length)
        : queryString.startsWith(`/${this.tableName}`)
          ? queryString.slice(`/${this.tableName}`.length)
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
      const queryParams = queryString.startsWith(`/${tableId}`)
        ? queryString.slice(`/${tableId}`.length)
        : queryString.startsWith(`/${this.tableName}`)
          ? queryString.slice(`/${this.tableName}`.length)
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
