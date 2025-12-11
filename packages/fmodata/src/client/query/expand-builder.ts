import { QueryOptions } from "odata-query";
import buildQuery from "odata-query";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { FMTable } from "../../orm/table";
import type { ExpandValidationConfig } from "../../validation";
import { formatSelectFields } from "../builders/select-utils";

/**
 * Internal type for expand configuration
 */
export type ExpandConfig = {
  relation: string;
  options?: Partial<QueryOptions<any>>;
  targetTable?: FMTable<any, any>;
};

/**
 * Builds OData expand query strings and validation configs.
 * Handles nested expands recursively and transforms relation names to FMTIDs
 * when using entity IDs.
 */
export class ExpandBuilder {
  constructor(private useEntityIds: boolean) {}

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
    if (this.useEntityIds) {
      if (targetTable && FMTable.Symbol.EntityId in targetTable) {
        const tableId = (targetTable as any)[FMTable.Symbol.EntityId] as
          | `FMTID:${string}`
          | undefined;
        if (tableId) {
          relationName = tableId;
        }
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
      const selectFields = formatSelectFields(
        selectArray,
        targetTable,
        this.useEntityIds,
      );
      parts.push(`$select=${selectFields}`);
    }

    if (config.options.filter) {
      // Filter should already be transformed by the nested builder
      // Use odata-query to build filter string
      const filterQuery = buildQuery({ filter: config.options.filter });
      const filterMatch = filterQuery.match(/\$filter=([^&]+)/);
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
    if (config.options.expand) {
      // If expand is a string, it's already been built
      if (typeof config.options.expand === "string") {
        parts.push(`$expand=${config.options.expand}`);
      }
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
        const tableSchema = (targetTable as any)[FMTable.Symbol.Schema];
        if (tableSchema) {
          const zodSchema = tableSchema["~standard"]?.schema;
          if (
            zodSchema &&
            typeof zodSchema === "object" &&
            "shape" in zodSchema
          ) {
            targetSchema = zodSchema.shape as Record<string, StandardSchemaV1>;
          }
        }
      }

      // Extract selected fields from options
      const selectedFields = config.options?.select
        ? Array.isArray(config.options.select)
          ? config.options.select.map((f) => String(f))
          : [String(config.options.select)]
        : undefined;

      return {
        relation: config.relation,
        targetSchema: targetSchema,
        targetTable: targetTable,
        table: targetTable, // For transformation
        selectedFields: selectedFields,
        nestedExpands: undefined, // TODO: Handle nested expands if needed
      };
    });
  }
}
