import type { InternalLogger } from "../../logger";
import type { FMTable } from "../../orm/table";
import { ExpandBuilder } from "./expand-builder";
import { formatSelectFields } from "./select-utils";
import type { ExpandConfig } from "./shared-types";

/**
 * Builds OData query string for $select and $expand parameters.
 * Used by both QueryBuilder and RecordBuilder to eliminate duplication.
 *
 * @param config - Configuration object
 * @returns Query string starting with ? or empty string if no parameters
 */
export function buildSelectExpandQueryString(config: {
  selectedFields?: string[];
  expandConfigs: ExpandConfig[];
  // biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
  table?: FMTable<any, any>;
  useEntityIds: boolean;
  logger: InternalLogger;
  includeSpecialColumns?: boolean;
}): string {
  const parts: string[] = [];
  const expandBuilder = new ExpandBuilder(config.useEntityIds, config.logger);

  // Build $select
  if (config.selectedFields && config.selectedFields.length > 0) {
    // Important: do NOT implicitly add system columns (ROWID/ROWMODID) here.
    // - `includeSpecialColumns` controls the Prefer header + response parsing, but should not
    //   mutate/expand an explicit `$select` (e.g. when the user calls `.select({ ... })`).
    // - If system columns are desired with `.select()`, they must be explicitly included via
    //   the `systemColumns` argument, which will already have added them to `selectedFields`.
    const selectString = formatSelectFields(config.selectedFields, config.table, config.useEntityIds);
    if (selectString) {
      parts.push(`$select=${selectString}`);
    }
  }

  // Build $expand
  const expandString = expandBuilder.buildExpandString(config.expandConfigs);
  if (expandString) {
    parts.push(`$expand=${expandString}`);
  }

  return parts.length > 0 ? `?${parts.join("&")}` : "";
}
