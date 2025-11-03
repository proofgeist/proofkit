import type {
  BaseRequestOptions,
  Adapter,
} from "./core.js";
import type {
  ODataResponse,
  ODataEntityResponse,
  ODataMetadata,
  ODataTable,
  ODataRecord,
  CreateRecordOptions,
  UpdateRecordOptions,
  DeleteRecordOptions,
  GetRecordsOptions,
  GetRecordOptions,
  GetRecordCountOptions,
  GetFieldValueOptions,
  NavigateRelatedOptions,
  CrossJoinOptions,
  UpdateRecordReferencesOptions,
  BatchOptions,
  BatchRequest,
  CreateTableOptions,
  AddFieldsOptions,
  DeleteTableOptions,
  DeleteFieldOptions,
  RunScriptOptions,
  UploadContainerOptions,
} from "../client-types.js";
import { FileMakerODataError } from "../client-types.js";
import {
  buildQueryString,
  buildTablePath,
  buildRecordPath,
  buildFieldValuePath,
  buildMetadataPath,
  buildTablesPath,
  buildNavigationPath,
  buildCrossJoinPath,
  buildBatchPath,
  buildFileMakerTablesPath,
  buildAcceptHeader,
  buildContentTypeHeader,
  encodeODataFilter,
  parseErrorResponse,
} from "../utils.js";
import type { BaseFetchAdapterOptions } from "./fetch-base-types.js";

/**
 * Base fetch adapter implementation for OData API
 * Handles URL construction, request/response processing, and error handling
 */
export abstract class BaseFetchAdapter implements Adapter {
  protected server: string;
  protected database: string;
  protected baseUrl: URL;

  protected rejectUnauthorized: boolean;

