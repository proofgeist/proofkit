import { Command } from "commander";
import type { ConnectionOptions } from "../utils/connection";
import { buildConnection } from "../utils/connection";
import { handleCliError } from "../utils/errors";
import { printResult } from "../utils/output";

function buildQueryString(params: {
  top?: number;
  skip?: number;
  select?: string;
  where?: string;
  orderBy?: string;
}): string {
  const parts: string[] = [];
  if (params.top !== undefined) {
    parts.push(`$top=${encodeURIComponent(String(params.top))}`);
  }
  if (params.skip !== undefined) {
    parts.push(`$skip=${encodeURIComponent(String(params.skip))}`);
  }
  if (params.select) {
    parts.push(`$select=${encodeURIComponent(params.select)}`);
  }
  if (params.where) {
    parts.push(`$filter=${encodeURIComponent(params.where)}`);
  }
  if (params.orderBy) {
    // Accept "field:asc" or "field:desc" or plain "field"
    const orderStr = params.orderBy
      .split(",")
      .map((part) => {
        const [field, dir] = part.trim().split(":");
        return dir ? `${field} ${dir}` : field;
      })
      .join(",");
    parts.push(`$orderby=${encodeURIComponent(orderStr)}`);
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

export function makeRecordsCommand(): Command {
  const query = new Command("records").description("FileMaker record operations (list, insert, update, delete)");

  query
    .command("list")
    .description("List records from a table")
    .requiredOption("--table <name>", "Table name")
    .option("--top <n>", "Max records to return", Number)
    .option("--skip <n>", "Records to skip", Number)
    .option("--select <fields>", "Comma-separated field names")
    .option("--where <expr>", "OData filter expression")
    .option("--order-by <field>", "Order by field (format: field:asc|desc, or comma-separated)")
    .action(async (opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { pretty: boolean };
      try {
        const { db } = buildConnection(globalOpts);
        const qs = buildQueryString({
          top: opts.top as number | undefined,
          skip: opts.skip as number | undefined,
          select: opts.select as string | undefined,
          where: opts.where as string | undefined,
          orderBy: opts.orderBy as string | undefined,
        });
        const result = await db._makeRequest<{ value: unknown[] }>(`/${opts.table}${qs}`);
        if (result.error) {
          throw result.error;
        }
        printResult(result.data.value ?? result.data, { pretty: globalOpts.pretty ?? false });
      } catch (err) {
        handleCliError(err);
      }
    });

  query
    .command("insert")
    .description("Insert a record into a table")
    .requiredOption("--table <name>", "Table name")
    .requiredOption("--data <json>", "Record data as JSON object")
    .action(async (opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { pretty: boolean };
      try {
        const { db } = buildConnection(globalOpts);
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(opts.data) as Record<string, unknown>;
        } catch {
          throw new Error("--data must be a valid JSON object");
        }
        const result = await db._makeRequest<unknown>(`/${opts.table}`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        if (result.error) {
          throw result.error;
        }
        printResult(result.data, { pretty: globalOpts.pretty ?? false });
      } catch (err) {
        handleCliError(err);
      }
    });

  query
    .command("update")
    .description("Update records in a table")
    .requiredOption("--table <name>", "Table name")
    .requiredOption("--data <json>", "Update data as JSON object")
    .option("--where <expr>", "OData filter expression")
    .action(async (opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { pretty: boolean };
      try {
        const { db } = buildConnection(globalOpts);
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(opts.data) as Record<string, unknown>;
        } catch {
          throw new Error("--data must be a valid JSON object");
        }
        const qs = buildQueryString({ where: opts.where as string | undefined });
        const result = await db._makeRequest<unknown>(`/${opts.table}${qs}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        if (result.error) {
          throw result.error;
        }
        printResult(result.data, { pretty: globalOpts.pretty ?? false });
      } catch (err) {
        handleCliError(err);
      }
    });

  query
    .command("delete")
    .description("Delete records from a table")
    .requiredOption("--table <name>", "Table name")
    .option("--where <expr>", "OData filter expression")
    .action(async (opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { pretty: boolean };
      try {
        const { db } = buildConnection(globalOpts);
        const qs = buildQueryString({ where: opts.where as string | undefined });
        const result = await db._makeRequest<unknown>(`/${opts.table}${qs}`, {
          method: "DELETE",
        });
        if (result.error) {
          throw result.error;
        }
        printResult(result.data, { pretty: globalOpts.pretty ?? false });
      } catch (err) {
        handleCliError(err);
      }
    });

  return query;
}
