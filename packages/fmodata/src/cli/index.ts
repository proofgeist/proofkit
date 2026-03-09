import { Command } from "commander";
import { makeMetadataCommand } from "./commands/metadata";
import { makeQueryCommand } from "./commands/query";
import { makeSchemaCommand } from "./commands/schema";
import { makeScriptCommand } from "./commands/script";
import { makeWebhookCommand } from "./commands/webhook";
import { handleCliError } from "./utils/errors";
import { ENV_NAMES } from "./utils/connection";

const program = new Command();

program
  .name("fmodata")
  .description("FileMaker OData CLI — query, script, webhook, metadata, and schema operations")
  .version("0.1.0")
  .option("--server <url>", `FM server URL [env: ${ENV_NAMES.server}]`)
  .option("--database <name>", `FM database name [env: ${ENV_NAMES.db}]`)
  .option("--username <user>", `FM username [env: ${ENV_NAMES.username}]`)
  .option("--password <pass>", `FM password [env: ${ENV_NAMES.password}]`)
  .option("--api-key <key>", `OttoFMS API key [env: ${ENV_NAMES.apiKey}]`)
  .option("--table", "Output as table (default: JSON)", false);

program.addCommand(makeQueryCommand());
program.addCommand(makeScriptCommand());
program.addCommand(makeWebhookCommand());
program.addCommand(makeMetadataCommand());
program.addCommand(makeSchemaCommand());

program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (err) {
  // Commander throws CommanderError for --help/--version exits (non-zero but expected)
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: string }).code;
    if (code === "commander.helpDisplayed" || code === "commander.version") {
      process.exit(0);
    }
  }
  handleCliError(err);
}
