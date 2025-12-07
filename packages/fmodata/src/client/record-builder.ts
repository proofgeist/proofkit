import type {
  ExecutionContext,
  ExecutableBuilder,
  Result,
  ODataFieldResponse,
  ExecuteOptions,
  ConditionallyWithODataAnnotations,
  ExecuteMethodOptions,
} from "../types";
import type {
  FMTable,
  InferSchemaOutputFromFMTable,
  ValidExpandTarget,
  ExtractTableName,
  ValidateNoContainerFields,
} from "../orm/table";
import { getTableName, getNavigationPaths } from "../orm/table";
import { safeJsonParse } from "./sanitize-json";
import { parseErrorResponse } from "./error-parser";
import { QueryBuilder } from "./query-builder";
import { type FFetchOptions } from "@fetchkit/ffetch";
import { isColumn, type Column } from "../orm/column";
import {
  type ExpandConfig,
  type ExpandedRelations,
  ExpandBuilder,
  resolveTableId,
  mergeExecuteOptions,
  processODataResponse,
  getSchemaFromTable,
  processSelectWithRenames,
  buildSelectExpandQueryString,
  createODataRequest,
} from "./builders/index";
import { createLogger, InternalLogger, Logger } from "../logger";

/**
 * Extract the value type from a Column.
 * This uses the phantom type stored in Column to get the actual value type.
 */
type ExtractColumnType<C> = C extends Column<infer T, any> ? T : never;

/**
 * Map a select object to its return type.
 * For each key in the select object, extract the type from the corresponding Column.
 */
type MapSelectToReturnType<
  TSelect extends Record<string, Column<any, any, any, any>>,
  TSchema extends Record<string, any>,
> = {
  [K in keyof TSelect]: ExtractColumnType<TSelect[K]>;
};

// Return type for RecordBuilder execute
export type RecordReturnType<
  Schema extends Record<string, any>,
  IsSingleField extends boolean,
  FieldColumn extends Column<any, any, any, any> | undefined,
  Selected extends
    | keyof Schema
    | Record<string, Column<any, any, ExtractTableName<FMTable<any, any>>>>,
  Expands extends ExpandedRelations,
> = IsSingleField extends true
  ? FieldColumn extends Column<infer TOutput, any, any, any>
    ? TOutput
    : never
  : // Use tuple wrapping [Selected] extends [...] to prevent distribution over unions
    [Selected] extends [Record<string, Column<any, any, any, any>>]
    ? MapSelectToReturnType<Selected, Schema> & {
        [K in keyof Expands]: Pick<
          Expands[K]["schema"],
          Expands[K]["selected"]
        >[];
      }
    : // Use tuple wrapping to prevent distribution over union of keys
      [Selected] extends [keyof Schema]
      ? Pick<Schema, Selected> & {
          [K in keyof Expands]: Pick<
            Expands[K]["schema"],
            Expands[K]["selected"]
          >[];
        }
      : never;

export class RecordBuilder<
  Occ extends FMTable<any, any> = FMTable<any, any>,
  IsSingleField extends boolean = false,
  FieldColumn extends Column<any, any, any, any> | undefined = undefined,
  Selected extends
    | keyof InferSchemaOutputFromFMTable<NonNullable<Occ>>
    | Record<
        string,
        Column<any, any, ExtractTableName<NonNullable<Occ>>>
      > = keyof InferSchemaOutputFromFMTable<NonNullable<Occ>>,
  Expands extends ExpandedRelations = {},