  constructor(options: BaseFetchAdapterOptions) {
    this.server = options.server;
    // Clean database name - remove quotes and trim whitespace
    this.database = options.database.trim().replace(/^["']+|["']+$/g, "");
    this.rejectUnauthorized = options.rejectUnauthorized ?? true;

    if (this.database === "") {
      throw new Error("Database name is required");
    }

    // OData base URL: https://host/fmi/odata/v4/database-name
    this.baseUrl = new URL(
      `${this.server}/fmi/odata/v4/${encodeURIComponent(this.database)}`,
    );
  }

  /**
   * Get authentication header - must be implemented by subclasses
   */
  protected abstract getAuthHeader(): Promise<string>;

  /**
   * Make HTTP request with proper OData headers and error handling
   */
  protected async request<T>(params: {
    path: string;
    method?: string;
    body?: unknown;
    query?: string | URLSearchParams;
    headers?: Record<string, string>;
    timeout?: number;
    fetchOptions?: RequestInit;
  }): Promise<T> {
    const {
      path,
      method = "GET",
      body,
      query,
      headers = {},
      timeout,
      fetchOptions = {},
    } = params;

    // Build the full URL
    // For OData query strings, we need to avoid URL encoding by the URL constructor
    // FileMaker expects $filter with minimal encoding (spaces, commas, quotes as literals)
    const baseUrlWithPath = new URL(path, this.baseUrl);
    let fetchUrl: string;

    if (query) {
      if (typeof query === "string") {
        // For OData $ parameters, manually construct URL string to avoid encoding
        // The query string has minimal encoding already (only &, #, % encoded)
        fetchUrl = `${baseUrlWithPath.toString()}?${query}`;
      } else {
        // For URLSearchParams, use normal construction
        baseUrlWithPath.search = query.toString();
        fetchUrl = baseUrlWithPath.toString();
      }
    } else {
      fetchUrl = baseUrlWithPath.toString();
    }

    const authHeader = await this.getAuthHeader();
    const requestHeaders = new Headers(fetchOptions.headers);
    requestHeaders.set("Authorization", authHeader);

    // Set Accept header for JSON (with optional IEEE754Compatible)
    const acceptHeader = headers["Accept"] ?? buildAcceptHeader();
    requestHeaders.set("Accept", acceptHeader);

    // Set Content-Type for request body
    if (body && method !== "GET") {
      const contentType = headers["Content-Type"] ?? buildContentTypeHeader();
      requestHeaders.set("Content-Type", contentType);
    }

    // Set OData version headers
    requestHeaders.set("OData-Version", "4.0");
    requestHeaders.set("OData-MaxVersion", "4.0");

    // Merge any additional headers
    for (const [key, value] of Object.entries(headers)) {
      if (!requestHeaders.has(key)) {
        requestHeaders.set(key, value);
      }
    }

    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;
    if (timeout) {
      timeoutId = setTimeout(() => controller.abort(), timeout);
    }

    try {
      // For Node.js, if rejectUnauthorized is false, temporarily disable SSL verification
      // Note: This is a security risk and should only be used in development
      let originalRejectUnauthorized: string | undefined;
      if (!this.rejectUnauthorized && typeof process !== "undefined") {
        // Save original value and disable SSL verification
        originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      }

      const response = await fetch(fetchUrl, {
        ...fetchOptions,
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      // Restore original SSL verification setting
      if (!this.rejectUnauthorized && typeof process !== "undefined") {
        if (originalRejectUnauthorized === undefined) {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        } else {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
        }
      }

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      let responseData: unknown;
      const contentType = response.headers.get("Content-Type") ?? "";
      const contentLength = response.headers.get("Content-Length");
      
      // Handle empty responses (common for DELETE operations)
      // 204 No Content means no body
      if (response.status === 204) {
        responseData = null;
      } else {
        // Try to read the response body
        const text = await response.text();
        
        if (!text || text.trim() === "") {
          // Empty body
          responseData = null;
        } else if (contentType.includes("application/json")) {
          try {
            responseData = JSON.parse(text);
          } catch (error) {
            // If JSON parsing fails, might be malformed or empty
            // For error responses, we'll parse it in parseErrorResponse
            responseData = text;
          }
        } else if (
          contentType.includes("application/atom+xml") ||
          contentType.includes("application/xml")
        ) {
          responseData = text;
        } else {
          responseData = text;
        }
      }

      if (!response.ok) {
        const errorInfo = parseErrorResponse(response, responseData);
        throw new FileMakerODataError(
          errorInfo.code,
          errorInfo.message,
          errorInfo.target,
          errorInfo.details as
            | Array<{
                code: string;
                message: string;
                target?: string;
              }>
            | undefined,
        );
      }

      return responseData as T;
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (error instanceof FileMakerODataError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new FileMakerODataError(
          "TIMEOUT",
          `Request timeout after ${timeout}ms`,
        );
      }
      throw error;
    }
  }

  async getTables(
    options?: BaseRequestOptions,
  ): Promise<ODataResponse<ODataTable>> {
    const path = buildTablesPath(this.database);
    const query = new URLSearchParams({ $format: "json" });

    return this.request<ODataResponse<ODataTable>>({
      path,
      query,
      timeout: options?.timeout,
      fetchOptions: options?.fetch,
    });
  }

  async getMetadata(options?: BaseRequestOptions): Promise<ODataMetadata> {
    const path = buildMetadataPath(this.database);

    return this.request<ODataMetadata>({
      path,
      timeout: options?.timeout,
      fetchOptions: options?.fetch,
      headers: {
        Accept: "application/xml",
      },
    });
  }

  async getRecords<T extends ODataRecord = ODataRecord>(
    table: string,
    options?: GetRecordsOptions,
  ): Promise<ODataResponse<T>> {
    const path = buildTablePath(this.database, table);
    const query = buildQueryString(options ?? {});

    return this.request<ODataResponse<T>>({
      path,
      query,
      timeout: options?.timeout,
      fetchOptions: options?.fetch,
      headers: {
        Accept: buildAcceptHeader(options),
      },
    });
  }

  async getRecord<T extends ODataRecord = ODataRecord>(
    table: string,
    key: string | number,
    options?: GetRecordOptions,
  ): Promise<ODataEntityResponse<T>> {
    const path = buildRecordPath(this.database, table, key);
    const query = buildQueryString(options ?? {});

    return this.request<ODataEntityResponse<T>>({
      path,
      query,
      timeout: options?.timeout,
      fetchOptions: options?.fetch,
      headers: {
        Accept: buildAcceptHeader(options),
      },
    });
  }

  async getRecordCount(
    table: string,
    options?: GetRecordCountOptions,
  ): Promise<number> {
    const path = buildTablePath(this.database, table);
    
    // Use custom query string for $filter to handle encoding properly
    let queryString = "$count=true";
    if (options?.$filter) {
      const encodedFilter = encodeODataFilter(options.$filter);
      queryString += `&$filter=${encodedFilter}`;
    }
    
    // Use manual URL construction to avoid URLSearchParams encoding issues
    const baseUrlWithPath = new URL(path, this.baseUrl);
    const fetchUrl = `${baseUrlWithPath.toString()}?${queryString}`;

    const response = await this.request<ODataResponse<unknown>>({
      path,
      query: queryString,
      timeout: options?.timeout,
      fetchOptions: options?.fetch,
    });

    return response["@odata.count"] ?? 0;
  }

  async getFieldValue(
    table: string,
    key: string | number,
    field: string,
    options?: GetFieldValueOptions,
  ): Promise<unknown> {
    const path = buildFieldValuePath(
      this.database,
      table,
      key,
      field,
    );

    return this.request<unknown>({
      path,
      timeout: options?.timeout,
      fetchOptions: options?.fetch,
    });
  }

  async createRecord<T extends ODataRecord = ODataRecord>(
    table: string,
    options: CreateRecordOptions<T>,
  ): Promise<ODataEntityResponse<T>> {
    const path = buildTablePath(this.database, table);

    return this.request<ODataEntityResponse<T>>({
      path,
      method: "POST",
      body: options.data,
      timeout: options.timeout,
      fetchOptions: options.fetch,
      headers: {
        Accept: buildAcceptHeader(),
        "Content-Type": buildContentTypeHeader(),
      },
    });
  }

  async updateRecord<T extends ODataRecord = ODataRecord>(
    table: string,
    key: string | number,
    options: UpdateRecordOptions<T>,
  ): Promise<ODataEntityResponse<T>> {
    const path = buildRecordPath(this.database, table, key);

    return this.request<ODataEntityResponse<T>>({
      path,
      method: "PATCH",
      body: options.data,
      timeout: options.timeout,
      fetchOptions: options.fetch,
      headers: {
        Accept: buildAcceptHeader(),
        "Content-Type": buildContentTypeHeader(),
      },
    });
  }

  async deleteRecord(
    table: string,
    key: string | number,
    options?: DeleteRecordOptions,
  ): Promise<void> {
    const path = buildRecordPath(this.database, table, key);

    await this.request<void>({
      path,
      method: "DELETE",
      timeout: options?.timeout,
      fetchOptions: options?.fetch,
    });
  }

  async updateRecordReferences<T extends ODataRecord = ODataRecord>(
    table: string,
    key: string | number,
    navigation: string,
    options: UpdateRecordReferencesOptions<T>,
  ): Promise<void> {
    const path = buildNavigationPath(
      this.database,
      table,
      key,
      navigation,
    );
    const method = options.method ?? "POST";

    const data = Array.isArray(options.data) ? options.data : [options.data];

    for (const item of data) {
      await this.request<void>({
        path,
        method,
        body: item,
        timeout: options.timeout,
        fetchOptions: options.fetch,
      });
    }
  }

  async navigateRelated<T extends ODataRecord = ODataRecord>(
    table: string,
    key: string | number,
    navigation: string,
    options?: NavigateRelatedOptions,
  ): Promise<ODataResponse<T>> {
    const path = buildNavigationPath(
      this.database,
      table,
      key,
      navigation,
    );
    const query = buildQueryString(options ?? {});

    return this.request<ODataResponse<T>>({
      path,
      query,
      timeout: options?.timeout,
      fetchOptions: options?.fetch,
      headers: {
        Accept: buildAcceptHeader(options),
      },
    });
  }

  async crossJoin<T extends ODataRecord = ODataRecord>(
    tables: string[],
    options?: CrossJoinOptions,
  ): Promise<ODataResponse<T>> {
    const path = buildCrossJoinPath(this.database, tables);
    const query = buildQueryString(options ?? {});

    return this.request<ODataResponse<T>>({
      path,
      query,
      timeout: options?.timeout,
      fetchOptions: options?.fetch,
      headers: {
        Accept: buildAcceptHeader(options),
      },
    });
  }

  async batchRequests(options: BatchOptions): Promise<unknown[]> {
    const path = buildBatchPath(this.database);

    // Construct batch request body
    const batchBody = {
      requests: options.requests.map((req: BatchRequest) => ({
        id: crypto.randomUUID(),
        method: req.method,
        url: req.url,
        headers: req.headers ?? {},
        body: req.body,
      })),
    };

    const response = await this.request<{
      responses: Array<{ id: string; status: number; body: unknown }>;
    }>({
      path,
      method: "POST",
      body: batchBody,
      timeout: options.timeout,
      fetchOptions: options.fetch,
      headers: {
        "Content-Type": "multipart/mixed; boundary=batch",
      },
    });

    return response.responses.map((r) => r.body);
  }

  async createTable(options: CreateTableOptions): Promise<void> {
    // Use FileMaker_Tables system table for schema modifications
    const path = buildFileMakerTablesPath(this.database);

    // Body format per FileMaker docs: { "tableName": "...", "fields": [...] }
    const tableDefinition = {
      tableName: options.tableName,
      fields: options.fields,
    };

    await this.request<void>({
      path,
      method: "POST",
      body: tableDefinition,
      timeout: options.timeout,
      fetchOptions: options.fetch,
    });
  }

  async addFields(table: string, options: AddFieldsOptions): Promise<void> {
    // Use FileMaker_Tables system table for schema modifications
    const path = buildFileMakerTablesPath(this.database, table);

    await this.request<void>({
      path,
      method: "PATCH",
      body: { fields: options.fields },
      timeout: options.timeout,
      fetchOptions: options.fetch,
    });
  }

  async deleteTable(
    table: string,
    options?: DeleteTableOptions,
  ): Promise<void> {
    // Use FileMaker_Tables system table for schema modifications
    const path = buildFileMakerTablesPath(this.database, table);

    await this.request<void>({
      path,
      method: "DELETE",
      timeout: options?.timeout,
      fetchOptions: options?.fetch,
    });
  }

  async deleteField(
    table: string,
    field: string,
    options?: DeleteFieldOptions,
  ): Promise<void> {
    // Use FileMaker_Tables system table for schema modifications
    const path = `${buildFileMakerTablesPath(this.database, table)}/${field}`;

    await this.request<void>({
      path,
      method: "DELETE",
      timeout: options?.timeout,
      fetchOptions: options?.fetch,
    });
  }

  async runScript(table: string, options: RunScriptOptions): Promise<unknown> {
    const path = buildTablePath(this.database, table);
    const query = new URLSearchParams();
    query.set("script", options.script);
    if (options.param) {
      query.set("script.param", options.param);
    }

    return this.request<unknown>({
      path,
      query,
      method: "POST",
      timeout: options.timeout,
      fetchOptions: options.fetch,
    });
  }

  async uploadContainer(
    _table: string,
    _key: string | number,
    _field: string,
    _options: UploadContainerOptions,
  ): Promise<void> {
    // Deferred implementation
    throw new Error("Container upload not yet implemented");
  }
}

