import type { Column } from "../../orm/column";

/**
 * Type-safe orderBy type that provides better DX than odata-query's default.
 *
 * Supported forms:
 * - `keyof T` - single field name (defaults to ascending)
 * - `[keyof T, 'asc' | 'desc']` - single field with explicit direction
 * - `Array<[keyof T, 'asc' | 'desc']>` - multiple fields with directions
 *
 * This type intentionally EXCLUDES `Array<keyof T>` to avoid ambiguity
 * between [field1, field2] and [field, direction].
 */
export type TypeSafeOrderBy<T> =
  | (keyof T & string) // Single field name
  | [keyof T & string, "asc" | "desc"] // Single field with direction
  | Array<[keyof T & string, "asc" | "desc"]>; // Multiple fields with directions

// Internal type for expand configuration
export type ExpandConfig = {
  relation: string;
  options?: Partial<import("odata-query").QueryOptions<any>>;
  targetTable?: import("../../orm/table").FMTable<any, any>;
};

// Type to represent expanded relations
export type ExpandedRelations = Record<string, { schema: any; selected: any }>;

/**
 * Extract the value type from a Column.
 * This uses the phantom type stored in Column to get the actual value type (output type for reading).
 */
type ExtractColumnType<C> =
  C extends Column<infer T, any, any, any> ? T : never;

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

export type QueryReturnType<
  T extends Record<string, any>,
  Selected extends keyof T | Record<string, Column<any, any, any, any>>,
  SingleMode extends "exact" | "maybe" | false,
  IsCount extends boolean,
  Expands extends ExpandedRelations,
> = IsCount extends true
  ? number
  : // Use tuple wrapping [Selected] extends [...] to prevent distribution over unions
    [Selected] extends [Record<string, Column<any, any, any, any>>]
    ? SingleMode extends "exact"
      ? MapSelectToReturnType<Selected, T> & {
          [K in keyof Expands]: Pick<
            Expands[K]["schema"],
            Expands[K]["selected"]
          >[];
        }
      : SingleMode extends "maybe"
        ?
            | (MapSelectToReturnType<Selected, T> & {
                [K in keyof Expands]: Pick<
                  Expands[K]["schema"],
                  Expands[K]["selected"]
                >[];
              })
            | null
        : (MapSelectToReturnType<Selected, T> & {
            [K in keyof Expands]: Pick<
              Expands[K]["schema"],
              Expands[K]["selected"]
            >[];
          })[]
    : // Use tuple wrapping to prevent distribution over union of keys
      [Selected] extends [keyof T]
      ? SingleMode extends "exact"
        ? Pick<T, Selected> & {
            [K in keyof Expands]: Pick<
              Expands[K]["schema"],
              Expands[K]["selected"]
            >[];
          }
        : SingleMode extends "maybe"
          ?
              | (Pick<T, Selected> & {
                  [K in keyof Expands]: Pick<
                    Expands[K]["schema"],
                    Expands[K]["selected"]
                  >[];
                })
              | null
          : (Pick<T, Selected> & {
              [K in keyof Expands]: Pick<
                Expands[K]["schema"],
                Expands[K]["selected"]
              >[];
            })[]
      : never;
