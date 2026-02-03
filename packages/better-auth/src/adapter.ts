/** biome-ignore-all lint/suspicious/noExplicitAny: library code */
import type { Database } from "@proofkit/fmodata";
import { logger } from "better-auth";
import { type CleanedWhere, createAdapter, type DBAdapterDebugLogOption } from "better-auth/adapters";

export interface FileMakerAdapterConfig {
  /**
   * Helps you debug issues with the adapter.
   */
  debugLogs?: DBAdapterDebugLogOption;
  /**
   * If the table names in the schema are plural.
   */
  usePlural?: boolean;
  /**
   * The fmodata Database instance to use for all OData requests.
   */
  database: Database;
}

// Regex patterns for field validation and ISO date detection
const FIELD_SPECIAL_CHARS_REGEX = /[\s_]/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

/**
 * Parse the where clause to an OData filter string.
 * @param where - The where clause to parse.
 * @returns The OData filter string.
 * @internal
 */
export function parseWhere(where?: CleanedWhere[]): string {
  if (!where || where.length === 0) {
    return "";
  }

  // Helper to quote field names with special chars or if field is 'id'
  function quoteField(field: string, value?: any) {
    // Never quote for null or date values (per test expectations)
    if (value === null || value instanceof Date) {
      return field;
    }
    // Always quote if field is 'id' or has space or underscore
    if (field === "id" || FIELD_SPECIAL_CHARS_REGEX.test(field)) {
      return `"${field}"`;
    }
    return field;
  }

  // Helper to format values for OData
  function formatValue(value: any): string {
    if (value === null) {
      return "null";
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (Array.isArray(value)) {
      return `(${value.map(formatValue).join(",")})`;
    }

    // Handle strings - check if it's an ISO date string first
    if (typeof value === "string") {
      // Check if it's an ISO date string (YYYY-MM-DDTHH:mm:ss.sssZ format)
      if (ISO_DATE_REGEX.test(value)) {
        return value; // Return ISO date strings without quotes
      }
      return `'${value.replace(/'/g, "''")}'`; // Regular strings get quotes
    }

    return value?.toString() ?? "";
  }

  // Map our operators to OData
  const opMap: Record<string, string> = {
    eq: "eq",
    ne: "ne",
    lt: "lt",
    lte: "le",
    gt: "gt",
    gte: "ge",
  };

  // Build each clause
  const clauses: string[] = [];
  for (let i = 0; i < where.length; i++) {
    const cond = where[i];
    if (!cond) {
      continue;
    }
    const field = quoteField(cond.field, cond.value);
    let clause = "";
    switch (cond.operator) {
      case "eq":
      case "ne":
      case "lt":
      case "lte":
      case "gt":
      case "gte":
        clause = `${field} ${opMap[cond.operator]} ${formatValue(cond.value)}`;
        break;
      case "in":
        if (Array.isArray(cond.value)) {
          clause = cond.value.map((v) => `${field} eq ${formatValue(v)}`).join(" or ");
          clause = `(${clause})`;
        }
        break;
      case "contains":
        clause = `contains(${field}, ${formatValue(cond.value)})`;
        break;
      case "starts_with":
        clause = `startswith(${field}, ${formatValue(cond.value)})`;
        break;
      case "ends_with":
        clause = `endswith(${field}, ${formatValue(cond.value)})`;
        break;
      default:
        clause = `${field} eq ${formatValue(cond.value)}`;
    }
    clauses.push(clause);
    // Add connector if not last
    if (i < where.length - 1) {
      clauses.push((cond.connector || "and").toLowerCase());
    }
  }
  return clauses.join(" ");
}

/**
 * Build an OData query string from parameters.
 */
function buildQueryString(params: {
  top?: number;
  skip?: number;
  filter?: string;
  orderBy?: string;
  select?: string[];
}): string {
  const parts: string[] = [];
  if (params.top !== undefined) {
    parts.push(`$top=${params.top}`);
  }
  if (params.skip !== undefined) {
    parts.push(`$skip=${params.skip}`);
  }
  if (params.filter) {
    parts.push(`$filter=${params.filter}`);
  }
  if (params.orderBy) {
    parts.push(`$orderby=${params.orderBy}`);
  }
  if (params.select?.length) {
    parts.push(`$select=${params.select.join(",")}`);
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

export const FileMakerAdapter = (config: FileMakerAdapterConfig) => {
  if (!config.database || typeof config.database !== "object") {
    throw new Error("FileMakerAdapter requires a `database` (fmodata Database instance).");
  }

  const db = config.database;

  const adapterFactory = createAdapter({
    config: {
      adapterId: "filemaker",
      adapterName: "FileMaker",
      usePlural: config.usePlural ?? false,
      debugLogs: config.debugLogs ?? false,
      supportsJSON: false,
      supportsDates: false,
      supportsBooleans: false,
      supportsNumericIds: false,
    },
    adapter: () => {
      return {
        create: async ({ data, model }) => {
          const result = await db._makeRequest<Record<string, any>>(`/${model}`, {
            method: "POST",
            body: JSON.stringify(data),
          });

          if (result.error) {
            throw new Error("Failed to create record");
          }

          return result.data as any;
        },
        count: async ({ model, where }) => {
          const filter = parseWhere(where);
          logger.debug("$filter", filter);

          const query = buildQueryString({
            filter: filter.length > 0 ? filter : undefined,
          });

          const result = await db._makeRequest<{ value: number }>(`/${model}/$count${query}`);
          if (result.error) {
            throw new Error("Failed to count records");
          }
          return (result.data?.value as any) ?? 0;
        },
        findOne: async ({ model, where }) => {
          const filter = parseWhere(where);
          logger.debug("$filter", filter);

          const query = buildQueryString({
            top: 1,
            filter: filter.length > 0 ? filter : undefined,
          });

          const result = await db._makeRequest<{ value: any[] }>(`/${model}${query}`);
          if (result.error) {
            throw new Error("Failed to find record");
          }
          return (result.data?.value?.[0] as any) ?? null;
        },
        findMany: async ({ model, where, limit, offset, sortBy }) => {
          const filter = parseWhere(where);
          logger.debug("FIND MANY", { where, filter });

          const query = buildQueryString({
            top: limit,
            skip: offset,
            orderBy: sortBy ? `${sortBy.field} ${sortBy.direction ?? "asc"}` : undefined,
            filter: filter.length > 0 ? filter : undefined,
          });
          logger.debug("QUERY", query);

          const result = await db._makeRequest<{ value: any[] }>(`/${model}${query}`);
          logger.debug("RESULT", result);

          if (result.error) {
            throw new Error("Failed to find records");
          }

          return (result.data?.value as any) ?? [];
        },
        delete: async ({ model, where }) => {
          const filter = parseWhere(where);
          logger.debug("$filter", filter);

          // Find a single id matching the filter
          const query = buildQueryString({
            top: 1,
            select: [`"id"`],
            filter: filter.length > 0 ? filter : undefined,
          });

          const toDelete = await db._makeRequest<{ value: { id: string }[] }>(`/${model}${query}`);

          const id = toDelete.data?.value?.[0]?.id;
          if (!id) {
            return;
          }

          const result = await db._makeRequest(`/${model}('${id}')`, {
            method: "DELETE",
          });
          if (result.error) {
            throw new Error("Failed to delete record");
          }
        },
        deleteMany: async ({ model, where }) => {
          const filter = parseWhere(where);

          // Find all ids matching the filter
          const query = buildQueryString({
            select: [`"id"`],
            filter: filter.length > 0 ? filter : undefined,
          });

          const rows = await db._makeRequest<{ value: { id: string }[] }>(`/${model}${query}`);

          const ids = rows.data?.value?.map((r: any) => r.id) ?? [];
          let deleted = 0;
          for (const id of ids) {
            const res = await db._makeRequest(`/${model}('${id}')`, {
              method: "DELETE",
            });
            if (!res.error) {
              deleted++;
            }
          }
          return deleted;
        },
        update: async ({ model, where, update }) => {
          const filter = parseWhere(where);
          logger.debug("UPDATE", { model, where, update });
          logger.debug("$filter", filter);

          // Find one id to update
          const query = buildQueryString({
            select: [`"id"`],
            filter: filter.length > 0 ? filter : undefined,
          });

          const existing = await db._makeRequest<{ value: { id: string }[] }>(`/${model}${query}`);
          logger.debug("EXISTING", existing.data);

          const id = existing.data?.value?.[0]?.id;
          if (!id) {
            return null;
          }

          const patchRes = await db._makeRequest(`/${model}('${id}')`, {
            method: "PATCH",
            body: JSON.stringify(update),
          });
          logger.debug("PATCH RES", patchRes.data);
          if (patchRes.error) {
            return null;
          }

          // Read back the updated record
          const readBack = await db._makeRequest<Record<string, unknown>>(`/${model}('${id}')`);
          logger.debug("READ BACK", readBack.data);
          return (readBack.data as any) ?? null;
        },
        updateMany: async ({ model, where, update }) => {
          const filter = parseWhere(where);

          // Find all ids matching the filter
          const query = buildQueryString({
            select: [`"id"`],
            filter: filter.length > 0 ? filter : undefined,
          });

          const rows = await db._makeRequest<{ value: { id: string }[] }>(`/${model}${query}`);

          const ids = rows.data?.value?.map((r: any) => r.id) ?? [];
          let updated = 0;
          for (const id of ids) {
            const res = await db._makeRequest(`/${model}('${id}')`, {
              method: "PATCH",
              body: JSON.stringify(update),
            });
            if (!res.error) {
              updated++;
            }
          }
          return updated as any;
        },
      };
    },
  });

  // Expose the Database instance for CLI access
  (adapterFactory as any).database = db;
  return adapterFactory;
};
