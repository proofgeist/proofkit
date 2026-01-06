/** biome-ignore-all lint/performance/noBarrelFile: Re-exporting QueryBuilder and types */

// Re-export QueryBuilder as the main export

// Export ExpandConfig from expand-builder
export type { ExpandConfig } from "./expand-builder";

// Export types
export type {
  ExpandedRelations,
  QueryReturnType,
  TypeSafeOrderBy,
} from "./query-builder";
export { QueryBuilder } from "./query-builder";
