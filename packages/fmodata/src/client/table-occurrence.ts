import { BaseTable } from "./base-table";

// Helper type to extract schema from BaseTable
type ExtractSchema<BT> =
  BT extends BaseTable<infer S, any, any, any> ? S : never;

// Symbol for internal navigation setting (used by buildOccurrences)
const INTERNAL_NAV = Symbol("internal-navigation");

export class TableOccurrence<
  BT extends BaseTable<any, any, any, any> = any,
  Name extends string = string,
  Nav extends Record<string, TableOccurrence<any, any, any, any>> = {},
  DefSelect extends
    | "all"
    | "schema"
    | readonly (keyof ExtractSchema<BT>)[] = "schema",
> {
  public readonly name: Name;
  public readonly baseTable: BT;
  public readonly navigation: Nav;
  public readonly defaultSelect: DefSelect;
  public readonly fmtId?: `FMTID:${string}`;

  constructor(config: {
    readonly name: Name;
    readonly baseTable: BT;
    readonly defaultSelect?: DefSelect;
    readonly fmtId?: `FMTID:${string}`;
    /** @internal Used by buildOccurrences - do not use directly */
    readonly [INTERNAL_NAV]?: Nav;
  }) {
    this.name = config.name;
    this.baseTable = config.baseTable;
    this.navigation = (config[INTERNAL_NAV] ?? {}) as Nav;
    this.defaultSelect = (config.defaultSelect ?? "schema") as DefSelect;
    this.fmtId = config.fmtId;
  }

  /**
   * Returns the FileMaker table occurrence ID (FMTID) if available, or the table name.
   * @returns The FMTID string or the table name
   */
  getTableId(): string {
    return this.fmtId ?? this.name;
  }

  /**
   * Returns the table occurrence name.
   * @returns The table name
   */
  getTableName(): string {
    return this.name;
  }

  /**
   * Returns true if this TableOccurrence is using FileMaker table occurrence IDs.
   */
  isUsingTableId(): boolean {
    return this.fmtId !== undefined;
  }

  /**
   * @internal Creates a new TableOccurrence with navigation - used by buildOccurrences
   */
  static _withNavigation<
    BT extends BaseTable<any, any, any, any>,
    Name extends string,
    Nav extends Record<string, TableOccurrence<any, any, any, any>>,
    DefSelect extends
      | "all"
      | "schema"
      | readonly (keyof ExtractSchema<BT>)[] = "schema",
  >(
    base: TableOccurrence<BT, Name, any, DefSelect>,
    navigation: Nav,
  ): TableOccurrence<BT, Name, Nav, DefSelect> {
    return new TableOccurrence({
      name: base.name,
      baseTable: base.baseTable,
      defaultSelect: base.defaultSelect,
      fmtId: base.fmtId,
      [INTERNAL_NAV]: navigation,
    }) as TableOccurrence<BT, Name, Nav, DefSelect>;
  }
}

// Helper function to create TableOccurrence with proper type inference
export function createTableOccurrence<
  const Name extends string,
  BT extends BaseTable<any, any, any, any>,
  DefSelect extends
    | "all"
    | "schema"
    | readonly (keyof ExtractSchema<BT>)[] = "schema",
>(config: {
  name: Name;
  baseTable: BT;
  defaultSelect?: DefSelect;
  fmtId?: `FMTID:${string}`;
}): TableOccurrence<BT, Name, {}, DefSelect> {
  return new TableOccurrence(config);
}

/**
 * Creates a TableOccurrence with proper TypeScript type inference.
 *
 * Use this function to create TableOccurrence instances with full type safety.
 * For navigation between tables, use `buildOccurrences()` after defining your TOs.
 *
 * @example
 * ```ts
 * const users = defineTableOccurrence({
 *   name: "users",
 *   baseTable: usersBase,
 * });
 * ```
 *
 * @example With entity IDs
 * ```ts
 * const products = defineTableOccurrence({
 *   name: "products",
 *   baseTable: productsBase,
 *   fmtId: "FMTID:12345",
 * });
 * ```
 *
 * @example With navigation (use buildOccurrences)
 * ```ts
 * const _users = defineTableOccurrence({ name: "users", baseTable: usersBase });
 * const _contacts = defineTableOccurrence({ name: "contacts", baseTable: contactsBase });
 *
 * const [users, contacts] = buildOccurrences({
 *   occurrences: [_users, _contacts],
 *   navigation: {
 *     users: ["contacts"],
 *     contacts: ["users"],
 *   },
 * });
 * ```
 */
export function defineTableOccurrence<
  const Name extends string,
  BT extends BaseTable<any, any, any, any>,
  const DefSelect extends
    | "all"
    | "schema"
    | readonly (keyof ExtractSchema<BT>)[] = "schema",
>(config: {
  readonly name: Name;
  readonly baseTable: BT;
  readonly fmtId?: `FMTID:${string}`;
  readonly defaultSelect?: DefSelect;
}): TableOccurrence<BT, Name, {}, DefSelect> {
  return new TableOccurrence(config);
}
