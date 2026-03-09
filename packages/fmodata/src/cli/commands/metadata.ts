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
    .action(async (opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { table: boolean };
      try {
        const { db } = buildConnection(globalOpts);
        let result: unknown;
        if (opts.format === "xml") {
          result = await db.getMetadata({ format: "xml" });
        } else {
          result = await db.getMetadata({ format: "json" });
        }
        printResult(result, { table: globalOpts.table ?? false });
      } catch (err) {
        handleCliError(err);
      }
    });

  metadata
    .command("tables")
    .description("List all table names in the database")
    .action(async (_opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { table: boolean };
      try {
        const { db } = buildConnection(globalOpts);
        const tables = await db.listTableNames();
        printResult(tables, { table: globalOpts.table ?? false });
      } catch (err) {
        handleCliError(err);
      }
    });

  return metadata;
}
