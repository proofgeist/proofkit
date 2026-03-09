import { Command } from "commander";
import type { Field } from "../../client/schema-manager";
import type { ConnectionOptions } from "../utils/connection";
import { buildConnection } from "../utils/connection";
import { handleCliError } from "../utils/errors";
import { printResult } from "../utils/output";

export function makeSchemaCommand(): Command {
  const schema = new Command("schema").description("FileMaker schema modification operations");

  schema
    .command("list-tables")
    .description("List all tables in the database")
    .action(async (_opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { pretty: boolean };
      try {
        const { db } = buildConnection(globalOpts);
        const tables = await db.listTableNames();
        printResult(tables, { pretty: globalOpts.pretty ?? false });
      } catch (err) {
        handleCliError(err);
      }
    });

  schema
    .command("create-table")
    .description("Create a new table (requires --confirm to execute; dry-run by default)")
    .requiredOption("--name <name>", "Table name")
    .requiredOption("--fields <json>", "Fields definition as JSON array")
    .option("--confirm", "Execute the operation (without this flag, shows what would be created)")
    .action(async (opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { pretty: boolean };
      try {
        let fields: Field[];
        try {
          const parsed: unknown = JSON.parse(opts.fields);
          if (!Array.isArray(parsed)) throw new Error();
          fields = parsed as Field[];
        } catch {
          throw new Error("--fields must be a valid JSON array");
        }

        if (!opts.confirm) {
          printResult({ dryRun: true, action: "create-table", tableName: opts.name, fields }, { pretty: globalOpts.pretty ?? false });
          return;
        }

        const { db } = buildConnection(globalOpts);
        const result = await db.schema.createTable(opts.name as string, fields);
        printResult(result, { pretty: globalOpts.pretty ?? false });
      } catch (err) {
        handleCliError(err);
      }
    });

  schema
    .command("add-fields")
    .description("Add fields to an existing table (requires --confirm to execute; dry-run by default)")
    .requiredOption("--table <name>", "Table name")
    .requiredOption("--fields <json>", "Fields to add as JSON array")
    .option("--confirm", "Execute the operation (without this flag, shows what would be added)")
    .action(async (opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { pretty: boolean };
      try {
        let fields: Field[];
        try {
          const parsed: unknown = JSON.parse(opts.fields);
          if (!Array.isArray(parsed)) throw new Error();
          fields = parsed as Field[];
        } catch {
          throw new Error("--fields must be a valid JSON array");
        }

        if (!opts.confirm) {
          printResult({ dryRun: true, action: "add-fields", tableName: opts.table, fields }, { pretty: globalOpts.pretty ?? false });
          return;
        }

        const { db } = buildConnection(globalOpts);
        const result = await db.schema.addFields(opts.table as string, fields);
        printResult(result, { pretty: globalOpts.pretty ?? false });
      } catch (err) {
        handleCliError(err);
      }
    });

  return schema;
}
