import type { StandardSchemaV1 } from "@standard-schema/spec";
import buildQuery, { type QueryOptions } from "odata-query";
import { FMTable } from "../../orm/table";
import type { ExpandValidationConfig } from "../../validation";
import { formatSelectFields } from "../builders/select-utils";

const FILTER_QUERY_REGEX = /\$filter=([^&]+)/;

/**
 * Internal type for expand configuration
 */
export interface ExpandConfig {
  relation: string;
  // biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any QueryOptions configuration
  options?: Partial<QueryOptions<any>>;
  // biome-ignore lint/suspicious/noExplicitAny: Accepts any FMTable configuration
  targetTable?: FMTable<any, any>;
}

/**
 * Builds OData expand query strings and validation configs.
 * Handles nested expands recursively and transforms relation names to FMTIDs
 * when using entity IDs.
 */
export class ExpandBuilder {
  private readonly useEntityIds: boolean;

  constructor(useEntityIds: boolean) {
    this.useEntityIds = useEntityIds;
  }

  /**
   * Builds OData expand query string from expand configurations.
   * Handles nested expands recursively.
   * Transforms relation names to FMTIDs if using entity IDs.
   */
  buildExpandString(configs: ExpandConfig[]): string {
    if (configs.length === 0) {
      return "";
    }

    return configs.map((config) => this.buildSingleExpand(config)).join(",");
  }

  /**
   * Builds a single expand string with its options.
   */
  private buildSingleExpand(config: ExpandConfig): string {
    // Get target table/occurrence from config (stored during expand call)
    const targetTable = config.targetTable;

    // When using entity IDs, use the target table's FMTID in the expand parameter
    // FileMaker expects FMTID in $expand when Prefer header is set
    // Only use FMTID if databaseUseEntityIds is enabled
    let relationName = config.relation;
    if (this.useEntityIds && targetTable && FMTable.Symbol.EntityId in targetTable) {
      // biome-ignore lint/suspicious/noExplicitAny: Type assertion for Symbol property access
      const tableId = (targetTable as any)[FMTable.Symbol.EntityId] as `FMTID:${string}` | undefined;
      if (tableId) {
        relationName = tableId;
      }
    }

    if (!config.options || Object.keys(config.options).length === 0) {
      // Simple expand without options
      return relationName;
    }

    // Build query options for this expand
    const parts: string[] = [];

    if (config.options.select) {
      // Use shared formatSelectFields function for consistent id field quoting
      const selectArray = Array.isArray(config.options.select)
        ? config.options.select.map(String)
        : [String(config.options.select)];
      const selectFields = formatSelectFields(selectArray, targetTable, this.useEntityIds);
      parts.push(`$select=${selectFields}`);
    }

    if (config.options.filter) {
      // Filter should already be transformed by the nested builder
      // Use odata-query to build filter string
      const filterQuery = buildQuery({ filter: config.options.filter });
      const filterMatch = filterQuery.match(FILTER_QUERY_REGEX);
      if (filterMatch) {
        parts.push(`$filter=${filterMatch[1]}`);
      }
    }

    if (config.options.orderBy) {
      // OrderBy should already be transformed by the nested builder
      const orderByValue = Array.isArray(config.options.orderBy)
        ? config.options.orderBy.join(",")
        : config.options.orderBy;
      parts.push(`$orderby=${String(orderByValue)}`);
    }

    if (config.options.top !== undefined) {
      parts.push(`$top=${config.options.top}`);
    }

    if (config.options.skip !== undefined) {
      parts.push(`$skip=${config.options.skip}`);
    }

    // Handle nested expands (from expand configs)
    if (config.options.expand && typeof config.options.expand === "string") {
      // If expand is a string, it's already been built
      parts.push(`$expand=${config.options.expand}`);
    }

    if (parts.length === 0) {
      return relationName;
    }

    return `${relationName}(${parts.join(";")})`;
  }

  /**
   * Builds expand validation configs from internal expand configurations.
   * These are used to validate expanded navigation properties.
   */
  buildValidationConfigs(configs: ExpandConfig[]): ExpandValidationConfig[] {
    return configs.map((config) => {
      // Get target table/occurrence from config (stored during expand call)
      const targetTable = config.targetTable;

      // Extract schema from target table/occurrence
      let targetSchema: Record<string, StandardSchemaV1> | undefined;
      if (targetTable) {
        // biome-ignore lint/suspicious/noExplicitAny: Type assertion for Symbol property access
        const tableSchema = (targetTable as any)[FMTable.Symbol.Schema];
        if (tableSchema) {
          const zodSchema = tableSchema["~standard"]?.schema;
          if (zodSchema && typeof zodSchema === "object" && "shape" in zodSchema) {
            targetSchema = zodSchema.shape as Record<string, StandardSchemaV1>;
          }
        }
      }

      // Extract selected fields from options
      let selectedFields: string[] | undefined;
      if (config.options?.select) {
        selectedFields = Array.isArray(config.options.select)
          ? config.options.select.map((f) => String(f))
          : [String(config.options.select)];
      }

      return {
        relation: config.relation,
        targetSchema,
        targetTable,
        table: targetTable, // For transformation
        selectedFields,
        nestedExpands: undefined, // TODO: Handle nested expands if needed
      };
    });
  }
}
