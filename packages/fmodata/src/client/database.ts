import type { StandardSchemaV1 } from "@standard-schema/spec";
import { FMTable } from "../orm/table";
import type { ExecutableBuilder, ExecutionContext, Metadata } from "../types";
import { BatchBuilder } from "./batch-builder";
import { EntitySet } from "./entity-set";
import { SchemaManager } from "./schema-manager";
import { WebhookManager } from "./webhook-builder";

interface MetadataArgs {
  format?: "xml" | "json";
  /**
   * If provided, only the metadata for the specified table will be returned.
   * Requires FileMaker Server 22.0.4 or later.
   */
  tableName?: string;
  /**
   * If true, a reduced payload size will be returned by omitting certain annotations.
   */
  reduceAnnotations?: boolean;
}

export class Database<IncludeSpecialColumns extends boolean = false> {
  readonly schema: SchemaManager;
  readonly webhook: WebhookManager;
  private readonly databaseName: string;
  private readonly context: ExecutionContext;
  private _useEntityIds: boolean;
  private readonly _includeSpecialColumns: IncludeSpecialColumns;

  constructor(
    databaseName: string,
    context: ExecutionContext,
    config?: {
      /**
       * Whether to use entity IDs instead of field names in the actual requests to the server
       * Defaults to true if all occurrences use entity IDs, false otherwise
       * If set to false but some occurrences do not use entity IDs, an error will be thrown
       */
      useEntityIds?: boolean;
      /**
       * Whether to include special columns (ROWID and ROWMODID) in responses.
       * Note: Special columns are only included when there is no $select query.
       */
      includeSpecialColumns?: IncludeSpecialColumns;
    },
  ) {
    this.databaseName = databaseName;
    this.context = context;
    // Initialize schema manager
    this.schema = new SchemaManager(this.databaseName, this.context);
    this.webhook = new WebhookManager(this.databaseName, this.context);
    this._useEntityIds = config?.useEntityIds ?? false;
    this._includeSpecialColumns = (config?.includeSpecialColumns ?? false) as IncludeSpecialColumns;
  }

  /**
   * @internal Used by EntitySet to access database configuration
   */
  get _getUseEntityIds(): boolean {
    return this._useEntityIds;
  }