> implements
    ExecutableBuilder<
      RecordReturnType<
        InferSchemaOutputFromFMTable<NonNullable<Occ>>,
        IsSingleField,
        FieldColumn,
        Selected,
        Expands
      >
    >
{
  private table: Occ;
  private databaseName: string;
  private context: ExecutionContext;
  private recordId: string | number;
  private operation?: "getSingleField" | "navigate";
  private operationParam?: string;
  private operationColumn?: Column<any, any, any, any>;
  private isNavigateFromEntitySet?: boolean;
  private navigateRelation?: string;
  private navigateSourceTableName?: string;

  private databaseUseEntityIds: boolean;

  // Properties for select/expand support
  private selectedFields?: string[];
  private expandConfigs: ExpandConfig[] = [];
  // Mapping from field names to output keys (for renamed fields in select)
  private fieldMapping?: Record<string, string>;

  private logger: InternalLogger;

  constructor(config: {
    occurrence: Occ;
    databaseName: string;
    context: ExecutionContext;
    recordId: string | number;
    databaseUseEntityIds?: boolean;
  }) {
    this.table = config.occurrence;
    this.databaseName = config.databaseName;
    this.context = config.context;
    this.recordId = config.recordId;
    this.databaseUseEntityIds = config.databaseUseEntityIds ?? false;
    this.logger = config.context?._getLogger?.() ?? createLogger();
  }

  /**
   * Helper to merge database-level useEntityIds with per-request options
   */
  private mergeExecuteOptions(
    options?: RequestInit & FFetchOptions & ExecuteOptions,
  ): RequestInit & FFetchOptions & { useEntityIds?: boolean } {
    return mergeExecuteOptions(options, this.databaseUseEntityIds);
  }

  /**
   * Gets the table ID (FMTID) if using entity IDs, otherwise returns the table name
   * @param useEntityIds - Optional override for entity ID usage
   */
  private getTableId(useEntityIds?: boolean): string {
    if (!this.table) {
      throw new Error("Table occurrence is required");
    }
    return resolveTableId(
      this.table,
      getTableName(this.table),
      this.context,
      useEntityIds,
    );
  }

  /**
   * Creates a new RecordBuilder with modified configuration.
   * Used by select() to create new instances.
   */
  private cloneWithChanges<
    NewSelected extends
      | keyof InferSchemaOutputFromFMTable<NonNullable<Occ>>
      | Record<
          string,
          Column<any, any, ExtractTableName<NonNullable<Occ>>>
        > = Selected,
  >(changes: {
    selectedFields?: string[];
    fieldMapping?: Record<string, string>;
  }): RecordBuilder<Occ, false, FieldColumn, NewSelected, Expands> {
    const newBuilder = new RecordBuilder<
      Occ,
      false,
      FieldColumn,
      NewSelected,
      Expands
    >({
      occurrence: this.table,
      databaseName: this.databaseName,
      context: this.context,
      recordId: this.recordId,
      databaseUseEntityIds: this.databaseUseEntityIds,
    });
    newBuilder.selectedFields = changes.selectedFields ?? this.selectedFields;
    newBuilder.fieldMapping = changes.fieldMapping ?? this.fieldMapping;
    newBuilder.expandConfigs = [...this.expandConfigs];
    // Preserve navigation context
    newBuilder.isNavigateFromEntitySet = this.isNavigateFromEntitySet;
    newBuilder.navigateRelation = this.navigateRelation;
    newBuilder.navigateSourceTableName = this.navigateSourceTableName;
    newBuilder.operationColumn = this.operationColumn;
    return newBuilder;
  }

  getSingleField<
    TColumn extends Column<any, any, ExtractTableName<NonNullable<Occ>>, any>,
  >(
    column: TColumn,
  ): RecordBuilder<
    Occ,
    true,
    TColumn,
    keyof InferSchemaOutputFromFMTable<NonNullable<Occ>>,
    {}
  > {
    // Runtime validation: ensure column is from the correct table
    const tableName = getTableName(this.table);
    if (!column.isFromTable(tableName)) {
      throw new Error(
        `Column ${column.toString()} is not from table ${tableName}`,
      );
    }

    const newBuilder = new RecordBuilder<
      Occ,
      true,
      TColumn,
      keyof InferSchemaOutputFromFMTable<NonNullable<Occ>>,
      {}
    >({
      occurrence: this.table,
      databaseName: this.databaseName,
      context: this.context,
      recordId: this.recordId,
      databaseUseEntityIds: this.databaseUseEntityIds,
    });
    newBuilder.operation = "getSingleField";
    newBuilder.operationColumn = column;
    newBuilder.operationParam = column.getFieldIdentifier(
      this.databaseUseEntityIds,
    );
    // Preserve navigation context
    newBuilder.isNavigateFromEntitySet = this.isNavigateFromEntitySet;
    newBuilder.navigateRelation = this.navigateRelation;
    newBuilder.navigateSourceTableName = this.navigateSourceTableName;
    return newBuilder;
  }

  /**
   * Select fields using column references.
   * Allows renaming fields by using different keys in the object.
   * Container fields cannot be selected and will cause a type error.
   *
   * @example
   * db.from(contacts).get("uuid").select({
   *   name: contacts.name,
   *   userEmail: contacts.email  // renamed!
   * })
   *
   * @param fields - Object mapping output keys to column references (container fields excluded)
   * @returns RecordBuilder with updated selected fields
   */
  select<
    TSelect extends Record<
      string,
      Column<any, any, ExtractTableName<Occ>, false>
    >,
  >(fields: TSelect): RecordBuilder<Occ, false, FieldColumn, TSelect, Expands> {
    const tableName = getTableName(this.table);
    const { selectedFields, fieldMapping } = processSelectWithRenames(
      fields,
      tableName,
      this.logger,
    );

    return this.cloneWithChanges({
      selectedFields,
      fieldMapping:
        Object.keys(fieldMapping).length > 0 ? fieldMapping : undefined,
    }) as any;
  }

  /**
   * Expand a navigation property to include related records.
   * Supports nested select, filter, orderBy, and expand operations.
   *
   * @example
   * ```typescript
   * // Simple expand with FMTable object
   * const contact = await db.from(contacts).get("uuid").expand(users).execute();
   *
   * // Expand with select
   * const contact = await db.from(contacts).get("uuid")
   *   .expand(users, b => b.select({ username: users.username, email: users.email }))
   *   .execute();
   * ```
   */
  expand<TargetTable extends FMTable<any, any>>(
    targetTable: ValidExpandTarget<Occ, TargetTable>,
    callback?: (
      builder: QueryBuilder<
        TargetTable,
        keyof InferSchemaOutputFromFMTable<TargetTable>,
        false,
        false
      >,
    ) => QueryBuilder<TargetTable, any, any, any, any>,
  ): RecordBuilder<
    Occ,
    false,
    FieldColumn,
    Selected,
    Expands & {
      [K in ExtractTableName<TargetTable>]: {
        schema: InferSchemaOutputFromFMTable<TargetTable>;
        selected: keyof InferSchemaOutputFromFMTable<TargetTable>;
      };
    }
  > {
    // Create new builder with updated types
    const newBuilder = new RecordBuilder<
      Occ,
      false,
      FieldColumn,
      Selected,
      any
    >({
      occurrence: this.table,
      databaseName: this.databaseName,
      context: this.context,
      recordId: this.recordId,
      databaseUseEntityIds: this.databaseUseEntityIds,
    });

    // Copy existing state
    newBuilder.selectedFields = this.selectedFields;
    newBuilder.fieldMapping = this.fieldMapping;
    newBuilder.expandConfigs = [...this.expandConfigs];
    newBuilder.isNavigateFromEntitySet = this.isNavigateFromEntitySet;
    newBuilder.navigateRelation = this.navigateRelation;
    newBuilder.navigateSourceTableName = this.navigateSourceTableName;
    newBuilder.operationColumn = this.operationColumn;

    // Use ExpandBuilder.processExpand to handle the expand logic
    const expandBuilder = new ExpandBuilder(
      this.databaseUseEntityIds,
      this.logger,
    );
    type TargetBuilder = QueryBuilder<
      TargetTable,
      keyof InferSchemaOutputFromFMTable<TargetTable>,
      false,
      false
    >;
    const expandConfig = expandBuilder.processExpand<
      TargetTable,
      TargetBuilder
    >(
      targetTable,
      this.table ?? undefined,
      callback,
      () =>
        new QueryBuilder<TargetTable>({
          occurrence: targetTable,
          databaseName: this.databaseName,
          context: this.context,
          databaseUseEntityIds: this.databaseUseEntityIds,
        }),
    );

    newBuilder.expandConfigs.push(expandConfig);
    return newBuilder as any;
  }

  navigate<TargetTable extends FMTable<any, any>>(
    targetTable: ValidExpandTarget<Occ, TargetTable>,
  ): QueryBuilder<
    TargetTable,
    keyof InferSchemaOutputFromFMTable<TargetTable>,
    false,
    false
  > {
    // Extract name and validate
    const relationName = getTableName(targetTable);

    // Runtime validation: Check if relation name is in navigationPaths
    if (this.table) {
      const navigationPaths = getNavigationPaths(this.table);
      if (navigationPaths && !navigationPaths.includes(relationName)) {
        this.logger.warn(
          `Cannot navigate to "${relationName}". Valid navigation paths: ${navigationPaths.length > 0 ? navigationPaths.join(", ") : "none"}`,
        );
      }
    }

    // Create QueryBuilder with target table
    const builder = new QueryBuilder<TargetTable>({
      occurrence: targetTable,
      databaseName: this.databaseName,
      context: this.context,
      databaseUseEntityIds: this.databaseUseEntityIds,
    });

    // Store the navigation info - we'll use it in execute
    // Use relation name as-is (entity ID handling is done in QueryBuilder)
    const relationId = relationName;

    // If this RecordBuilder came from a navigated EntitySet, we need to preserve that base path
    let sourceTableName: string;
    let baseRelation: string | undefined;
    if (
      this.isNavigateFromEntitySet &&
      this.navigateSourceTableName &&
      this.navigateRelation
    ) {
      // Build the base path: /sourceTable/relation('recordId')/newRelation
      sourceTableName = this.navigateSourceTableName;
      baseRelation = this.navigateRelation;
    } else {
      // Normal record navigation: /tableName('recordId')/relation
      // Use table ID if available, otherwise table name
      if (!this.table) {
        throw new Error("Table occurrence is required for navigation");
      }
      sourceTableName = resolveTableId(
        this.table,
        getTableName(this.table),
        this.context,
        this.databaseUseEntityIds,
      );
    }

    (builder as any).navigation = {
      recordId: this.recordId,
      relation: relationId,
      sourceTableName,
      baseRelation,
    };

    return builder;
  }

  /**
   * Builds the complete query string including $select and $expand parameters.
   */
  private buildQueryString(): string {
    return buildSelectExpandQueryString({
      selectedFields: this.selectedFields,
      expandConfigs: this.expandConfigs,
      table: this.table,
      useEntityIds: this.databaseUseEntityIds,
      logger: this.logger,
    });
  }

  async execute<EO extends ExecuteOptions>(
    options?: ExecuteMethodOptions<EO>,
  ): Promise<
    Result<
      ConditionallyWithODataAnnotations<
        RecordReturnType<
          InferSchemaOutputFromFMTable<NonNullable<Occ>>,
          IsSingleField,
          FieldColumn,
          Selected,
          Expands
        >,
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
      // The type is extracted from the Column stored in FieldColumn generic
      const fieldResponse = response as ODataFieldResponse<any>;
      return { data: fieldResponse.value as any, error: undefined };
    }

    // Use shared response processor
    const expandBuilder = new ExpandBuilder(
      mergedOptions.useEntityIds ?? false,
      this.logger,
    );
    const expandValidationConfigs = expandBuilder.buildValidationConfigs(
      this.expandConfigs,
    );

    return processODataResponse(response, {
      table: this.table,
      schema: getSchemaFromTable(this.table),
      singleMode: "exact",
      selectedFields: this.selectedFields,
      expandValidationConfigs,
      skipValidation: options?.skipValidation,
      useEntityIds: mergedOptions.useEntityIds,
      fieldMapping: this.fieldMapping,
    });
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

    if (this.operation === "getSingleField" && this.operationColumn) {
      // Use the column's getFieldIdentifier to support entity IDs
      url += `/${this.operationColumn.getFieldIdentifier(
        this.databaseUseEntityIds,
      )}`;
    } else if (this.operation === "getSingleField" && this.operationParam) {
      // Fallback for backwards compatibility (shouldn't happen in normal flow)
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

    if (this.operation === "getSingleField" && this.operationColumn) {
      return `${path}/${this.operationColumn.getFieldIdentifier(
        this.databaseUseEntityIds,
      )}`;
    } else if (this.operation === "getSingleField" && this.operationParam) {
      // Fallback for backwards compatibility (shouldn't happen in normal flow)
      return `${path}/${this.operationParam}`;
    }

    const queryString = this.buildQueryString();
    return `${path}${queryString}`;
  }

  toRequest(baseUrl: string, options?: ExecuteOptions): Request {
    const config = this.getRequestConfig();
    return createODataRequest(baseUrl, config, options);
  }

  async processResponse(
    response: Response,
    options?: ExecuteOptions,
  ): Promise<
    Result<
      RecordReturnType<
        InferSchemaOutputFromFMTable<NonNullable<Occ>>,
        IsSingleField,
        FieldColumn,
        Selected,
        Expands
      >
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

    // Use safeJsonParse to handle FileMaker's invalid JSON with unquoted ? values
    const rawResponse = await safeJsonParse(response);

    // Handle single field operation
    if (this.operation === "getSingleField") {
      // Single field returns a JSON object with @context and value
      // The type is extracted from the Column stored in FieldColumn generic
      const fieldResponse = rawResponse as ODataFieldResponse<any>;
      return { data: fieldResponse.value as any, error: undefined };
    }

    // Use shared response processor
    const mergedOptions = mergeExecuteOptions(
      options,
      this.databaseUseEntityIds,
    );
    const expandBuilder = new ExpandBuilder(
      mergedOptions.useEntityIds ?? false,
      this.logger,
    );
    const expandValidationConfigs = expandBuilder.buildValidationConfigs(
      this.expandConfigs,
    );

    return processODataResponse(rawResponse, {
      table: this.table,
      schema: getSchemaFromTable(this.table),
      singleMode: "exact",
      selectedFields: this.selectedFields,
      expandValidationConfigs,
      skipValidation: options?.skipValidation,
      useEntityIds: mergedOptions.useEntityIds,
      fieldMapping: this.fieldMapping,
    });
  }
}
