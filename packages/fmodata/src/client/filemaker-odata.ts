import createClient, {
  AbortError,
  CircuitOpenError,
  type FFetchOptions,
  NetworkError,
  RetryLimitError,
  TimeoutError,
} from "@fetchkit/ffetch";
import { get } from "es-toolkit/compat";
import { HTTPError, ODataError, ResponseParseError, SchemaLockedError } from "../errors";
import { createLogger, type InternalLogger, type Logger } from "../logger";
import type { Auth, ExecutionContext, Result } from "../types";
import { getAcceptHeader } from "../types";
import { Database } from "./database";
import { safeJsonParse } from "./sanitize-json";

const TRAILING_SLASH_REGEX = /\/+$/;

export class FMServerConnection implements ExecutionContext {
  private readonly fetchClient: ReturnType<typeof createClient>;
  private readonly serverUrl: string;
  private readonly auth: Auth;
  private useEntityIds = false;
  private includeSpecialColumns = false;
  private readonly logger: InternalLogger;
  constructor(config: {
    serverUrl: string;
    auth: Auth;
    fetchClientOptions?: FFetchOptions;
    logger?: Logger;
  }) {
    this.logger = createLogger(config.logger);
    this.fetchClient = createClient({
      retries: 0,
      ...config.fetchClientOptions,
    });
    // Ensure the URL uses https://, is valid, and has no trailing slash
    const url = new URL(config.serverUrl);
    if (url.protocol !== "https:") {
      url.protocol = "https:";
    }
    // Remove any trailing slash from pathname
    url.pathname = url.pathname.replace(TRAILING_SLASH_REGEX, "");
    this.serverUrl = url.toString().replace(TRAILING_SLASH_REGEX, "");
    this.auth = config.auth;
  }

  /**
   * @internal
   * Sets whether to use FileMaker entity IDs (FMFID/FMTID) in requests
   */
  _setUseEntityIds(useEntityIds: boolean): void {
    this.useEntityIds = useEntityIds;
  }

  /**
   * @internal
   * Gets whether to use FileMaker entity IDs (FMFID/FMTID) in requests
   */
  _getUseEntityIds(): boolean {
    return this.useEntityIds;
  }

  /**
   * @internal
   * Sets whether to include special columns (ROWID and ROWMODID) in requests
   */
  _setIncludeSpecialColumns(includeSpecialColumns: boolean): void {
    this.includeSpecialColumns = includeSpecialColumns;
  }

  /**
   * @internal
   * Gets whether to include special columns (ROWID and ROWMODID) in requests
   */
  _getIncludeSpecialColumns(): boolean {
    return this.includeSpecialColumns;
  }

  /**
   * @internal
   * Gets the base URL for OData requests
   */
  _getBaseUrl(): string {
    return `${this.serverUrl}${"apiKey" in this.auth ? "/otto" : ""}/fmi/odata/v4`;
  }

  /**
   * @internal
   * Gets the logger instance
   */
  _getLogger(): InternalLogger {
    return this.logger;
  }

