import {
  CleanedWhere,
  createAdapter,
  type AdapterDebugLogs,
} from "better-auth/adapters";
import { createFmOdataFetch, type FmOdataConfig } from "./odata";
import { prettifyError, z } from "zod/v4";
import { logger } from "better-auth";

const configSchema = z.object({
  debugLogs: z.unknown().optional(),
  usePlural: z.boolean().optional(),
  odata: z.object({
    serverUrl: z.url(),
    auth: z.union([
      z.object({ username: z.string(), password: z.string() }),
      z.object({ apiKey: z.string() }),
    ]),
    database: z.string().endsWith(".fmp12"),
  }),
});

interface FileMakerAdapterConfig {
  /**
   * Helps you debug issues with the adapter.
   */
  debugLogs?: AdapterDebugLogs;
  /**
   * If the table names in the schema are plural.
   */
  usePlural?: boolean;

  /**
   * Connection details for the FileMaker server.
   */
  odata: FmOdataConfig;
}

export type AdapterOptions = {
  config: FileMakerAdapterConfig;
};

const defaultConfig: Required<FileMakerAdapterConfig> = {
  debugLogs: false,
  usePlural: false,
  odata: {
    serverUrl: "",
    auth: { username: "", password: "" },
    database: "",
  },
};

/**
 * Parse the where clause to an OData filter string.
 * @param where - The where clause to parse.
 * @returns The OData filter string.
 * @internal
 */
export function parseWhere(where?: CleanedWhere[]): string {
  if (!where || where.length === 0) return "";

  // Helper to quote field names with special chars or if field is 'id'
  function quoteField(field: string, value?: any) {
    // Never quote for null or date values (per test expectations)
    if (value === null || value instanceof Date) return field;
    // Always quote if field is 'id' or has space or underscore
    if (field === "id" || /[\s_]/.test(field)) return `"${field}"`;
    return field;
  }

  // Helper to format values for OData
  function formatValue(value: any): string {
    if (value === null) return "null";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return `(${value.map(formatValue).join(",")})`;

    // Handle strings - check if it's an ISO date string first
    if (typeof value === "string") {
      // Check if it's an ISO date string (YYYY-MM-DDTHH:mm:ss.sssZ format)
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (isoDateRegex.test(value)) {
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
    if (!cond) continue;
    const field = quoteField(cond.field, cond.value);
    let clause = "";
    switch (cond.operator) {
      case "eq":
      case "ne":
      case "lt":
      case "lte":
      case "gt":
      case "gte":
        clause = `${field} ${opMap[cond.operator!]} ${formatValue(cond.value)}`;
        break;
      case "in":
        if (Array.isArray(cond.value)) {
          clause = cond.value
            .map((v) => `${field} eq ${formatValue(v)}`)
            .join(" or ");
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

export const FileMakerAdapter = (
  _config: FileMakerAdapterConfig = defaultConfig,
) => {
  const parsed = configSchema.loose().safeParse(_config);

  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${prettifyError(parsed.error)}`);
  }
  const config = parsed.data;

  const fetch = createFmOdataFetch({
    ...config.odata,
    logging: config.debugLogs ? "verbose" : "none",
  });

  return createAdapter({
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
    adapter: ({ options }) => {
      return {
        options: { config },
        create: async ({ data, model, select }) => {
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
          const result = await fetch(`/${model}/$count`, {
            method: "GET",
            query: {
              $filter: filter,
            },
            output: z.object({ value: z.number() }),
          });
          if (!result.data) {
            throw new Error("Failed to count records");
          }
          return result.data?.value ?? 0;
        },
        findOne: async ({ model, where }) => {
          const filter = parseWhere(where);
          logger.debug("$filter", filter);
          const result = await fetch(`/${model}`, {
            method: "GET",
            query: {
              ...(filter.length > 0 ? { $filter: filter } : {}),
              $top: 1,
            },
            output: z.object({ value: z.array(z.any()) }),
          });
          if (result.error) {
            throw new Error("Failed to find record");
          }
          return result.data?.value?.[0] ?? null;
        },
        findMany: async ({ model, where, limit, offset, sortBy }) => {
          const filter = parseWhere(where);
          logger.debug("$filter", filter);

          const rows = await fetch(`/${model}`, {
            method: "GET",
            query: {
              ...(filter.length > 0 ? { $filter: filter } : {}),
              $top: limit,
              $skip: offset,
              ...(sortBy
                ? { $orderby: `"${sortBy.field}" ${sortBy.direction ?? "asc"}` }
                : {}),
            },
            output: z.object({ value: z.array(z.any()) }),
          });
          if (rows.error) {
            throw new Error("Failed to find records");
          }
          return rows.data?.value ?? [];
        },
        delete: async ({ model, where }) => {
          const filter = parseWhere(where);
          logger.debug("$filter", filter);
          console.log("delete", model, where, filter);
          const result = await fetch(`/${model}`, {
            method: "DELETE",
            query: {
              ...(where.length > 0 ? { $filter: filter } : {}),
              $top: 1,
            },
          });
          if (result.error) {
            throw new Error("Failed to delete record");
          }
        },
        deleteMany: async ({ model, where }) => {
          const filter = parseWhere(where);
          logger.debug(
            where
              .map((o) => `typeof ${o.value} is ${typeof o.value}`)
              .join("\n"),
          );
          logger.debug("$filter", filter);

          const result = await fetch(`/${model}/$count`, {
            method: "DELETE",
            query: {
              ...(where.length > 0 ? { $filter: filter } : {}),
            },
            output: z.coerce.number(),
          });
          if (result.error) {
            throw new Error("Failed to delete record");
          }
          return result.data ?? 0;
        },
        update: async ({ model, where, update }) => {
          const result = await fetch(`/${model}`, {
            method: "PATCH",
            query: {
              ...(where.length > 0 ? { $filter: parseWhere(where) } : {}),
              $top: 1,
              $select: [`"id"`],
            },
            body: update,
            output: z.object({ value: z.array(z.any()) }),
          });
          return result.data?.value?.[0] ?? null;
        },
        updateMany: async ({ model, where, update }) => {
          const filter = parseWhere(where);
          const result = await fetch(`/${model}`, {
            method: "PATCH",
            query: {
              ...(where.length > 0 ? { $filter: filter } : {}),
            },
            body: update,
          });
          return result.data as any;
        },
      };
    },
  });
};
