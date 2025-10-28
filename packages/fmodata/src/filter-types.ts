import type { StandardSchemaV1 } from "@standard-schema/spec";

// Operator types for each value type
export type StringOperators = 
  | { eq: string | null }
  | { ne: string | null }
  | { gt: string }
  | { ge: string }
  | { lt: string }
  | { le: string }
  | { contains: string }
  | { startswith: string }
  | { endswith: string }
  | { in: string[] };

export type NumberOperators =
  | { eq: number | null }
  | { ne: number | null }
  | { gt: number }
  | { ge: number }
  | { lt: number }
  | { le: number }
  | { in: number[] };

export type BooleanOperators =
  | { eq: boolean | null }
  | { ne: boolean | null };

export type DateOperators =
  | { eq: Date | null }
  | { ne: Date | null }
  | { gt: Date }
  | { ge: Date }
  | { lt: Date }
  | { le: Date }
  | { in: Date[] };

// Infer output type from StandardSchemaV1
export type InferOutput<S> = S extends StandardSchemaV1<any, infer Output> 
  ? Output 
  : never;

// Map inferred types to their operators
export type OperatorsForType<T> =
  T extends string | null | undefined ? StringOperators :
  T extends number | null | undefined ? NumberOperators :
  T extends boolean | null | undefined ? BooleanOperators :
  T extends Date | null | undefined ? DateOperators :
  never;

// Get operators for a schema field
export type OperatorsForSchemaField<S extends StandardSchemaV1> =
  OperatorsForType<InferOutput<S>>;

// Field filter: shorthand, single operator, or operator array
export type FieldFilter<S extends StandardSchemaV1> =
  | InferOutput<S>  // Shorthand: { name: "John" }
  | OperatorsForSchemaField<S>  // Single operator: { age: { gt: 18 } }
  | Array<OperatorsForSchemaField<S>>;  // Multiple operators: { age: [{ gt: 18 }, { lt: 65 }] }

// Logical operators (recursive)
export type LogicalFilter<Schema extends Record<string, StandardSchemaV1>> = {
  and?: Array<TypedFilter<Schema>>;
  or?: Array<TypedFilter<Schema>>;
  not?: TypedFilter<Schema>;
};

// Helper to check if Schema is exactly Record<string, StandardSchemaV1> (untyped)
// Uses double extends check to ensure Schema is exactly the generic type, not a more specific type
type IsUntypedSchema<Schema> = 
  [Record<string, StandardSchemaV1>] extends [Schema]
    ? [Schema] extends [Record<string, StandardSchemaV1>]
      ? true
      : false
    : false;

// Main filter type
export type TypedFilter<Schema extends Record<string, StandardSchemaV1>> = 
  | LogicalFilter<Schema>
  | (
      IsUntypedSchema<Schema> extends true
        ? {
            // For untyped schemas, allow arbitrary string keys with empty object intersection (preserves autocomplete)
            [key: string]: FieldFilter<any> | any;
          } & {}
        : {
            // For typed schemas, use specific keys (preserves autocomplete)
            [K in keyof Schema]?: FieldFilter<Schema[K]>;
          }
    );

// Top-level filter (can be array for implicit AND)
export type Filter<Schema extends Record<string, StandardSchemaV1>> =
  | TypedFilter<Schema>
  | Array<TypedFilter<Schema>>
  | string;  // Escape hatch for raw OData expressions

