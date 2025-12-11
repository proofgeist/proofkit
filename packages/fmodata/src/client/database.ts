import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ExecutionContext, ExecutableBuilder, Metadata } from "../types";
import type { BaseTable } from "./base-table";
import type { TableOccurrence } from "./table-occurrence";
import { EntitySet } from "./entity-set";
import { BatchBuilder } from "./batch-builder";
import { SchemaManager } from "./schema-manager";

// Helper type to extract schema from a TableOccurrence
type ExtractSchemaFromOccurrence<O> =
  O extends TableOccurrence<infer BT, any, any, any>
    ? BT extends BaseTable<infer S, any, any, any>
      ? S
      : never
    : never;

// Helper type to find an occurrence by name in the occurrences tuple
type FindOccurrenceByName<
  Occurrences extends readonly TableOccurrence<any, any, any, any>[],
  Name extends string,
> = Occurrences extends readonly [
  infer First,
  ...infer Rest extends readonly TableOccurrence<any, any, any, any>[],
]
  ? First extends TableOccurrence<any, any, any, any>
    ? First["name"] extends Name
      ? First
      : FindOccurrenceByName<Rest, Name>
    : never
  : never;

// Helper type to extract all occurrence names from the tuple
type ExtractOccurrenceNames<
  Occurrences extends readonly TableOccurrence<any, any, any, any>[],
> = Occurrences extends readonly []
  ? string // If no occurrences, allow any string
  : Occurrences[number]["name"]; // Otherwise, extract union of names

export class Database<
  Occurrences extends readonly TableOccurrence<
    any,
    any,
    any,
    any
  >[] = readonly [],
