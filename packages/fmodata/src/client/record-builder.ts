import type {
  ExecutionContext,
  ExecutableBuilder,
  Result,
  ODataRecordMetadata,
  ODataFieldResponse,
  InferSchemaType,
  ExecuteOptions,
  WithSystemFields,
  ConditionallyWithODataAnnotations,
} from "../types";
import { getAcceptHeader } from "../types";
import type { TableOccurrence } from "./table-occurrence";
import type { BaseTable } from "./base-table";
import {
  transformTableName,
  transformResponseFields,
  getTableIdentifiers,
  transformFieldNamesArray,
} from "../transform";
import { safeJsonParse } from "./sanitize-json";
import { parseErrorResponse } from "./error-parser";
import { QueryBuilder } from "./query-builder";
import {
  validateSingleResponse,
  type ExpandValidationConfig,
} from "../validation";
import { type FFetchOptions } from "@fetchkit/ffetch";
import { StandardSchemaV1 } from "@standard-schema/spec";
import { QueryOptions } from "odata-query";
import buildQuery from "odata-query";

// Helper type to extract schema from a TableOccurrence
type ExtractSchemaFromOccurrence<O> =
  O extends TableOccurrence<infer BT, any, any, any>
    ? BT extends BaseTable<infer S, any, any, any>
      ? S
      : never
    : never;

// Helper type to extract navigation relation names from an occurrence
type ExtractNavigationNames<
  O extends TableOccurrence<any, any, any, any> | undefined,
> =
  O extends TableOccurrence<any, any, infer Nav, any>
    ? Nav extends Record<string, any>
      ? keyof Nav & string
      : never
    : never;

// Helper type to find target occurrence by relation name
type FindNavigationTarget<
  O extends TableOccurrence<any, any, any, any> | undefined,
  Name extends string,
> =
  O extends TableOccurrence<any, any, infer Nav, any>
    ? Nav extends Record<string, any>
      ? Name extends keyof Nav
        ? Nav[Name]
        : TableOccurrence<
            BaseTable<Record<string, StandardSchemaV1>, any, any, any>,
            any,
            any,
            any
          >
      : TableOccurrence<
          BaseTable<Record<string, StandardSchemaV1>, any, any, any>,
          any,
          any,
          any
        >
    : TableOccurrence<
        BaseTable<Record<string, StandardSchemaV1>, any, any, any>,
        any,
        any,
        any
      >;

// Helper type to get the inferred schema type from a target occurrence
type GetTargetSchemaType<
  O extends TableOccurrence<any, any, any, any> | undefined,
  Rel extends string,
> = [FindNavigationTarget<O, Rel>] extends [
  TableOccurrence<infer BT, any, any, any>,
]
  ? [BT] extends [BaseTable<infer S, any, any, any>]
    ? [S] extends [Record<string, StandardSchemaV1>]
      ? InferSchemaType<S>
      : Record<string, any>
    : Record<string, any>
  : Record<string, any>;

// Internal type for expand configuration
type ExpandConfig = {
  relation: string;
  options?: Partial<QueryOptions<any>>;
};

// Type to represent expanded relations
export type ExpandedRelations = Record<string, { schema: any; selected: any }>;

// Return type for RecordBuilder execute
export type RecordReturnType<
  T extends Record<string, any>,
  IsSingleField extends boolean,
  FieldKey extends keyof T,
  Selected extends keyof T,
  Expands extends ExpandedRelations,
> = IsSingleField extends true
  ? T[FieldKey]
  : Pick<T, Selected> & {
      [K in keyof Expands]: Pick<
        Expands[K]["schema"],
        Expands[K]["selected"]
      >[];
    };

export class RecordBuilder<
  T extends Record<string, any>,
  IsSingleField extends boolean = false,
  FieldKey extends keyof T = keyof T,
  Occ extends TableOccurrence<any, any, any, any> | undefined =
    | TableOccurrence<any, any, any, any>
    | undefined,
  Selected extends keyof T = keyof T,
  Expands extends ExpandedRelations = {},
