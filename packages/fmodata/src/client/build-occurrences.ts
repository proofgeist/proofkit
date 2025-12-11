import { TableOccurrence } from "./table-occurrence";

/**
 * Extract the name type from a TableOccurrence
 */
type ExtractName<TO> =
  TO extends TableOccurrence<any, infer Name, any, any> ? Name : never;

/**
 * Extract all names from an array of TableOccurrences as a union
 */
type ExtractNames<TOs extends readonly TableOccurrence<any, any, any, any>[]> =
  ExtractName<TOs[number]>;

/**
 * Find a TableOccurrence by name from an array
 */
type FindByName<
  TOs extends readonly TableOccurrence<any, any, any, any>[],
  Name extends string,
> = Extract<TOs[number], TableOccurrence<any, Name, any, any>>;

/**
 * Navigation configuration - maps TO names to arrays of navigation target names.
 * A table occurrence cannot navigate to itself.
 */
type NavigationConfig<
  TOs extends readonly TableOccurrence<any, any, any, any>[],
> = {
  [K in ExtractNames<TOs>]?: Exclude<ExtractNames<TOs>, K>[];
};

/**
 * Resolve navigation config to actual TO record for a given TO name
 */
type ResolveNavForTO<
  TOs extends readonly TableOccurrence<any, any, any, any>[],
  Nav extends NavigationConfig<TOs> | undefined,
  Name extends ExtractNames<TOs>,
> =
  Nav extends NavigationConfig<TOs>
    ? Nav[Name] extends infer NavNames extends string[]
      ? {
          [K in NavNames[number]]: FindByName<TOs, K>;
        }
      : {}
    : {};

/**
 * Build the result type - a tuple of TOs with navigation resolved
 */
type BuildResult<
  TOs extends readonly TableOccurrence<any, any, any, any>[],
  Nav extends NavigationConfig<TOs> | undefined,
> = {
  [K in keyof TOs]: TOs[K] extends TableOccurrence<
    infer BT,
    infer Name,
    any,
    infer DefSelect
  >
    ? Name extends ExtractNames<TOs>
      ? TableOccurrence<BT, Name, ResolveNavForTO<TOs, Nav, Name>, DefSelect>
      : TOs[K]
    : TOs[K];
};

/**
 * Configuration object for buildOccurrences
 */
type BuildOccurrencesConfig<
  TOs extends readonly TableOccurrence<any, any, any, any>[],
> = {
  occurrences: TOs;
  navigation?: NavigationConfig<TOs>;
};

/**
 * Builds TableOccurrences with navigation relationships resolved.
 *
 * This is the second phase of TO definition - after defining base TOs,
 * use this function to link them with navigation relationships.
 *
 * @example Full navigation
 * ```ts
 * const [contacts, users] = buildOccurrences({
 *   occurrences: [_contacts, _users],
 *   navigation: {
 *     contacts: ["users"],
 *     users: ["contacts"],
 *   },
 * });
 * ```
 *
 * @example Partial navigation
 * ```ts
 * const [contacts, users] = buildOccurrences({
 *   occurrences: [_contacts, _users],
 *   navigation: {
 *     contacts: ["users"],
 *   },
 * });
 * ```
 *
 * @example No navigation
 * ```ts
 * const [contacts, users] = buildOccurrences({
 *   occurrences: [_contacts, _users],
 * });
 * ```
 *
 * @param config - Configuration object with occurrences array and optional navigation
 * @returns Tuple of TableOccurrences with navigation resolved (same order as input)
 */
export function buildOccurrences<
  const TOs extends readonly TableOccurrence<any, any, any, any>[],
  const Nav extends NavigationConfig<TOs> | undefined,
>(config: { occurrences: TOs; navigation?: Nav }): BuildResult<TOs, Nav> {
  const { occurrences, navigation } = config;

  // Build a map of name -> TO for quick lookup
  const toByName = new Map<string, TableOccurrence<any, any, any, any>>();
  for (const to of occurrences) {
    toByName.set(to.name, to);
  }

  // Build result array with navigation resolved
  const result = occurrences.map((to) => {
    const navNames = navigation?.[to.name as keyof typeof navigation] as
      | string[]
      | undefined;

    // Resolve navigation names to actual TOs
    const resolvedNav: Record<string, TableOccurrence<any, any, any, any>> = {};
    if (navNames) {
      for (const navName of navNames) {
        // Prevent self-navigation
        if (navName === to.name) {
          throw new Error(
            `TableOccurrence "${to.name}" cannot navigate to itself`,
          );
        }
        const targetTO = toByName.get(navName);
        if (targetTO) {
          resolvedNav[navName] = targetTO;
        }
      }
    }

    // Create new TO with navigation using internal method
    return TableOccurrence._withNavigation(to, resolvedNav);
  });

  return result as BuildResult<TOs, Nav>;
}
