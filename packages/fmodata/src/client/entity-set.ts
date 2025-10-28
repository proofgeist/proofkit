import type {
  ExecutionContext,
  InferSchemaType,
  WithSystemFields,
  InsertData,
  UpdateData,
} from "../types";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { BaseTable } from "./base-table";
import type { TableOccurrence } from "./table-occurrence";
import { QueryBuilder } from "./query-builder";
import { RecordBuilder } from "./record-builder";
import { InsertBuilder } from "./insert-builder";
import { DeleteBuilder } from "./delete-builder";
import { UpdateBuilder } from "./update-builder";
import { Database } from "./database";

// Helper type to extract navigation relation names from an occurrence
type ExtractNavigationNames<
  O extends TableOccurrence<any, any, any, any> | undefined,
> =
  O extends TableOccurrence<any, any, infer Nav, any>
    ? Nav extends Record<string, any>
      ? keyof Nav & string
      : never
    : never;

// Helper type to extract schema from a TableOccurrence
type ExtractSchemaFromOccurrence<O> =
  O extends TableOccurrence<infer BT, any, any, any>
    ? BT extends BaseTable<infer S, any, any, any>
      ? S
      : never
    : never;

// Helper type to extract defaultSelect from a TableOccurrence
type ExtractDefaultSelect<O> =
  O extends TableOccurrence<infer BT, any, any, infer DefSelect>
    ? BT extends BaseTable<infer S, any, any, any>
      ? DefSelect extends "all"
        ? keyof S
        : DefSelect extends "schema"
          ? keyof S
          : DefSelect extends readonly (infer K)[]
            ? K & keyof S
            : keyof S
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

export class EntitySet<
  Schema extends Record<string, StandardSchemaV1> = any,
  Occ extends TableOccurrence<any, any, any, any> | undefined = undefined,
