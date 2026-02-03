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

      // Extract Database from the adapter factory or resolved adapter.
      // config.database is the FileMakerAdapter factory function (has .database set on it).
      // adapter is the resolved adapter after getAdapter() calls the factory (also has .database).
      // Try both: adapter first (post-call), then config.database (pre-call / factory function).
      const configDb =
        (adapter as unknown as { database?: Database }).database ??
        (config.database as unknown as { database?: Database } | undefined)?.database;
      if (!configDb || typeof configDb !== "object" || !("schema" in configDb)) {
        logger.error(
          "Could not extract Database instance from adapter. Ensure your auth.ts uses FileMakerAdapter with an fmodata Database.",
        );
        process.exit(1);
      }
      let db: Database = configDb;

      // Extract database name and server URL for display
      const dbName: string = (configDb as unknown as { _getDatabaseName: string })
        ._getDatabaseName;
      const baseUrl: string | undefined = (
        configDb as unknown as { context?: { _getBaseUrl?: () => string } }
      ).context?._getBaseUrl?.();
      const serverUrl = baseUrl ? new URL(baseUrl).origin : undefined;

      // If CLI credential overrides are provided, construct a new connection
      if (options.username && options.password) {
        if (!dbName) {
          logger.error("Could not determine database filename from adapter config.");
          process.exit(1);
        }

        if (!baseUrl) {
          logger.error(
            "Could not determine server URL from adapter config. Ensure your auth.ts uses FMServerConnection.",
          );
          process.exit(1);
        }

        const connection = new FMServerConnection({
          serverUrl: serverUrl as string,
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
        prettyPrintMigrationPlan(migrationPlan, { serverUrl, fileName: dbName });

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

      try {
        await executeMigration(db, migrationPlan);
        logger.info("Migration applied successfully.");
      } catch {
        process.exit(1);
      }
    });
  await program.parseAsync(process.argv);
  process.exit(0);
}

main().catch((err) => {
  logger.error(err.message ?? err);
  process.exit(1);
});
