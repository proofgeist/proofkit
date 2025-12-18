import type { ExecutionContext } from "../types";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { QueryBuilder } from "./query/index";
import { RecordBuilder } from "./record-builder";
import { InsertBuilder } from "./insert-builder";
import { DeleteBuilder } from "./delete-builder";
import { UpdateBuilder } from "./update-builder";
import { Database } from "./database";
import type {
  FMTable,
  InferSchemaOutputFromFMTable,
  InsertDataFromFMTable,
  UpdateDataFromFMTable,
  ValidExpandTarget,
  ColumnMap,
} from "../orm/table";
import {
  FMTable as FMTableClass,
  getDefaultSelect,
  getTableName,
  getTableColumns,
  getTableSchema,
} from "../orm/table";
import type { FieldBuilder } from "../orm/field-builders";
import { createLogger, InternalLogger } from "../logger";

// Helper type to extract defaultSelect from an FMTable
// Since TypeScript can't extract Symbol-indexed properties at the type level,
// we simplify to return keyof InferSchemaFromFMTable<O> when O is an FMTable.
// The actual defaultSelect logic is handled at runtime.
type ExtractDefaultSelect<O> =
  O extends FMTable<any, any> ? keyof InferSchemaOutputFromFMTable<O> : never;

/**
 * Helper type to extract properly-typed columns from an FMTable.
 * This preserves the specific column types instead of widening to `any`.
 */
type ExtractColumnsFromOcc<T> =
  T extends FMTable<infer TFields, infer TName, any>
    ? TFields extends Record<string, FieldBuilder<any, any, any, any>>
      ? ColumnMap<TFields, TName>
      : never
    : never;

export class EntitySet<
  Occ extends FMTable<any, any>,
  DatabaseIncludeSpecialColumns extends boolean = false,