> {
  private occurrenceMap: Map<string, TableOccurrence<any, any, any, any>>;
  private _useEntityIds: boolean = false;
  public readonly schema: SchemaManager;

  constructor(
    private readonly databaseName: string,
    private readonly context: ExecutionContext,
    config?: {
      occurrences?: Occurrences | undefined;
      /**
       * Whether to use entity IDs instead of field names in the actual requests to the server
       * Defaults to true if all occurrences use entity IDs, false otherwise
       * If set to false but some occurrences do not use entity IDs, an error will be thrown
       */
      useEntityIds?: boolean;
    },
  ) {
    this.occurrenceMap = new Map();
    if (config?.occurrences) {
      // Validate consistency: either all occurrences use entity IDs or none do
      const occurrencesWithIds: string[] = [];
      const occurrencesWithoutIds: string[] = [];

      for (const occ of config.occurrences) {
        this.occurrenceMap.set(occ.name, occ);

        const hasTableId = occ.isUsingTableId();
        const hasFieldIds = occ.baseTable.isUsingFieldIds();

        // An occurrence uses entity IDs if it has both fmtId and fmfIds
        if (hasTableId && hasFieldIds) {
          occurrencesWithIds.push(occ.name);
        } else if (!hasTableId && !hasFieldIds) {
          occurrencesWithoutIds.push(occ.name);
        } else {
          // Partial entity ID usage (only one of fmtId or fmfIds) - this is an error
          throw new Error(
            `TableOccurrence "${occ.name}" has inconsistent entity ID configuration. ` +
              `Both fmtId (${hasTableId ? "present" : "missing"}) and fmfIds (${hasFieldIds ? "present" : "missing"}) must be defined together.`,
          );
        }
      }

      // Determine default value: true if all occurrences use entity IDs, false otherwise
      const allOccurrencesUseEntityIds =
        occurrencesWithIds.length > 0 && occurrencesWithoutIds.length === 0;
      const hasMixedUsage =
        occurrencesWithIds.length > 0 && occurrencesWithoutIds.length > 0;

      // Handle explicit useEntityIds config
      if (config.useEntityIds !== undefined) {
        if (config.useEntityIds === false) {
          // If explicitly set to false, allow mixed usage and use false
          this._useEntityIds = false;
        } else if (config.useEntityIds === true) {
          // If explicitly set to true, validate that all occurrences use entity IDs
          if (hasMixedUsage || occurrencesWithoutIds.length > 0) {
            throw new Error(
              `useEntityIds is set to true but some occurrences do not use entity IDs. ` +
                `Occurrences without entity IDs: [${occurrencesWithoutIds.join(", ")}]. ` +
                `Either set useEntityIds to false or configure all occurrences with entity IDs.`,
            );
          }
          this._useEntityIds = true;
        }
      } else {
        // Default: true if all occurrences use entity IDs, false otherwise
        // But throw error if there's mixed usage when using defaults
        if (hasMixedUsage) {
          throw new Error(
            `Cannot mix TableOccurrence instances with and without entity IDs in the same database. ` +
              `Occurrences with entity IDs: [${occurrencesWithIds.join(", ")}]. ` +
              `Occurrences without entity IDs: [${occurrencesWithoutIds.join(", ")}]. ` +
              `Either all table occurrences must use entity IDs (fmtId + fmfIds), none should, or explicitly set useEntityIds to false.`,
          );
        }
        this._useEntityIds = allOccurrencesUseEntityIds;
      }
    } else {
      // No occurrences provided, use explicit config or default to false
      this._useEntityIds = config?.useEntityIds ?? false;
    }

    // Inform the execution context whether to use entity IDs
    if (this.context._setUseEntityIds) {
      this.context._setUseEntityIds(this._useEntityIds);
    }

    // Initialize schema manager
    this.schema = new SchemaManager(this.databaseName, this.context);
  }

  /**
   * Returns true if any table occurrence in this database is using entity IDs.
   */
  isUsingEntityIds(): boolean {
    return this._useEntityIds;
  }

  /**
   * Gets a table occurrence by name.
   * @internal
   */
  getOccurrence(name: string): TableOccurrence<any, any, any, any> | undefined {
    return this.occurrenceMap.get(name);
  }

  from<Name extends ExtractOccurrenceNames<Occurrences> | (string & {})>(
    name: Name,
  ): Occurrences extends readonly []
    ? EntitySet<Record<string, StandardSchemaV1>, undefined>
    : Name extends ExtractOccurrenceNames<Occurrences>
      ? EntitySet<
          ExtractSchemaFromOccurrence<FindOccurrenceByName<Occurrences, Name>>,
          FindOccurrenceByName<Occurrences, Name>
        >
      : EntitySet<Record<string, StandardSchemaV1>, undefined> {
    const occurrence = this.occurrenceMap.get(name as string);

    if (occurrence) {
      // Use EntitySet.create to preserve types better
      type OccType = FindOccurrenceByName<Occurrences, Name>;
      type SchemaType = ExtractSchemaFromOccurrence<OccType>;

      return EntitySet.create<SchemaType, OccType>({
        occurrence: occurrence as OccType,
        tableName: name as string,
        databaseName: this.databaseName,
        context: this.context,
        database: this,
      }) as any;
    } else {
      // Return untyped EntitySet for dynamic table access
      return new EntitySet<Record<string, StandardSchemaV1>, undefined>({
        tableName: name as string,
        databaseName: this.databaseName,
        context: this.context,
        database: this,
      }) as any;
    }
  }

  /**
   * Retrieves the OData metadata for this database.
   * @param args Optional configuration object
   * @param args.format The format to retrieve metadata in. Defaults to "json".
   * @returns The metadata in the specified format
   */
  async getMetadata(args: { format: "xml" }): Promise<string>;
  async getMetadata(args?: { format?: "json" }): Promise<Metadata>;
  async getMetadata(args?: {
    format?: "xml" | "json";
  }): Promise<string | Metadata> {
    const result = await this.context._makeRequest<
      Record<string, Metadata> | string
    >(`/${this.databaseName}/$metadata`, {
      headers: {
        Accept: args?.format === "xml" ? "application/xml" : "application/json",
      },
    });
    if (result.error) {
      throw result.error;
    }

    if (args?.format === "json") {
      const data = result.data as Record<string, Metadata>;
      const metadata = data[this.databaseName];
      if (!metadata) {
        throw new Error(
          `Metadata for database "${this.databaseName}" not found in response`,
        );
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
  async runScript<ResultSchema extends StandardSchemaV1<string, any> = never>(
    scriptName: string,
    options?: {
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
      const validationResult = options.resultSchema["~standard"].validate(
        response.scriptResult.resultParameter,
      );
      // Handle both sync and async validation
      const result =
        validationResult instanceof Promise
          ? await validationResult
          : validationResult;

      if (result.issues) {
        throw new Error(
          `Script result validation failed: ${JSON.stringify(result.issues)}`,
        );
      }

      return {
        resultCode: response.scriptResult.code,
        result: result.value,
      } as any;
    }

    return {
      resultCode: response.scriptResult.code,
      result: response.scriptResult.resultParameter,
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
  batch<const Builders extends readonly ExecutableBuilder<any>[]>(
    builders: Builders,
  ): BatchBuilder<Builders> {
    return new BatchBuilder(builders, this.databaseName, this.context);
  }
}
