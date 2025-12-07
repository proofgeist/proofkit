import type { QueryOptions } from "odata-query";
import type { ExecutionContext } from "../../types";
import type { FMTable } from "../../orm/table";

/**
 * Expand configuration used by both QueryBuilder and RecordBuilder
 */
export type ExpandConfig = {
  relation: string;
  options?: Partial<QueryOptions<any>>;
  targetTable?: FMTable<any, any>;
};

/**
 * Type to represent expanded relations in return types
 */
export type ExpandedRelations = Record<string, { schema: any; selected: any }>;

/**
 * Navigation context shared between builders
 */
export interface NavigationContext {
  isNavigate?: boolean;
  navigateRecordId?: string | number;
  navigateRelation?: string;
  navigateSourceTableName?: string;
  navigateBaseRelation?: string;
  navigateBasePath?: string;
}

/**
 * Common builder configuration
 */
export interface BuilderConfig<Occ extends FMTable<any, any> | undefined> {
  occurrence?: Occ;
  tableName: string;
  databaseName: string;
  context: ExecutionContext;
  databaseUseEntityIds?: boolean;
}

