/** biome-ignore-all lint/suspicious/noExplicitAny: library code */
import { logger } from "better-auth";
import { type CleanedWhere, createAdapter, type DBAdapterDebugLogOption } from "better-auth/adapters";
import buildQuery from "odata-query";
import { prettifyError, z } from "zod/v4";
import { createRawFetch, type FmOdataConfig } from "./odata";

const configSchema = z.object({
  debugLogs: z.unknown().optional(),
  usePlural: z.boolean().optional(),
  odata: z.object({
    serverUrl: z.url(),
    auth: z.union([z.object({ username: z.string(), password: z.string() }), z.object({ apiKey: z.string() })]),
    database: z.string().endsWith(".fmp12"),
  }),
});

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
   * Connection details for the FileMaker server.
   */
  odata: FmOdataConfig;
}

export interface AdapterOptions {
  config: FileMakerAdapterConfig;
}

const defaultConfig: Required<FileMakerAdapterConfig> = {
  debugLogs: false,
  usePlural: false,
  odata: {
    serverUrl: "",
    auth: { username: "", password: "" },
    database: "",
  },
};

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

export const FileMakerAdapter = (_config: FileMakerAdapterConfig = defaultConfig) => {
  const parsed = configSchema.loose().safeParse(_config);

  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${prettifyError(parsed.error)}`);
  }
  const config = parsed.data;

  const { fetch } = createRawFetch({
    ...config.odata,
    logging: config.debugLogs ? "verbose" : "none",
  });

  const adapterFactory = createAdapter({
    config: {
      adapterId: "filemaker",
      adapterName: "FileMaker",
      usePlural: config.usePlural ?? false, // Whether the table names in the schema are plural.
      debugLogs: config.debugLogs ?? false, // Whether to enable debug logs.
      supportsJSON: false, // Whether the database supports JSON. (Default: false)
      supportsDates: false, // Whether the database supports dates. (Default: true)
      supportsBooleans: false, // Whether the database supports booleans. (Default: true)
      supportsNumericIds: false, // Whether the database supports auto-incrementing numeric IDs. (Default: true)
    },
    adapter: () => {
      return {
        create: async ({ data, model }) => {
          if (model === "session") {
            console.log("session", data);
          }

          const result = await fetch(`/${model}`, {
            method: "POST",
            body: data,
            output: z.looseObject({ id: z.string() }),
          });

          if (result.error) {
            throw new Error("Failed to create record");
          }

          return result.data as any;
        },
        count: async ({ model, where }) => {
          const filter = parseWhere(where);
          logger.debug("$filter", filter);

          const query = buildQuery({
            filter: filter.length > 0 ? filter : undefined,
          });

          const result = await fetch(`/${model}/$count${query}`, {
            method: "GET",
            output: z.object({ value: z.number() }),
          });
          if (!result.data) {
            throw new Error("Failed to count records");
          }
          return (result.data?.value as any) ?? 0;
        },
        findOne: async ({ model, where }) => {
          const filter = parseWhere(where);
          logger.debug("$filter", filter);

          const query = buildQuery({
            top: 1,
            filter: filter.length > 0 ? filter : undefined,
          });

          const result = await fetch(`/${model}${query}`, {
            method: "GET",
            output: z.object({ value: z.array(z.any()) }),
          });
          if (result.error) {
            throw new Error("Failed to find record");
          }
          return (result.data?.value?.[0] as any) ?? null;
        },
        findMany: async ({ model, where, limit, offset, sortBy }) => {
          const filter = parseWhere(where);
          logger.debug("FIND MANY", { where, filter });

          const query = buildQuery({
            top: limit,
            skip: offset,
            orderBy: sortBy ? `${sortBy.field} ${sortBy.direction ?? "asc"}` : undefined,
            filter: filter.length > 0 ? filter : undefined,
          });
          logger.debug("QUERY", query);

          const result = await fetch(`/${model}${query}`, {
            method: "GET",
            output: z.object({ value: z.array(z.any()) }),
          });
          logger.debug("RESULT", result);

          if (result.error) {
            throw new Error("Failed to find records");
          }

          return (result.data?.value as any) ?? [];
        },
        delete: async ({ model, where }) => {
          const filter = parseWhere(where);
          console.log("DELETE", { model, where, filter });
          logger.debug("$filter", filter);

          // Find a single id matching the filter
          const query = buildQuery({
            top: 1,
            select: [`"id"`],
            filter: filter.length > 0 ? filter : undefined,
          });

          const toDelete = await fetch(`/${model}${query}`, {
            method: "GET",
            output: z.object({ value: z.array(z.object({ id: z.string() })) }),
          });

          const id = toDelete.data?.value?.[0]?.id;
          if (!id) {
            // Nothing to delete
            return;
          }

          const result = await fetch(`/${model}('${id}')`, {
            method: "DELETE",
          });
          if (result.error) {
            console.log("DELETE ERROR", result.error);
            throw new Error("Failed to delete record");
          }
        },
        deleteMany: async ({ model, where }) => {
          const filter = parseWhere(where);
          console.log("DELETE MANY", { model, where, filter });

          // Find all ids matching the filter
          const query = buildQuery({
            select: [`"id"`],
            filter: filter.length > 0 ? filter : undefined,
          });

          const rows = await fetch(`/${model}${query}`, {
            method: "GET",
            output: z.object({ value: z.array(z.object({ id: z.string() })) }),
          });

          const ids = rows.data?.value?.map((r: any) => r.id) ?? [];
          let deleted = 0;
          for (const id of ids) {
            const res = await fetch(`/${model}('${id}')`, {
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
          const query = buildQuery({
            select: [`"id"`],
            filter: filter.length > 0 ? filter : undefined,
          });

          const existing = await fetch(`/${model}${query}`, {
            method: "GET",
            output: z.object({ value: z.array(z.object({ id: z.string() })) }),
          });
          logger.debug("EXISTING", existing.data);

          const id = existing.data?.value?.[0]?.id;
          if (!id) {
            return null;
          }

          const patchRes = await fetch(`/${model}('${id}')`, {
            method: "PATCH",
            body: update,
          });
          logger.debug("PATCH RES", patchRes.data);
          if (patchRes.error) {
            return null;
          }

          // Read back the updated record
          const readBack = await fetch(`/${model}('${id}')`, {
            method: "GET",
            output: z.record(z.string(), z.unknown()),
          });
          logger.debug("READ BACK", readBack.data);
          return (readBack.data as any) ?? null;
        },
        updateMany: async ({ model, where, update }) => {
          const filter = parseWhere(where);
          // Find all ids matching the filter
          const query = buildQuery({
            select: [`"id"`],
            filter: filter.length > 0 ? filter : undefined,
          });

          const rows = await fetch(`/${model}${query}`, {
            method: "GET",
            output: z.object({ value: z.array(z.object({ id: z.string() })) }),
          });

          const ids = rows.data?.value?.map((r: any) => r.id) ?? [];
          let updated = 0;
          for (const id of ids) {
            const res = await fetch(`/${model}('${id}')`, {
              method: "PATCH",
              body: update,
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

  // Expose the FileMaker config for CLI access
  (adapterFactory as any).filemakerConfig = config as FileMakerAdapterConfig;
  return adapterFactory;
};
