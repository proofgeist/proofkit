#!/usr/bin/env node --no-warnings
import { Command } from "@commander-js/extra-typings";
import type { Database } from "@proofkit/fmodata";
import { FMServerConnection } from "@proofkit/fmodata";
import { logger } from "better-auth";
import { getAdapter, getSchema } from "better-auth/db";
import chalk from "chalk";
import fs from "fs-extra";
import prompts from "prompts";
import { getConfig } from "../better-auth-cli/utils/get-config";
import { executeMigration, planMigration, prettyPrintMigrationPlan } from "../migrate";
import "dotenv/config";

async function main() {
  const program = new Command();

  program
    .command("migrate", { isDefault: true })
    .option("--cwd <path>", "Path to the current working directory", process.cwd())
    .option("--config <path>", "Path to the config file")
    .option("-u, --username <username>", "Full Access Username")
    .option("-p, --password <password>", "Full Access Password")
    .option("-y, --yes", "Skip confirmation", false)

    .action(async (options) => {
      const cwd = options.cwd;
      if (!fs.existsSync(cwd)) {
        logger.error(`The directory "${cwd}" does not exist.`);
        process.exit(1);
      }

      const config = await getConfig({
        cwd,
        configPath: options.config,
      });
      if (!config) {
        logger.error(
          "No configuration file found. Add a `auth.ts` file to your project or pass the path to the configuration file using the `--config` flag.",
        );
        return;
      }

      const adapter = await getAdapter(config).catch((e) => {
        logger.error(e.message);
        process.exit(1);
      });

      if (adapter.id !== "filemaker") {
        logger.error("This generator is only compatible with the FileMaker adapter.");
        return;
      }

      const betterAuthSchema = getSchema(config);

      // Extract Database from the adapter
      const configDb = (adapter as unknown as { database: Database }).database;
      let db: Database = configDb;

      // If CLI credential overrides are provided, construct a new connection
      if (options.username && options.password) {
        // biome-ignore lint/suspicious/noExplicitAny: accessing internal getter
        const dbName: string = (configDb as any)._getDatabaseName;
        if (!dbName) {
          logger.error("Could not determine database filename from adapter config.");
          process.exit(1);
        }

        // Build the server URL from the existing db's context
        // biome-ignore lint/suspicious/noExplicitAny: accessing internal method
        const baseUrl: string | undefined = (configDb as any).context?._getBaseUrl?.();

        if (!baseUrl) {
          logger.error(
            "Could not determine server URL from adapter config. Ensure your auth.ts uses FMServerConnection.",
          );
          process.exit(1);
        }

        // Extract server origin from base URL (e.g. "https://myserver.com/fmi/odata/v4" -> "https://myserver.com")
        const serverUrl = new URL(baseUrl).origin;

        const connection = new FMServerConnection({
          serverUrl,
          auth: {
            username: options.username,
            password: options.password,
          },
        });

        db = connection.database(dbName);
      }

      const migrationPlan = await planMigration(db, betterAuthSchema);

      if (migrationPlan.length === 0) {
        logger.info("No changes to apply. Database is up to date.");
        return;
      }

      if (!options.yes) {
        prettyPrintMigrationPlan(migrationPlan);

        if (migrationPlan.length > 0) {
          console.log(chalk.gray("💡 Tip: You can use the --yes flag to skip this confirmation."));
        }

        const { confirm } = await prompts({
          type: "confirm",
          name: "confirm",
          message: "Apply the above changes to your database?",
        });
        if (!confirm) {
          logger.error("Schema changes not applied.");
          return;
        }
      }

      await executeMigration(db, migrationPlan);

      logger.info("Migration applied successfully.");
    });
  await program.parseAsync(process.argv);
  process.exit(0);
}

main().catch(console.error);
