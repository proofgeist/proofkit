/** biome-ignore-all lint/performance/noBarrelFile: Re-exporting QueryBuilder and types */

// Re-export QueryBuilder and types from the new modular location
// This maintains backward compatibility for existing imports
export {
  type ExpandedRelations,
  QueryBuilder,
  type QueryReturnType,
  type TypeSafeOrderBy,
} from "./query/index";