  /**
   * @internal
   */
  async _makeRequest<T>(
    url: string,
    options?: RequestInit &
      FFetchOptions & {
        useEntityIds?: boolean;
        includeSpecialColumns?: boolean;
      },
  ): Promise<Result<T>> {
    const logger = this._getLogger();
    const baseUrl = `${this.serverUrl}${"apiKey" in this.auth ? "/otto" : ""}/fmi/odata/v4`;
    const fullUrl = baseUrl + url;

    // Use per-request override if provided, otherwise use the database-level setting
    const useEntityIds = options?.useEntityIds ?? this.useEntityIds;
    const includeSpecialColumns = options?.includeSpecialColumns ?? this.includeSpecialColumns;

    // Get includeODataAnnotations from options (it's passed through from execute options)
    // biome-ignore lint/suspicious/noExplicitAny: Type assertion for optional property access
    const includeODataAnnotations = (options as any)?.includeODataAnnotations;

    // Build Prefer header as comma-separated list when multiple preferences are set
    const preferValues: string[] = [];
    if (useEntityIds) {
      preferValues.push("fmodata.entity-ids");
    }
    if (includeSpecialColumns) {
      preferValues.push("fmodata.include-specialcolumns");
    }

    const headers = {
      Authorization:
        "apiKey" in this.auth
          ? `Bearer ${this.auth.apiKey}`
          : `Basic ${btoa(`${this.auth.username}:${this.auth.password}`)}`,
      "Content-Type": "application/json",
      Accept: getAcceptHeader(includeODataAnnotations),
      ...(preferValues.length > 0 ? { Prefer: preferValues.join(", ") } : {}),
      ...(options?.headers || {}),
    };

    // Prepare loggableHeaders by omitting the Authorization key
    const { Authorization, ...loggableHeaders } = headers;
    logger.debug("Request headers:", loggableHeaders);

    // TEMPORARY WORKAROUND: Hopefully this feature will be fixed in the ffetch library
    // Extract fetchHandler and headers separately, only for tests where we're overriding the fetch handler per-request
    const fetchHandler = options?.fetchHandler;
    const { headers: _headers, fetchHandler: _fetchHandler, ...restOptions } = options || {};

    // If fetchHandler is provided, create a temporary client with it
    // Otherwise use the existing client
    const clientToUse = fetchHandler ? createClient({ retries: 0, fetchHandler }) : this.fetchClient;

    try {
      const finalOptions = {
        ...restOptions,
        headers,
      };

      const resp = await clientToUse(fullUrl, finalOptions);
      logger.debug(`${finalOptions.method ?? "GET"} ${resp.status} ${fullUrl}`);

      // Handle HTTP errors
      if (!resp.ok) {
        // Try to parse error body if it's JSON
        let errorBody: { error?: { code?: string | number; message?: string } } | undefined;
        try {
          if (resp.headers.get("content-type")?.includes("application/json")) {
            errorBody = await safeJsonParse<typeof errorBody>(resp);
          }
        } catch {
          // Ignore JSON parse errors
        }

        // Check if it's an OData error response
        if (errorBody?.error) {
          const errorCode = errorBody.error.code;
          const errorMessage = errorBody.error.message || resp.statusText;

          // Check for schema locked error (code 303)
          if (errorCode === "303" || errorCode === 303) {
            return {
              data: undefined,
              error: new SchemaLockedError(fullUrl, errorMessage, errorBody.error),
            };
          }

          return {
            data: undefined,
            error: new ODataError(fullUrl, errorMessage, String(errorCode), errorBody.error),
          };
        }

        return {
          data: undefined,
          error: new HTTPError(fullUrl, resp.status, resp.statusText, errorBody),
        };
      }

      // Check for affected rows header (for DELETE and bulk PATCH operations)
      // FileMaker may return this with 204 No Content or 200 OK
      const affectedRows = resp.headers.get("fmodata.affected_rows");
      if (affectedRows !== null) {
        return { data: Number.parseInt(affectedRows, 10) as T, error: undefined };
      }

      // Handle 204 No Content with no body
      if (resp.status === 204) {
        // Check for Location header (used for insert with return=minimal)
        // Use optional chaining for safety with mocks that might not have proper headers
        const locationHeader = resp.headers?.get?.("Location") || resp.headers?.get?.("location");
        if (locationHeader) {
          // Return the location header so InsertBuilder can extract ROWID
          return { data: { _location: locationHeader } as T, error: undefined };
        }
        return { data: 0 as T, error: undefined };
      }

      // Parse response
      if (resp.headers.get("content-type")?.includes("application/json")) {
        const data = await safeJsonParse<T & { error?: { code?: string | number; message?: string } }>(resp);

        // Check for embedded OData errors
        if (get(data, "error", null)) {
          const errorCode = get(data, "error.code", null);
          const errorMessage = get(data, "error.message", "Unknown OData error");

          // Check for schema locked error (code 303)
          if (errorCode === "303" || errorCode === 303) {
            return {
              data: undefined,
              error: new SchemaLockedError(fullUrl, errorMessage, data.error),
            };
          }

          return {
            data: undefined,
            error: new ODataError(fullUrl, errorMessage, String(errorCode), data.error),
          };
        }

        return { data: data as T, error: undefined };
      }

      return { data: (await resp.text()) as T, error: undefined };
    } catch (err) {
      // Map ffetch errors - return them directly (no re-wrapping)
      if (
        err instanceof TimeoutError ||
        err instanceof AbortError ||
        err instanceof NetworkError ||
        err instanceof RetryLimitError ||
        err instanceof CircuitOpenError
      ) {
        return { data: undefined, error: err };
      }

      // Handle JSON parse errors (ResponseParseError from safeJsonParse)
      if (err instanceof ResponseParseError) {
        return { data: undefined, error: err };
      }

      // Unknown error - wrap it as NetworkError
      return {
        data: undefined,
        error: new NetworkError(fullUrl, err),
      };
    }
  }

  database<IncludeSpecialColumns extends boolean = false>(
    name: string,
    config?: {
      useEntityIds?: boolean;
      includeSpecialColumns?: IncludeSpecialColumns;
    },
  ): Database<IncludeSpecialColumns> {
    return new Database<IncludeSpecialColumns>(name, this, config);
  }

  /**
   * Lists all available databases from the FileMaker OData service.
   * @returns Promise resolving to an array of database names
   */
  async listDatabaseNames(): Promise<string[]> {
    const result = await this._makeRequest<{
      value?: Array<{ name: string }>;
    }>("/$metadata", { headers: { Accept: "application/json" } });
    if (result.error) {
      throw result.error;
    }
    if (result.data.value && Array.isArray(result.data.value)) {
      return result.data.value.map((item) => item.name);
    }
    return [];
  }
}