> {
  private occurrence: Occ;
  private databaseName: string;
  private context: ExecutionContext;
  private database: Database<DatabaseIncludeSpecialColumns>; // Database instance for accessing occurrences
  private isNavigateFromEntitySet?: boolean;
  private navigateRelation?: string;
  private navigateSourceTableName?: string;
  private navigateBasePath?: string; // Full base path for chained navigations
  private databaseUseEntityIds: boolean;
  private databaseIncludeSpecialColumns: DatabaseIncludeSpecialColumns;
  private logger: InternalLogger;

  constructor(config: {
    occurrence: Occ;
    databaseName: string;
    context: ExecutionContext;
    database?: any;
  }) {
    this.occurrence = config.occurrence;
    this.databaseName = config.databaseName;
    this.context = config.context;
    this.database = config.database;
    // Get useEntityIds from database if available, otherwise default to false
    this.databaseUseEntityIds =
      (config.database as any)?._useEntityIds ?? false;
    // Get includeSpecialColumns from database if available, otherwise default to false
    this.databaseIncludeSpecialColumns =
      (config.database as any)?._includeSpecialColumns ?? false;
    this.logger = config.context?._getLogger?.() ?? createLogger();
  }

  // Type-only method to help TypeScript infer the schema from table
  static create<
    Occ extends FMTable<any, any>,
    DatabaseIncludeSpecialColumns extends boolean = false,
  >(config: {
    occurrence: Occ;
    databaseName: string;
    context: ExecutionContext;
    database: Database<DatabaseIncludeSpecialColumns>;
  }): EntitySet<Occ, DatabaseIncludeSpecialColumns> {
    return new EntitySet<Occ, DatabaseIncludeSpecialColumns>({
      occurrence: config.occurrence,
      databaseName: config.databaseName,
      context: config.context,
      database: config.database,
    });
  }

  list(): QueryBuilder<
    Occ,
    keyof InferSchemaOutputFromFMTable<Occ>,
    false,
    false,
    {},
    DatabaseIncludeSpecialColumns
  > {
    const builder = new QueryBuilder<
      Occ,
      keyof InferSchemaOutputFromFMTable<Occ>,
      false,
      false,
      {},
      DatabaseIncludeSpecialColumns
    >({
      occurrence: this.occurrence as Occ,
      databaseName: this.databaseName,
      context: this.context,
      databaseUseEntityIds: this.databaseUseEntityIds,
      databaseIncludeSpecialColumns: this.databaseIncludeSpecialColumns,
    });

    // Apply defaultSelect if occurrence exists and select hasn't been called
    if (this.occurrence) {
      // FMTable - access via helper functions
      const defaultSelectValue = getDefaultSelect(this.occurrence);
      // Schema is stored directly as Partial<Record<keyof TFields, StandardSchemaV1>>
      const schema = getTableSchema(this.occurrence);

      if (defaultSelectValue === "schema") {
        // Use getTableColumns to get all columns and select them
        // This is equivalent to select(getTableColumns(occurrence))
        // Cast to the declared return type - runtime behavior handles the actual selection
        const allColumns = getTableColumns(
          this.occurrence,
        ) as ExtractColumnsFromOcc<Occ>;

        // Include special columns if enabled at database level
        const systemColumns = this.databaseIncludeSpecialColumns
          ? { ROWID: true, ROWMODID: true }
          : undefined;

        return builder
          .select(allColumns, systemColumns)
          .top(1000) as QueryBuilder<
          Occ,
          keyof InferSchemaOutputFromFMTable<Occ>,
          false,
          false,
          {},
          DatabaseIncludeSpecialColumns,
          typeof systemColumns
        >;
      } else if (typeof defaultSelectValue === "object") {
        // defaultSelectValue is a select object (Record<string, Column>)
        // Cast to the declared return type - runtime behavior handles the actual selection
        return builder
          .select(defaultSelectValue as ExtractColumnsFromOcc<Occ>)
          .top(1000) as QueryBuilder<
          Occ,
          keyof InferSchemaOutputFromFMTable<Occ>,
          false,
          false,
          {},
          DatabaseIncludeSpecialColumns
        >;
      }
      // If defaultSelect is "all", no changes needed (current behavior)
    }

    // Propagate navigation context if present
    if (
      this.isNavigateFromEntitySet &&
      this.navigateRelation &&
      this.navigateSourceTableName
    ) {
      (builder as any).navigation = {
        relation: this.navigateRelation,
        sourceTableName: this.navigateSourceTableName,
        basePath: this.navigateBasePath,
        // recordId is intentionally not set (undefined) to indicate navigation from EntitySet
      };
    }

    // Apply default pagination limit of 1000 records to prevent stack overflow
    // with large datasets. Users can override with .top() if needed.
    return builder.top(1000);
  }

  get(
    id: string | number,
  ): RecordBuilder<
    Occ,
    false,
    undefined,
    keyof InferSchemaOutputFromFMTable<Occ>,
    {},
    DatabaseIncludeSpecialColumns
  > {
    const builder = new RecordBuilder<
      Occ,
      false,
      undefined,
      keyof InferSchemaOutputFromFMTable<Occ>,
      {},
      DatabaseIncludeSpecialColumns
    >({
      occurrence: this.occurrence,
      databaseName: this.databaseName,
      context: this.context,
      recordId: id,
      databaseUseEntityIds: this.databaseUseEntityIds,
      databaseIncludeSpecialColumns: this.databaseIncludeSpecialColumns,
    });

    // Apply defaultSelect if occurrence exists
    if (this.occurrence) {
      // FMTable - access via helper functions
      const defaultSelectValue = getDefaultSelect(this.occurrence);
      // Schema is stored directly as Partial<Record<keyof TFields, StandardSchemaV1>>
      const schema = getTableSchema(this.occurrence);

      if (defaultSelectValue === "schema") {
        // Use getTableColumns to get all columns and select them
        // This is equivalent to select(getTableColumns(occurrence))
        // Use ExtractColumnsFromOcc to preserve the properly-typed column types
        const allColumns = getTableColumns(
          this.occurrence as any,
        ) as ExtractColumnsFromOcc<Occ>;

        // Include special columns if enabled at database level
        const systemColumns = this.databaseIncludeSpecialColumns
          ? { ROWID: true, ROWMODID: true }
          : undefined;

        const selectedBuilder = builder.select(allColumns, systemColumns);
        // Propagate navigation context if present
        if (
          this.isNavigateFromEntitySet &&
          this.navigateRelation &&
          this.navigateSourceTableName
        ) {
          (selectedBuilder as any).navigation = {
            relation: this.navigateRelation,
            sourceTableName: this.navigateSourceTableName,
            basePath: this.navigateBasePath,
          };
        }
        return selectedBuilder as any;
      } else if (
        typeof defaultSelectValue === "object" &&
        defaultSelectValue !== null &&
        !Array.isArray(defaultSelectValue)
      ) {
        // defaultSelectValue is a select object (Record<string, Column>)
        // Use it directly with select()
        // Use ExtractColumnsFromOcc to preserve the properly-typed column types
        const selectedBuilder = builder.select(
          defaultSelectValue as ExtractColumnsFromOcc<Occ>,
        );
        // Propagate navigation context if present
        if (
          this.isNavigateFromEntitySet &&
          this.navigateRelation &&
          this.navigateSourceTableName
        ) {
          (selectedBuilder as any).navigation = {
            relation: this.navigateRelation,
            sourceTableName: this.navigateSourceTableName,
            basePath: this.navigateBasePath,
          };
        }
        return selectedBuilder as any;
      }
      // If defaultSelect is "all", no changes needed (current behavior)
    }

    // Propagate navigation context if present
    if (
      this.isNavigateFromEntitySet &&
      this.navigateRelation &&
      this.navigateSourceTableName
    ) {
      (builder as any).navigation = {
        relation: this.navigateRelation,
        sourceTableName: this.navigateSourceTableName,
        basePath: this.navigateBasePath,
      };
    }
    return builder as any;
  }

  // Overload: when returnFullRecord is false
  insert(
    data: InsertDataFromFMTable<Occ>,
    options: { returnFullRecord: false },
  ): InsertBuilder<Occ, "minimal">;

  // Overload: when returnFullRecord is true or omitted (default)
  insert(
    data: InsertDataFromFMTable<Occ>,
    options?: { returnFullRecord?: true },
  ): InsertBuilder<Occ, "representation">;

  // Implementation
  insert(
    data: InsertDataFromFMTable<Occ>,
    options?: { returnFullRecord?: boolean },
  ): InsertBuilder<Occ, "minimal" | "representation"> {
    const returnPreference =
      options?.returnFullRecord === false ? "minimal" : "representation";

    return new InsertBuilder<Occ, typeof returnPreference>({
      occurrence: this.occurrence,
      databaseName: this.databaseName,
      context: this.context,
      data: data as any, // Input type is validated/transformed at runtime
      returnPreference: returnPreference as any,
      databaseUseEntityIds: this.databaseUseEntityIds,
      databaseIncludeSpecialColumns: this.databaseIncludeSpecialColumns,
    });
  }

  // Overload: when returnFullRecord is explicitly true
  update(
    data: UpdateDataFromFMTable<Occ>,
    options: { returnFullRecord: true },
  ): UpdateBuilder<Occ, "representation">;

  // Overload: when returnFullRecord is false or omitted (default)
  update(
    data: UpdateDataFromFMTable<Occ>,
    options?: { returnFullRecord?: false },
  ): UpdateBuilder<Occ, "minimal">;

  // Implementation
  update(
    data: UpdateDataFromFMTable<Occ>,
    options?: { returnFullRecord?: boolean },
  ): UpdateBuilder<Occ, "minimal" | "representation"> {
    const returnPreference =
      options?.returnFullRecord === true ? "representation" : "minimal";

    return new UpdateBuilder<Occ, typeof returnPreference>({
      occurrence: this.occurrence,
      databaseName: this.databaseName,
      context: this.context,
      data: data as any, // Input type is validated/transformed at runtime
      returnPreference: returnPreference as any,
      databaseUseEntityIds: this.databaseUseEntityIds,
      databaseIncludeSpecialColumns: this.databaseIncludeSpecialColumns,
    });
  }

  delete(): DeleteBuilder<Occ> {
    return new DeleteBuilder<Occ>({
      occurrence: this.occurrence,
      databaseName: this.databaseName,
      context: this.context,
      databaseUseEntityIds: this.databaseUseEntityIds,
      databaseIncludeSpecialColumns: this.databaseIncludeSpecialColumns,
    }) as any;
  }

  // Implementation
  navigate<TargetTable extends FMTable<any, any>>(
    targetTable: ValidExpandTarget<Occ, TargetTable>,
  ): EntitySet<
    TargetTable extends FMTable<any, any> ? TargetTable : never,
    DatabaseIncludeSpecialColumns
  > {
    // Check if it's an FMTable object or a string
    let relationName: string;

    // FMTable object - extract name and validate
    relationName = getTableName(targetTable);

    // Runtime validation: Check if relation name is in navigationPaths
    if (
      this.occurrence &&
      FMTableClass.Symbol.NavigationPaths in this.occurrence
    ) {
      const navigationPaths = (this.occurrence as any)[
        FMTableClass.Symbol.NavigationPaths
      ] as readonly string[];
      if (navigationPaths && !navigationPaths.includes(relationName)) {
        this.logger.warn(
          `Cannot navigate to "${relationName}". Valid navigation paths: ${navigationPaths.length > 0 ? navigationPaths.join(", ") : "none"}`,
        );
      }
    }

    // Create EntitySet with target table
    const entitySet = new EntitySet<any, DatabaseIncludeSpecialColumns>({
      occurrence: targetTable,
      databaseName: this.databaseName,
      context: this.context,
      database: this.database,
    });
    // Store the navigation info in the EntitySet
    (entitySet as any).isNavigateFromEntitySet = true;
    (entitySet as any).navigateRelation = relationName;

    // Build the full base path for chained navigations
    if (this.isNavigateFromEntitySet && this.navigateBasePath) {
      // Already have a base path from previous navigation - extend it with current relation
      (entitySet as any).navigateBasePath =
        `${this.navigateBasePath}/${this.navigateRelation}`;
      (entitySet as any).navigateSourceTableName = this.navigateSourceTableName;
    } else if (this.isNavigateFromEntitySet && this.navigateRelation) {
      // First chained navigation - create base path from source/relation
      (entitySet as any).navigateBasePath =
        `${this.navigateSourceTableName}/${this.navigateRelation}`;
      (entitySet as any).navigateSourceTableName = this.navigateSourceTableName;
    } else {
      // Initial navigation - source is just the table name
      (entitySet as any).navigateSourceTableName = getTableName(
        this.occurrence,
      );
    }
    return entitySet;
  }
}