  /**
   * @internal Used by EntitySet to access database configuration
   */
  get _getIncludeSpecialColumns(): IncludeSpecialColumns {
    return this._includeSpecialColumns;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
  from<T extends FMTable<any, any>>(table: T): EntitySet<T, IncludeSpecialColumns> {
    // Only override database-level useEntityIds if table explicitly sets it
    // (not if it's undefined, which would override the database setting)
    if (Object.hasOwn(table, FMTable.Symbol.UseEntityIds)) {
      // biome-ignore lint/suspicious/noExplicitAny: Type assertion for Symbol property access
      const tableUseEntityIds = (table as any)[FMTable.Symbol.UseEntityIds];
      if (typeof tableUseEntityIds === "boolean") {
        this._useEntityIds = tableUseEntityIds;
      }
    }
    return new EntitySet<T, IncludeSpecialColumns>({
      occurrence: table as T,
      databaseName: this.databaseName,
      context: this.context,
      database: this,
    });
  }

  /**
   * Retrieves the OData metadata for this database.
   * @param args Optional configuration object
   * @param args.format The format to retrieve metadata in. Defaults to "json".
   * @param args.tableName If provided, only the metadata for the specified table will be returned. Requires FileMaker Server 22.0.4 or later.
   * @param args.reduceAnnotations If true, a reduced payload size will be returned by omitting certain annotations.
   * @returns The metadata in the specified format
   */
  async getMetadata(args: { format: "xml" } & MetadataArgs): Promise<string>;
  async getMetadata(args?: { format?: "json" } & MetadataArgs): Promise<Metadata>;
  async getMetadata(args?: MetadataArgs): Promise<string | Metadata> {
    // Build the URL - if tableName is provided, append %23{tableName} to the path
    let url = `/${this.databaseName}/$metadata`;
    if (args?.tableName) {
      url = `/${this.databaseName}/$metadata%23${args.tableName}`;
    }

    // Build headers
    const headers: Record<string, string> = {
      Accept: args?.format === "xml" ? "application/xml" : "application/json",
    };

    // Add Prefer header if reduceAnnotations is true
    if (args?.reduceAnnotations) {
      headers.Prefer = 'include-annotations="-*"';
    }

    const result = await this.context._makeRequest<Record<string, Metadata> | string>(url, {
      headers,
    });
    if (result.error) {
      throw result.error;
    }

    if (args?.format === "json") {
      const data = result.data as Record<string, Metadata>;
      const metadata = data[this.databaseName];
      if (!metadata) {
        throw new Error(`Metadata for database "${this.databaseName}" not found in response`);
      }
      return metadata;
    }
    return result.data as string;
  }

  /**
   * Lists all available tables (entity sets) in this database.
   * @returns Promise resolving to an array of table names
   */
  async listTableNames(): Promise<string[]> {
    const result = await this.context._makeRequest<{
      value?: Array<{ name: string }>;
    }>(`/${this.databaseName}`);
    if (result.error) {
      throw result.error;
    }
    if (result.data.value && Array.isArray(result.data.value)) {
      return result.data.value.map((item) => item.name);
    }
    return [];
  }

  /**
   * Executes a FileMaker script.
   * @param scriptName - The name of the script to execute (must be valid according to OData rules)
   * @param options - Optional script parameter and result schema
   * @returns Promise resolving to script execution result
   */
  // biome-ignore lint/suspicious/noExplicitAny: Required for type inference with infer
  async runScript<ResultSchema extends StandardSchemaV1<string, any> = never>(
    scriptName: string,
    options?: {
      // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any record shape
      scriptParam?: string | number | Record<string, any>;
      resultSchema?: ResultSchema;
    },
  ): Promise<
    [ResultSchema] extends [never]
      ? { resultCode: number; result?: string }
      : ResultSchema extends StandardSchemaV1<string, infer Output>
        ? { resultCode: number; result: Output }
        : { resultCode: number; result?: string }
  > {
    const body: { scriptParameterValue?: unknown } = {};
    if (options?.scriptParam !== undefined) {
      body.scriptParameterValue = options.scriptParam;
    }

    const result = await this.context._makeRequest<{
      scriptResult: {
        code: number;
        resultParameter?: string;
      };
    }>(`/${this.databaseName}/Script.${scriptName}`, {
      method: "POST",
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });

    if (result.error) {
      throw result.error;
    }

    const response = result.data;

    // If resultSchema is provided, validate the result through it
    if (options?.resultSchema && response.scriptResult !== undefined) {
      const validationResult = options.resultSchema["~standard"].validate(response.scriptResult.resultParameter);
      // Handle both sync and async validation
      const result = validationResult instanceof Promise ? await validationResult : validationResult;

      if (result.issues) {
        throw new Error(`Script result validation failed: ${JSON.stringify(result.issues)}`);
      }

      return {
        resultCode: response.scriptResult.code,
        result: result.value,
        // biome-ignore lint/suspicious/noExplicitAny: Type assertion for generic return type
      } as any;
    }

    return {
      resultCode: response.scriptResult.code,
      result: response.scriptResult.resultParameter,
      // biome-ignore lint/suspicious/noExplicitAny: Type assertion for generic return type
    } as any;
  }

  /**
   * Create a batch operation builder that allows multiple queries to be executed together
   * in a single atomic request. All operations succeed or fail together (transactional).
   *
   * @param builders - Array of executable query builders to batch
   * @returns A BatchBuilder that can be executed
   * @example
   * ```ts
   * const result = await db.batch([
   *   db.from('contacts').list().top(5),
   *   db.from('users').list().top(5),
   *   db.from('contacts').insert({ name: 'John' })
   * ]).execute();
   *
   * if (result.data) {
   *   const [contacts, users, insertResult] = result.data;
   * }
   * ```
   */
  // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any ExecutableBuilder result type
  batch<const Builders extends readonly ExecutableBuilder<any>[]>(builders: Builders): BatchBuilder<Builders> {
    return new BatchBuilder(builders, this.databaseName, this.context);
  }
}