> implements
    ExecutableBuilder<
      RecordReturnType<T, IsSingleField, FieldKey, Selected, Expands>
    >
{
  private occurrence?: Occ;
  private tableName: string;
  private databaseName: string;
  private context: ExecutionContext;
  private recordId: string | number;
  private operation?: "getSingleField" | "navigate";
  private operationParam?: string;
  private isNavigateFromEntitySet?: boolean;
  private navigateRelation?: string;
  private navigateSourceTableName?: string;

  private databaseUseEntityIds: boolean;

  // New properties for select/expand support
  private selectedFields?: string[];
  private expandConfigs: ExpandConfig[] = [];

  constructor(config: {
    occurrence?: Occ;
    tableName: string;
    databaseName: string;
    context: ExecutionContext;
    recordId: string | number;
    databaseUseEntityIds?: boolean;
  }) {
    this.occurrence = config.occurrence;
    this.tableName = config.tableName;
    this.databaseName = config.databaseName;
    this.context = config.context;
    this.recordId = config.recordId;
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

  getSingleField<K extends keyof T>(
    field: K,
  ): RecordBuilder<T, true, K, Occ, keyof T, {}> {
    const newBuilder = new RecordBuilder<T, true, K, Occ, keyof T, {}>({
      occurrence: this.occurrence,
      tableName: this.tableName,
      databaseName: this.databaseName,
      context: this.context,
      recordId: this.recordId,
      databaseUseEntityIds: this.databaseUseEntityIds,
    });
    newBuilder.operation = "getSingleField";
    newBuilder.operationParam = field.toString();
    // Preserve navigation context
    newBuilder.isNavigateFromEntitySet = this.isNavigateFromEntitySet;
    newBuilder.navigateRelation = this.navigateRelation;
    newBuilder.navigateSourceTableName = this.navigateSourceTableName;
    return newBuilder;
  }

  /**
   * Select specific fields to retrieve from the record.
   * Only the selected fields will be returned in the response.
   *
   * @example
   * ```typescript
   * const contact = await db.from("contacts").get("uuid").select("name", "email").execute();
   * // contact.data has type { name: string; email: string }
   * ```
   */
  select<K extends keyof T>(
    ...fields: K[]
  ): RecordBuilder<T, false, FieldKey, Occ, K, Expands> {
    const uniqueFields = [...new Set(fields)];
    const newBuilder = new RecordBuilder<T, false, FieldKey, Occ, K, Expands>({
      occurrence: this.occurrence,
      tableName: this.tableName,
      databaseName: this.databaseName,
      context: this.context,
      recordId: this.recordId,
      databaseUseEntityIds: this.databaseUseEntityIds,
    });
    newBuilder.selectedFields = uniqueFields.map((f) => String(f));
    newBuilder.expandConfigs = [...this.expandConfigs];
    // Preserve navigation context
    newBuilder.isNavigateFromEntitySet = this.isNavigateFromEntitySet;
    newBuilder.navigateRelation = this.navigateRelation;
    newBuilder.navigateSourceTableName = this.navigateSourceTableName;
    return newBuilder;
  }

  /**
   * Expand a navigation property to include related records.
   * Supports nested select, filter, orderBy, and expand operations.
   *
   * @example
   * ```typescript
   * // Simple expand
   * const contact = await db.from("contacts").get("uuid").expand("users").execute();
   *
   * // Expand with select
   * const contact = await db.from("contacts").get("uuid")
   *   .expand("users", b => b.select("username", "email"))
   *   .execute();
   * ```
   */
  expand<
    Rel extends ExtractNavigationNames<Occ> | (string & {}),
    TargetOcc extends FindNavigationTarget<Occ, Rel> = FindNavigationTarget<
      Occ,
      Rel
    >,
    TargetSchema extends GetTargetSchemaType<Occ, Rel> = GetTargetSchemaType<
      Occ,
      Rel
    >,
    TargetSelected extends keyof TargetSchema = keyof TargetSchema,
  >(
    relation: Rel,
    callback?: (
      builder: QueryBuilder<
        TargetSchema,
        keyof TargetSchema,
        false,
        false,
        TargetOcc extends TableOccurrence<any, any, any, any>
          ? TargetOcc
          : undefined
      >,
    ) => QueryBuilder<
      WithSystemFields<TargetSchema>,
      TargetSelected,
      any,
      any,
      any
    >,
  ): RecordBuilder<
    T,
    false,
    FieldKey,
    Occ,
    Selected,
    Expands & {
      [K in Rel]: { schema: TargetSchema; selected: TargetSelected };
    }
  > {
    // Look up target occurrence from navigation
    const targetOccurrence = this.occurrence?.navigation[relation as string];

    // Helper function to get defaultSelect fields from target occurrence
    const getDefaultSelectFields = (): string[] | undefined => {
      if (!targetOccurrence) return undefined;
      const defaultSelect = targetOccurrence.defaultSelect;
      if (defaultSelect === "schema") {
        const schema = targetOccurrence.baseTable?.schema;
        if (schema) {
          return [...new Set(Object.keys(schema))];
        }
      } else if (Array.isArray(defaultSelect)) {
        return [...new Set(defaultSelect)];
      }
      // If "all", return undefined (no select restriction)
      return undefined;
    };

    // Create new builder with updated types
    const newBuilder = new RecordBuilder<
      T,
      false,
      FieldKey,
      Occ,
      Selected,
      Expands & {
        [K in Rel]: { schema: TargetSchema; selected: TargetSelected };
      }
    >({
      occurrence: this.occurrence,
      tableName: this.tableName,
      databaseName: this.databaseName,
      context: this.context,
      recordId: this.recordId,
      databaseUseEntityIds: this.databaseUseEntityIds,
    });

    // Copy existing state
    newBuilder.selectedFields = this.selectedFields;
    newBuilder.expandConfigs = [...this.expandConfigs];
    newBuilder.isNavigateFromEntitySet = this.isNavigateFromEntitySet;
    newBuilder.navigateRelation = this.navigateRelation;
    newBuilder.navigateSourceTableName = this.navigateSourceTableName;

    if (callback) {
      // Create a new QueryBuilder for the target occurrence
      const targetBuilder = new QueryBuilder<any>({
        occurrence: targetOccurrence,
        tableName: targetOccurrence?.name ?? (relation as string),
        databaseName: this.databaseName,
        context: this.context,
        databaseUseEntityIds: this.databaseUseEntityIds,
      });

      // Cast to the expected type for the callback
      // At runtime, the builder is untyped (any), but at compile-time we enforce proper types
      const typedBuilder = targetBuilder as QueryBuilder<
        TargetSchema,
        keyof TargetSchema,
        false,
        false,
        TargetOcc extends TableOccurrence<any, any, any, any>
          ? TargetOcc
          : undefined
      >;

      // Pass to callback and get configured builder
      const configuredBuilder = callback(typedBuilder);

      // Extract the builder's query options
      const expandOptions: Partial<QueryOptions<any>> = {
        ...(configuredBuilder as any).queryOptions,
      };

      // If callback didn't provide select, apply defaultSelect from target occurrence
      if (!expandOptions.select) {
        const defaultFields = getDefaultSelectFields();
        if (defaultFields) {
          expandOptions.select = defaultFields;
        }
      }

      // If the configured builder has nested expands, we need to include them
      if ((configuredBuilder as any).expandConfigs?.length > 0) {
        // Build nested expand string from the configured builder's expand configs
        const nestedExpandString = this.buildExpandString(
          (configuredBuilder as any).expandConfigs,
        );
        if (nestedExpandString) {
          // Add nested expand to options
          expandOptions.expand = nestedExpandString as any;
        }
      }

      const expandConfig: ExpandConfig = {
        relation: relation as string,
        options: expandOptions,
      };

      newBuilder.expandConfigs.push(expandConfig);
    } else {
      // Simple expand without callback - apply defaultSelect if available
      const defaultFields = getDefaultSelectFields();
      if (defaultFields) {
        newBuilder.expandConfigs.push({
          relation: relation as string,
          options: { select: defaultFields },
        });
      } else {
        newBuilder.expandConfigs.push({ relation: relation as string });
      }
    }

    return newBuilder;
  }

  // Overload for valid relation names - returns typed QueryBuilder
  navigate<RelationName extends ExtractNavigationNames<Occ>>(
    relationName: RelationName,
  ): QueryBuilder<
    ExtractSchemaFromOccurrence<
      FindNavigationTarget<Occ, RelationName>
    > extends Record<string, StandardSchemaV1>
      ? InferSchemaType<
          ExtractSchemaFromOccurrence<FindNavigationTarget<Occ, RelationName>>
        >
      : Record<string, any>
  >;
  // Overload for arbitrary strings - returns generic QueryBuilder with system fields
  navigate(
    relationName: string,
  ): QueryBuilder<{ ROWID: number; ROWMODID: number; [key: string]: any }>;
  // Implementation
  navigate(relationName: string): QueryBuilder<any> {
    // Use the target occurrence if available, otherwise allow untyped navigation
    // (useful when types might be incomplete)
    const targetOccurrence = this.occurrence?.navigation[relationName];
    const builder = new QueryBuilder<any>({
      occurrence: targetOccurrence,
      tableName: targetOccurrence?.name ?? relationName,
      databaseName: this.databaseName,
      context: this.context,
    });
    // Store the navigation info - we'll use it in execute
    // Transform relation name to FMTID if using entity IDs
    const relationId = targetOccurrence
      ? transformTableName(targetOccurrence)
      : relationName;

    (builder as any).isNavigate = true;
    (builder as any).navigateRecordId = this.recordId;
    (builder as any).navigateRelation = relationId;

    // If this RecordBuilder came from a navigated EntitySet, we need to preserve that base path
    if (
      this.isNavigateFromEntitySet &&
      this.navigateSourceTableName &&
      this.navigateRelation
    ) {
      // Build the base path: /sourceTable/relation('recordId')/newRelation
      (builder as any).navigateSourceTableName = this.navigateSourceTableName;
      (builder as any).navigateBaseRelation = this.navigateRelation;
    } else {
      // Normal record navigation: /tableName('recordId')/relation
      // Transform source table name to FMTID if using entity IDs
      const sourceTableId = this.occurrence
        ? transformTableName(this.occurrence)
        : this.tableName;
      (builder as any).navigateSourceTableName = sourceTableId;
    }

    return builder;
  }

  /**
   * Formats select fields for use in query strings.
   * - Transforms field names to FMFIDs if using entity IDs
   * - Wraps "id" fields in double quotes
   * - URL-encodes special characters but preserves spaces
   */
  private formatSelectFields(
    select: string[] | undefined,
    baseTable?: BaseTable<any, any, any, any>,
    useEntityIds?: boolean,
  ): string {
    if (!select || select.length === 0) return "";

    // Transform to field IDs if using entity IDs AND the feature is enabled
    const shouldTransform =
      baseTable && (useEntityIds ?? this.databaseUseEntityIds);
    const transformedFields = shouldTransform
      ? transformFieldNamesArray(select, baseTable)
      : select;

    return transformedFields
      .map((field) => {
        if (field === "id") return `"id"`;
        const encodedField = encodeURIComponent(String(field));
        return encodedField.replace(/%20/g, " ");
      })
      .join(",");
  }

  /**
   * Builds expand validation configs from internal expand configurations.
   * These are used to validate expanded navigation properties.
   */
  private buildExpandValidationConfigs(
    configs: ExpandConfig[],
  ): ExpandValidationConfig[] {
    return configs.map((config) => {
      // Look up target occurrence from navigation
      const targetOccurrence = this.occurrence?.navigation[config.relation];
      const targetSchema = targetOccurrence?.baseTable?.schema;

      // Extract selected fields from options
      const selectedFields = config.options?.select
        ? Array.isArray(config.options.select)
          ? config.options.select.map((f) => String(f))
          : [String(config.options.select)]
        : undefined;

      return {
        relation: config.relation,
        targetSchema: targetSchema,
        targetOccurrence: targetOccurrence,
        targetBaseTable: targetOccurrence?.baseTable,
        occurrence: targetOccurrence, // For transformation
        selectedFields: selectedFields,
        nestedExpands: undefined, // TODO: Handle nested expands if needed
      };
    });
  }

  /**
   * Builds OData expand query string from expand configurations.
   * Handles nested expands recursively.
   * Transforms relation names to FMTIDs if using entity IDs.
   */
  private buildExpandString(configs: ExpandConfig[]): string {
    if (configs.length === 0) {
      return "";
    }

    return configs
      .map((config) => {
        // Get target occurrence for this relation
        const targetOccurrence = this.occurrence?.navigation[config.relation];

        // When using entity IDs, use the target table's FMTID in the expand parameter
        // FileMaker expects FMTID in $expand when Prefer header is set
        const relationName =
          targetOccurrence && targetOccurrence.isUsingTableId?.()
            ? targetOccurrence.getTableId()
            : config.relation;

        if (!config.options || Object.keys(config.options).length === 0) {
          // Simple expand without options
          return relationName;
        }

        // Build query options for this expand
        const parts: string[] = [];

        if (config.options.select) {
          // Pass target base table for field transformation
          const selectFields = this.formatSelectFields(
            Array.isArray(config.options.select)
              ? config.options.select.map((f) => String(f))
              : [String(config.options.select)],
            targetOccurrence?.baseTable,
          );
          parts.push(`$select=${selectFields}`);
        }

        if (config.options.filter) {
          // Filter should already be transformed by the nested builder
          // Use odata-query to build filter string
          const filterQuery = buildQuery({ filter: config.options.filter });
          const filterMatch = filterQuery.match(/\$filter=([^&]+)/);
          if (filterMatch) {
            parts.push(`$filter=${filterMatch[1]}`);
          }
        }

        if (config.options.orderBy) {
          const orderByQuery = buildQuery({ orderBy: config.options.orderBy });
          const orderByMatch = orderByQuery.match(/\$orderby=([^&]+)/);
          if (orderByMatch) {
            parts.push(`$orderby=${orderByMatch[1]}`);
          }
        }

        if (config.options.top !== undefined) {
          parts.push(`$top=${config.options.top}`);
        }

        if (config.options.skip !== undefined) {
          parts.push(`$skip=${config.options.skip}`);
        }

        // Handle nested expand
        if (config.options.expand) {
          // Nested expand is already a string from buildExpandString
          parts.push(`$expand=${String(config.options.expand)}`);
        }

        if (parts.length === 0) {
          return relationName;
        }

        return `${relationName}(${parts.join(";")})`;
      })
      .join(",");
  }

  /**
   * Builds the complete query string including $select and $expand parameters.
   */
  private buildQueryString(): string {
    const parts: string[] = [];

    // Build $select
    if (this.selectedFields && this.selectedFields.length > 0) {
      const selectString = this.formatSelectFields(
        this.selectedFields,
        this.occurrence?.baseTable,
      );
      if (selectString) {
        parts.push(`$select=${selectString}`);
      }
    }

    // Build $expand
    const expandString = this.buildExpandString(this.expandConfigs);
    if (expandString) {
      parts.push(`$expand=${expandString}`);
    }

    if (parts.length === 0) {
      return "";
    }

    return `?${parts.join("&")}`;
  }

  async execute<EO extends ExecuteOptions>(
    options?: RequestInit & FFetchOptions & EO,
  ): Promise<
    Result<
      ConditionallyWithODataAnnotations<
        RecordReturnType<T, IsSingleField, FieldKey, Selected, Expands>,
        EO["includeODataAnnotations"] extends true ? true : false
      >
    >
  > {
    let url: string;

    // Build the base URL depending on whether this came from a navigated EntitySet
    if (
      this.isNavigateFromEntitySet &&
      this.navigateSourceTableName &&
      this.navigateRelation
    ) {
      // From navigated EntitySet: /sourceTable/relation('recordId')
      url = `/${this.databaseName}/${this.navigateSourceTableName}/${this.navigateRelation}('${this.recordId}')`;
    } else {
      // Normal record: /tableName('recordId') - use FMTID if configured
      const tableId = this.getTableId(
        options?.useEntityIds ?? this.databaseUseEntityIds,
      );
      url = `/${this.databaseName}/${tableId}('${this.recordId}')`;
    }

    if (this.operation === "getSingleField" && this.operationParam) {
      url += `/${this.operationParam}`;
    } else {
      // Add query string for select/expand (only when not getting a single field)
      const queryString = this.buildQueryString();
      url += queryString;
    }

    const mergedOptions = this.mergeExecuteOptions(options);
    const result = await this.context._makeRequest(url, mergedOptions);

    if (result.error) {
      return { data: undefined, error: result.error };
    }

    let response = result.data;

    // Handle single field operation
    if (this.operation === "getSingleField") {
      // Single field returns a JSON object with @context and value
      const fieldResponse = response as ODataFieldResponse<T>;
      return { data: fieldResponse.value as any, error: undefined };
    }

    // Transform response field IDs back to names if using entity IDs
    // Only transform if useEntityIds resolves to true (respects per-request override)
    const shouldUseIds = mergedOptions.useEntityIds ?? false;

    // Build expand validation configs for transformation and validation
    const expandValidationConfigs =
      this.expandConfigs.length > 0
        ? this.buildExpandValidationConfigs(this.expandConfigs)
        : undefined;

    if (this.occurrence?.baseTable && shouldUseIds) {
      response = transformResponseFields(
        response,
        this.occurrence.baseTable,
        expandValidationConfigs,
      );
    }

    // Get schema from occurrence if available
    const schema = this.occurrence?.baseTable?.schema;

    // Validate the single record response
    const validation = await validateSingleResponse<any>(
      response,
      schema,
      this.selectedFields as (keyof T)[] | undefined,
      expandValidationConfigs,
      "exact", // Expect exactly one record
    );

    if (!validation.valid) {
      return { data: undefined, error: validation.error };
    }

    // Handle null response
    if (validation.data === null) {
      return { data: null as any, error: undefined };
    }

    return { data: validation.data as any, error: undefined };
  }

  getRequestConfig(): { method: string; url: string; body?: any } {
    let url: string;

    // Build the base URL depending on whether this came from a navigated EntitySet
    if (
      this.isNavigateFromEntitySet &&
      this.navigateSourceTableName &&
      this.navigateRelation
    ) {
      // From navigated EntitySet: /sourceTable/relation('recordId')
      url = `/${this.databaseName}/${this.navigateSourceTableName}/${this.navigateRelation}('${this.recordId}')`;
    } else {
      // For batch operations, use database-level setting (no per-request override available here)
      const tableId = this.getTableId(this.databaseUseEntityIds);
      url = `/${this.databaseName}/${tableId}('${this.recordId}')`;
    }

    if (this.operation === "getSingleField" && this.operationParam) {
      url += `/${this.operationParam}`;
    } else {
      // Add query string for select/expand (only when not getting a single field)
      const queryString = this.buildQueryString();
      url += queryString;
    }

    return {
      method: "GET",
      url,
    };
  }

  /**
   * Returns the query string for this record builder (for testing purposes).
   */
  getQueryString(): string {
    let path: string;

    // Build the path depending on navigation context
    if (
      this.isNavigateFromEntitySet &&
      this.navigateSourceTableName &&
      this.navigateRelation
    ) {
      path = `/${this.navigateSourceTableName}/${this.navigateRelation}('${this.recordId}')`;
    } else {
      // Use getTableId to respect entity ID settings (same as getRequestConfig)
      const tableId = this.getTableId(this.databaseUseEntityIds);
      path = `/${tableId}('${this.recordId}')`;
    }

    if (this.operation === "getSingleField" && this.operationParam) {
      return `${path}/${this.operationParam}`;
    }

    const queryString = this.buildQueryString();
    return `${path}${queryString}`;
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
    });
  }

  async processResponse(
    response: Response,
    options?: ExecuteOptions,
  ): Promise<
    Result<RecordReturnType<T, IsSingleField, FieldKey, Selected, Expands>>
  > {
    // Check for error responses (important for batch operations)
    if (!response.ok) {
      const error = await parseErrorResponse(
        response,
        response.url || `/${this.databaseName}/${this.tableName}`,
      );
      return { data: undefined, error };
    }

    // Use safeJsonParse to handle FileMaker's invalid JSON with unquoted ? values
    const rawResponse = await safeJsonParse(response);

    // Handle single field operation
    if (this.operation === "getSingleField") {
      // Single field returns a JSON object with @context and value
      const fieldResponse = rawResponse as ODataFieldResponse<T>;
      return { data: fieldResponse.value as any, error: undefined };
    }

    // Transform response field IDs back to names if using entity IDs
    // Only transform if useEntityIds resolves to true (respects per-request override)
    const shouldUseIds = options?.useEntityIds ?? this.databaseUseEntityIds;

    // Build expand validation configs for transformation and validation
    const expandValidationConfigs =
      this.expandConfigs.length > 0
        ? this.buildExpandValidationConfigs(this.expandConfigs)
        : undefined;

    let transformedResponse = rawResponse;
    if (this.occurrence?.baseTable && shouldUseIds) {
      transformedResponse = transformResponseFields(
        rawResponse,
        this.occurrence.baseTable,
        expandValidationConfigs,
      );
    }

    // Get schema from occurrence if available
    const schema = this.occurrence?.baseTable?.schema;

    // Validate the single record response
    const validation = await validateSingleResponse<any>(
      transformedResponse,
      schema,
      this.selectedFields as (keyof T)[] | undefined,
      expandValidationConfigs,
      "exact", // Expect exactly one record
    );

    if (!validation.valid) {
      return { data: undefined, error: validation.error };
    }

    // Handle null response
    if (validation.data === null) {
      return { data: null as any, error: undefined };
    }

    return { data: validation.data as any, error: undefined };
  }
}
