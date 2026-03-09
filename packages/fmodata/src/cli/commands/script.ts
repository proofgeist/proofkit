import { Command } from "commander";
import type { ConnectionOptions } from "../utils/connection";
import { buildConnection } from "../utils/connection";
import { handleCliError } from "../utils/errors";
import { printResult } from "../utils/output";

export function makeScriptCommand(): Command {
  const script = new Command("script").description("FileMaker script operations");

  script
    .command("run <scriptName>")
    .description("Run a FileMaker script")
    .option("--param <json>", "Script parameter as JSON string or plain value")
    .action(async (scriptName: string, opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { table: boolean };
      try {
        const { db } = buildConnection(globalOpts);
        let scriptParam: string | number | Record<string, unknown> | undefined;
        if (opts.param !== undefined) {
          try {
            scriptParam = JSON.parse(opts.param) as Record<string, unknown>;
          } catch {
            scriptParam = opts.param as string;
          }
        }
        const result = await db.runScript(scriptName, { scriptParam });
        printResult(result, { table: globalOpts.table ?? false });
      } catch (err) {
        handleCliError(err);
      }
    });

  return script;
}
