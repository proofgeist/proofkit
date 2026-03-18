import { Command } from "commander";
import type { ConnectionOptions } from "../utils/connection";
import { buildConnection } from "../utils/connection";
import { handleCliError } from "../utils/errors";
import { printResult } from "../utils/output";

export function makeMetadataCommand(): Command {
  const metadata = new Command("metadata").description("FileMaker OData metadata operations");

  metadata
    .command("get")
    .description("Get OData metadata for the database")
    .option("--format <format>", "Output format: json or xml", "json")
    .option("--table <table>", "Filter metadata to a specific table")
    .action(async (opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { pretty: boolean };
      try {
        const { db } = buildConnection(globalOpts);
        let result: unknown;
        if (opts.format === "xml") {
          result = await db.getMetadata({ format: "xml", tableName: opts.table });
        } else {
          result = await db.getMetadata({ format: "json", tableName: opts.table });
        }
        printResult(result, { pretty: globalOpts.pretty ?? false });
      } catch (err) {
        handleCliError(err);
      }
    });

  metadata
    .command("tables")
    .description("List all table names in the database")
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

  return metadata;
}
