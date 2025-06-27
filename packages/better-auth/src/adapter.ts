import {
  CleanedWhere,
  createAdapter,
  type AdapterDebugLogs,
} from "better-auth/adapters";
import { FmOdata, type FmOdataConfig } from "./odata";

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
  odata: FmOdataConfig | FmOdata;
}

const defaultConfig: Required<FileMakerAdapterConfig> = {
  debugLogs: false,
  usePlural: false,
  odata: {
    hostname: "",
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
    if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === "boolean") return value ? "true" : "false";
    if (value instanceof Date) return `'${value.toISOString()}'`;
    if (Array.isArray(value)) return `(${value.map(formatValue).join(",")})`;
    return value.toString();
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
): ReturnType<typeof createAdapter> => {
  const { ...config } = { ...defaultConfig, ..._config };

  const odata =
    config.odata instanceof FmOdata ? config.odata : new FmOdata(config.odata);
  const db = odata.database;

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
        create: async ({ data, model, select }) => {
          const row = await db.table(model).create(data);
          return row as unknown as typeof data;
        },
        count: async ({ model, where }) => {
          const count = await db.table(model).count(parseWhere(where));
          return count;
        },
        findOne: async ({ model, where }) => {
          const row = await db.table(model).query({
            filter: parseWhere(where),
            top: 1,
          });
          return (row[0] as any) ?? null;
        },
        findMany: async ({ model, where, limit, offset, sortBy }) => {
          const filter = parseWhere(where);

          const rows = await db.table(model).query({
            filter,
            top: limit,
            skip: offset,
            orderBy: sortBy,
          });
          return rows.map((row) => row as any);
        },
        delete: async ({ model, where }) => {
          const rows = await db.table(model).query({
            filter: parseWhere(where),
            top: 1,
            select: [`"id"`],
          });
          const row = rows[0] as { id: string } | undefined;
          if (!row) return;
          await db.table(model).delete(row.id);
        },
        deleteMany: async ({ model, where }) => {
          const filter = parseWhere(where);
          const count = await db.table(model).count(filter);
          await db.table(model).deleteMany(filter);
          return count;
        },
        update: async ({ model, where, update }) => {
          const rows = await db.table(model).query({
            filter: parseWhere(where),
            top: 1,
            select: [`"id"`],
          });
          const row = rows[0] as { id: string } | undefined;
          if (!row) return null;
          const result = await db.table(model).update(row["id"], update as any);
          return result as any;
        },
        updateMany: async ({ model, where, update }) => {
          const filter = parseWhere(where);
          const rows = await db.table(model).updateMany(filter, update as any);
          return rows.length;
        },
        createSchema: async ({ tables, file }) => {
          return {
            code: JSON.stringify(
              {
                tables,
                useNumberId: options.advanced?.database?.useNumberId ?? false,
              },
              null,
              2,
            ),
            path: file ?? "better-auth-schema.json",
            overwrite: true,
          };
        },
      };
    },
  });
};
