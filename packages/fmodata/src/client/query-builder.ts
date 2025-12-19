// Re-export QueryBuilder and types from the new modular location
// This maintains backward compatibility for existing imports
export {
  QueryBuilder,
  type TypeSafeOrderBy,
  type ExpandedRelations,
  type QueryReturnType,
} from "./query/index";
