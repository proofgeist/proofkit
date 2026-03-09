import { Command } from "commander";
import type { ConnectionOptions } from "../utils/connection";
import { buildConnection } from "../utils/connection";
import { handleCliError } from "../utils/errors";
import { printResult } from "../utils/output";

export function makeWebhookCommand(): Command {
  const webhook = new Command("webhook").description("FileMaker webhook operations");

  webhook
    .command("list")
    .description("List all webhooks")
    .action(async (_opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { table: boolean };
      try {
        const { db } = buildConnection(globalOpts);
        const result = await db.webhook.list();
        printResult(result, { table: globalOpts.table ?? false });
      } catch (err) {
        handleCliError(err);
      }
    });

  webhook
    .command("get <id>")
    .description("Get a webhook by ID")
    .action(async (id: string, _opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { table: boolean };
      try {
        const { db } = buildConnection(globalOpts);
        const result = await db.webhook.get(Number(id));
        printResult(result, { table: globalOpts.table ?? false });
      } catch (err) {
        handleCliError(err);
      }
    });

  webhook
    .command("add")
    .description("Add a new webhook")
    .requiredOption("--table-name <name>", "Table to monitor")
    .requiredOption("--url <url>", "Webhook URL to call")
    .option("--select <fields>", "Comma-separated field names to include")
    .option("--header <kv>", "Header in key=value format (repeatable)", (val, acc: string[]) => {
      acc.push(val);
      return acc;
    }, [])
    .action(async (opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { table: boolean };
      try {
        const { db } = buildConnection(globalOpts);

        // Parse headers
        const headers: Record<string, string> = {};
        for (const h of opts.header as string[]) {
          const eqIdx = h.indexOf("=");
          if (eqIdx === -1) {
            throw new Error(`Invalid header format (expected key=value): ${h}`);
          }
          headers[h.slice(0, eqIdx)] = h.slice(eqIdx + 1);
        }

        // Build a minimal FMTable-like proxy for the tableName
        // webhook.add() only reads the name via Symbol, so this is safe at runtime
        const tableProxy = {
          [Symbol.for("fmodata:FMTableName")]: opts.tableName,
        } as unknown as import("../../orm/table").FMTable<Record<string, never>, string>;

        const webhookPayload: import("../../client/webhook-builder").Webhook<typeof tableProxy> = {
          webhook: opts.url as string,
          tableName: tableProxy,
        };

        if (Object.keys(headers).length > 0) {
          webhookPayload.headers = headers;
        }
        if (opts.select) {
          webhookPayload.select = opts.select as string;
        }

        const result = await db.webhook.add(webhookPayload);
        printResult(result, { table: globalOpts.table ?? false });
      } catch (err) {
        handleCliError(err);
      }
    });

  webhook
    .command("remove <id>")
    .description("Remove a webhook by ID")
    .action(async (id: string, _opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { table: boolean };
      try {
        const { db } = buildConnection(globalOpts);
        await db.webhook.remove(Number(id));
        printResult({ removed: true, id: Number(id) }, { table: globalOpts.table ?? false });
      } catch (err) {
        handleCliError(err);
      }
    });

  return webhook;
}