> {
  private occurrence?: Occ;
  private tableName: string;
  private databaseName: string;
  private context: ExecutionContext;
  private database: Database<any>; // Database instance for accessing occurrences
  private isNavigateFromEntitySet?: boolean;
  private navigateRelation?: string;
  private navigateSourceTableName?: string;
  private navigateBasePath?: string; // Full base path for chained navigations

  constructor(config: {
    occurrence?: Occ;
    tableName: string;
    databaseName: string;
    context: ExecutionContext;
    database?: any;
  }) {
    this.occurrence = config.occurrence;
    this.tableName = config.tableName;
    this.databaseName = config.databaseName;
    this.context = config.context;
    this.database = config.database;
  }

  // Type-only method to help TypeScript infer the schema from occurrence
  static create<
    OccurrenceSchema extends Record<string, StandardSchemaV1>,
    Occ extends
      | TableOccurrence<
          BaseTable<OccurrenceSchema, any, any, any>,
          any,
          any,
          any
        >
      | undefined = undefined,
  >(config: {
    occurrence?: Occ;
    tableName: string;
    databaseName: string;
    context: ExecutionContext;
    database: Database<any>;
  }): EntitySet<OccurrenceSchema, Occ> {
    return new EntitySet<OccurrenceSchema, Occ>({
      occurrence: config.occurrence,
      tableName: config.tableName,
      databaseName: config.databaseName,
      context: config.context,
      database: config.database,
    });
  }

  list(): QueryBuilder<
    InferSchemaType<Schema>,
    Occ extends TableOccurrence<any, any, any, any>
      ? ExtractDefaultSelect<Occ>
      : keyof InferSchemaType<Schema>,
    false,
    false,
    Occ
  > {
    const builder = new QueryBuilder<
      InferSchemaType<Schema>,
      Occ extends TableOccurrence<any, any, any, any>
        ? ExtractDefaultSelect<Occ>
        : keyof InferSchemaType<Schema>,
      false,
      false,
      Occ
    >({
      occurrence: this.occurrence as Occ,
      tableName: this.tableName,
      databaseName: this.databaseName,
      context: this.context,
      databaseUseEntityIds: this.database?.isUsingEntityIds() ?? false,
    });

    // Apply defaultSelect if occurrence exists and select hasn't been called
    if (this.occurrence) {
      const defaultSelect = this.occurrence.defaultSelect;

      if (defaultSelect === "schema") {
        // Extract field names from schema
        const schema = this.occurrence.baseTable.schema;
        const fields = Object.keys(schema) as (keyof InferSchemaType<Schema>)[];
        // Deduplicate fields (same as select method)
        const uniqueFields = [...new Set(fields)];
        return builder.select(...uniqueFields).top(1000);
      } else if (Array.isArray(defaultSelect)) {
        // Use the provided field names, deduplicated
        const uniqueFields = [
          ...new Set(defaultSelect),
        ] as (keyof InferSchemaType<Schema>)[];
        return builder.select(...uniqueFields).top(1000);
      }
      // If defaultSelect is "all", no changes needed (current behavior)
    }

    // Propagate navigation context if present
    if (this.isNavigateFromEntitySet) {
      (builder as any).isNavigate = true;
      (builder as any).navigateRelation = this.navigateRelation;
      (builder as any).navigateSourceTableName = this.navigateSourceTableName;
      (builder as any).navigateBasePath = this.navigateBasePath;
      // navigateRecordId is intentionally not set (undefined) to indicate navigation from EntitySet
    }

    // Apply default pagination limit of 1000 records to prevent stack overflow
    // with large datasets. Users can override with .top() if needed.
    return builder.top(1000);
  }

  get(
    id: string | number,
  ): RecordBuilder<
    InferSchemaType<Schema>,
    false,
    keyof InferSchemaType<Schema>,
    Occ,
    Occ extends TableOccurrence<any, any, any, any>
      ? ExtractDefaultSelect<Occ>
      : keyof InferSchemaType<Schema>,
    {}
  > {
    const builder = new RecordBuilder<
      InferSchemaType<Schema>,
      false,
      keyof InferSchemaType<Schema>,
      Occ,
      keyof InferSchemaType<Schema>,
      {}
    >({
      occurrence: this.occurrence,
      tableName: this.tableName,
      databaseName: this.databaseName,
      context: this.context,
      recordId: id,
      databaseUseEntityIds: this.database?.isUsingEntityIds() ?? false,
    });

    // Apply defaultSelect if occurrence exists
    if (this.occurrence) {
      const defaultSelect = this.occurrence.defaultSelect;

      if (defaultSelect === "schema") {
        // Extract field names from schema
        const schema = this.occurrence.baseTable.schema;
        const fields = Object.keys(schema) as (keyof InferSchemaType<Schema>)[];
        // Deduplicate fields (same as select method)
        const uniqueFields = [...new Set(fields)];
        const selectedBuilder = builder.select(...uniqueFields);
        // Propagate navigation context if present
        if (this.isNavigateFromEntitySet) {
          (selectedBuilder as any).isNavigateFromEntitySet = true;
          (selectedBuilder as any).navigateRelation = this.navigateRelation;
          (selectedBuilder as any).navigateSourceTableName = this.navigateSourceTableName;
        }
        return selectedBuilder as any;
      } else if (Array.isArray(defaultSelect)) {
        // Use the provided field names, deduplicated
        const uniqueFields = [
          ...new Set(defaultSelect),
        ] as (keyof InferSchemaType<Schema>)[];
        const selectedBuilder = builder.select(...uniqueFields);
        // Propagate navigation context if present
        if (this.isNavigateFromEntitySet) {
          (selectedBuilder as any).isNavigateFromEntitySet = true;
          (selectedBuilder as any).navigateRelation = this.navigateRelation;
          (selectedBuilder as any).navigateSourceTableName = this.navigateSourceTableName;
        }
        return selectedBuilder as any;
      }
      // If defaultSelect is "all", no changes needed (current behavior)
    }

    // Propagate navigation context if present
    if (this.isNavigateFromEntitySet) {
      (builder as any).isNavigateFromEntitySet = true;
      (builder as any).navigateRelation = this.navigateRelation;
      (builder as any).navigateSourceTableName = this.navigateSourceTableName;
    }
    return builder as any;
  }

  // Overload: when returnFullRecord is explicitly false
  insert(
    data: Occ extends TableOccurrence<infer BT, any, any, any>
      ? BT extends BaseTable<any, any, any, any>
        ? InsertData<BT>
        : Partial<InferSchemaType<Schema>>
      : Partial<InferSchemaType<Schema>>,
    options: { returnFullRecord: false },
  ): InsertBuilder<InferSchemaType<Schema>, Occ, "minimal">;

  // Overload: when returnFullRecord is true or omitted (default)
  insert(
    data: Occ extends TableOccurrence<infer BT, any, any, any>
      ? BT extends BaseTable<any, any, any, any>
        ? InsertData<BT>
        : Partial<InferSchemaType<Schema>>
      : Partial<InferSchemaType<Schema>>,
    options?: { returnFullRecord?: true },
  ): InsertBuilder<InferSchemaType<Schema>, Occ, "representation">;

  // Implementation
  insert(
    data: Occ extends TableOccurrence<infer BT, any, any, any>
      ? BT extends BaseTable<any, any, any, any>
        ? InsertData<BT>
        : Partial<InferSchemaType<Schema>>
      : Partial<InferSchemaType<Schema>>,
    options?: { returnFullRecord?: boolean },
  ): InsertBuilder<InferSchemaType<Schema>, Occ, "minimal" | "representation"> {
    const returnPref =
      options?.returnFullRecord === false ? "minimal" : "representation";
    return new InsertBuilder<InferSchemaType<Schema>, Occ, typeof returnPref>({
      occurrence: this.occurrence,
      tableName: this.tableName,
      databaseName: this.databaseName,
      context: this.context,
      data: data as Partial<InferSchemaType<Schema>>,
      returnPreference: returnPref as any,
      databaseUseEntityIds: this.database?.isUsingEntityIds() ?? false,
    });
  }

  // Overload: when returnFullRecord is explicitly true
  update(
    data: Occ extends TableOccurrence<infer BT, any, any, any>
      ? BT extends BaseTable<any, any, any, any>
        ? UpdateData<BT>
        : Partial<InferSchemaType<Schema>>
      : Partial<InferSchemaType<Schema>>,
    options: { returnFullRecord: true },
  ): UpdateBuilder<
    InferSchemaType<Schema>,
    Occ extends TableOccurrence<infer BT, any, any, any>
      ? BT extends BaseTable<any, any, any, any>
        ? BT
        : BaseTable<Schema, any, any, any>
      : BaseTable<Schema, any, any, any>,
    "representation"
  >;

  // Overload: when returnFullRecord is false or omitted (default returns count)
  update(
    data: Occ extends TableOccurrence<infer BT, any, any, any>
      ? BT extends BaseTable<any, any, any, any>
        ? UpdateData<BT>
        : Partial<InferSchemaType<Schema>>
      : Partial<InferSchemaType<Schema>>,
    options?: { returnFullRecord?: false },
  ): UpdateBuilder<
    InferSchemaType<Schema>,
    Occ extends TableOccurrence<infer BT, any, any, any>
      ? BT extends BaseTable<any, any, any, any>
        ? BT
        : BaseTable<Schema, any, any, any>
      : BaseTable<Schema, any, any, any>,
    "minimal"
  >;

  // Implementation
  update(
    data: Occ extends TableOccurrence<infer BT, any, any, any>
      ? BT extends BaseTable<any, any, any, any>
        ? UpdateData<BT>
        : Partial<InferSchemaType<Schema>>
      : Partial<InferSchemaType<Schema>>,
    options?: { returnFullRecord?: boolean },
  ): UpdateBuilder<
    InferSchemaType<Schema>,
    Occ extends TableOccurrence<infer BT, any, any, any>
      ? BT extends BaseTable<any, any, any, any>
        ? BT
        : BaseTable<Schema, any, any, any>
      : BaseTable<Schema, any, any, any>,
    "minimal" | "representation"
  > {
    const returnPref =
      options?.returnFullRecord === true ? "representation" : "minimal";
    return new UpdateBuilder<
      InferSchemaType<Schema>,
      Occ extends TableOccurrence<infer BT, any, any, any>
        ? BT extends BaseTable<any, any, any, any>
          ? BT
          : BaseTable<Schema, any, any, any>
        : BaseTable<Schema, any, any, any>,
      typeof returnPref
    >({
      occurrence: this.occurrence,
      tableName: this.tableName,
      databaseName: this.databaseName,
      context: this.context,
      data: data as Partial<InferSchemaType<Schema>>,
      returnPreference: returnPref as any,
      databaseUseEntityIds: this.database?.isUsingEntityIds() ?? false,
    });
  }

  delete(): DeleteBuilder<InferSchemaType<Schema>> {
    return new DeleteBuilder<InferSchemaType<Schema>>({
      occurrence: this.occurrence,
      tableName: this.tableName,
      databaseName: this.databaseName,
      context: this.context,
      databaseUseEntityIds: this.database?.isUsingEntityIds() ?? false,
    });
  }

  // Overload for valid relation names - returns typed EntitySet
  navigate<RelationName extends ExtractNavigationNames<Occ>>(
    relationName: RelationName,
  ): EntitySet<
    ExtractSchemaFromOccurrence<
      FindNavigationTarget<Occ, RelationName>
    > extends Record<string, StandardSchemaV1>
      ? ExtractSchemaFromOccurrence<FindNavigationTarget<Occ, RelationName>>
      : Record<string, StandardSchemaV1>,
    FindNavigationTarget<Occ, RelationName>
  >;
  // Overload for arbitrary strings - returns generic EntitySet
  navigate(
    relationName: string,
  ): EntitySet<Record<string, StandardSchemaV1>, undefined>;
  // Implementation
  navigate(relationName: string): EntitySet<any, any> {
    // Use the target occurrence if available, otherwise allow untyped navigation
    // (useful when types might be incomplete)
    const targetOccurrence = this.occurrence?.navigation[relationName];
    const entitySet = new EntitySet<any, any>({
      occurrence: targetOccurrence,
      tableName: targetOccurrence?.name ?? relationName,
      databaseName: this.databaseName,
      context: this.context,
    });
    // Store the navigation info in the EntitySet
    // We'll need to pass this through when creating QueryBuilders
    (entitySet as any).isNavigateFromEntitySet = true;
    (entitySet as any).navigateRelation = relationName;

    // Build the full base path for chained navigations
    // The base path should contain all segments BEFORE the final relation
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
      (entitySet as any).navigateSourceTableName = this.tableName;
    }
    return entitySet;
  }
}
