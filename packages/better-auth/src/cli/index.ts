#!/usr/bin/env node --no-warnings
import { Command } from "@commander-js/extra-typings";
import fs from "fs-extra";

import {
  executeMigration,
  planMigration,
  prettyPrintMigrationPlan,
} from "../migrate";
import { getAdapter, getAuthTables } from "better-auth/db";
import { getConfig } from "../better-auth-cli/utils/get-config";
import { logger } from "better-auth";
import prompts from "prompts";
import chalk from "chalk";
import { AdapterOptions } from "../adapter";
import { createRawFetch } from "../odata";
import "dotenv/config";

async function main() {
  const program = new Command();

  program
    .command("migrate", { isDefault: true })
    .option(
      "--cwd <path>",
      "Path to the current working directory",
      process.cwd(),
    )
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
        logger.error(
          "This generator is only compatible with the FileMaker adapter.",
        );
        return;
      }

      const betterAuthSchema = getAuthTables(config);

      const adapterConfig = (adapter.options as AdapterOptions).config;
      const { fetch } = createRawFetch({
        ...adapterConfig.odata,
        auth:
          // If the username and password are provided in the CLI, use them to authenticate instead of what's in the config file.
          options.username && options.password
            ? {
                username: options.username,
                password: options.password,
              }
            : adapterConfig.odata.auth,
        logging: "verbose", // Enable logging for CLI operations
      });

      const migrationPlan = await planMigration(
        fetch,
        betterAuthSchema,
        adapterConfig.odata.database,
      );

      if (migrationPlan.length === 0) {
        logger.info("No changes to apply. Database is up to date.");
        return;
      }

      if (!options.yes) {
        prettyPrintMigrationPlan(migrationPlan);

        if (migrationPlan.length > 0) {
          console.log(
            chalk.gray(
              "💡 Tip: You can use the --yes flag to skip this confirmation.",
            ),
          );
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

      await executeMigration(fetch, migrationPlan);

      logger.info("Migration applied successfully.");
    });
  await program.parseAsync(process.argv);
  process.exit(0);
}

main().catch(console.error);
