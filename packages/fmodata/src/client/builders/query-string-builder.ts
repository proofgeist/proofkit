import type { FMTable } from "../../orm/table";
import { ExpandBuilder } from "./expand-builder";
import type { ExpandConfig } from "./shared-types";
import { formatSelectFields } from "./select-utils";
import { InternalLogger } from "../../logger";

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
  table?: FMTable<any, any>;
  useEntityIds: boolean;
  logger: InternalLogger;
  includeSpecialColumns?: boolean;
}): string {
  const parts: string[] = [];
  const expandBuilder = new ExpandBuilder(config.useEntityIds, config.logger);

  // Build $select
  if (config.selectedFields && config.selectedFields.length > 0) {
    // Add special columns if includeSpecialColumns is true and they're not already present
    let finalSelectedFields = [...config.selectedFields];
    if (config.includeSpecialColumns) {
      if (!finalSelectedFields.includes("ROWID")) {
        finalSelectedFields.push("ROWID");
      }
      if (!finalSelectedFields.includes("ROWMODID")) {
        finalSelectedFields.push("ROWMODID");
      }
    }
    
    const selectString = formatSelectFields(
      finalSelectedFields,
      config.table,
      config.useEntityIds,
    );
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
