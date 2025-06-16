#!/usr/bin/env node
import { program } from "@commander-js/extra-typings";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { confirm } from "@clack/prompts";
import { parse } from "jsonc-parser";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { typegenConfig } from "./types";
import { generateTypedClients } from "./typegen";

const defaultConfigPaths = [
  "proofkit-typegen.config.jsonc",
  "proofkit-typegen.config.json",
];
const oldConfigPaths = ["fmschema.config.mjs", "fmschema.config.js"];
type ConfigArgs = {
  configLocation: string;
  resetOverrides?: boolean;
};

function init({ configLocation }: ConfigArgs) {
  console.log();
  if (fs.existsSync(configLocation)) {
    console.log(
      chalk.yellow(`⚠️ ${path.basename(configLocation)} already exists`),
    );
  } else {
    const stubFile = fs.readFileSync(
      path.resolve(
        typeof __dirname !== "undefined"
          ? __dirname
          : path.dirname(fileURLToPath(import.meta.url)),
        "../../stubs/proofkit-typegen.config.jsonc",
      ),
      "utf8",
    );
    fs.writeFileSync(configLocation, stubFile, "utf8");
    console.log(`✅ Created config file: ${path.basename(configLocation)}`);
  }
}

async function runCodegen({
  configLocation,
  resetOverrides = false,
}: ConfigArgs) {
  if (!fs.existsSync(configLocation)) {
    // but check if they have the old config and just need to upgrade...
    let hasOldConfig = false;
    for (const oldConfigPath of oldConfigPaths) {
      if (fs.existsSync(oldConfigPath)) {
        hasOldConfig = true;
        break;
      }
    }
    if (hasOldConfig) {
      console.log(
        chalk.yellow(
          "⚠️ You have an old config file from the @proofgeist/fmdapi package. Please upgrade to @proofkit/typegen by running `npx @proofgeist/fmdapi@latest upgrade`",
        ),
      );
      process.exit(1);
    } else {
      console.error(
        chalk.red(
          `Could not find ${path.basename(
            configLocation,
          )} at the root of your project.`,
        ),
      );
      console.log();

      const runInitNow = await confirm({
        message: "Would you like to initialize a new config file?",
        initialValue: true,
        active: "Yes",
        inactive: "No",
      });
      if (runInitNow) {
        init({ configLocation });
        process.exit(0);
      }
      process.exit(1);
    }
  }
  await fs.access(configLocation, fs.constants.R_OK).catch(() => {
    console.error(
      chalk.red(
        `You do not have read access to ${path.basename(
          configLocation,
        )} at the root of your project.`,
      ),
    );
    return process.exit(1);
  });

  console.log(`🔍 Reading config from ${configLocation}`);

  const configRaw = fs.readFileSync(configLocation, "utf8");
  const configParsed = typegenConfig.safeParse(parse(configRaw));

  if (!configParsed.success) {
    console.error(
      chalk.red(
        `Error reading the config object from ${path.basename(
          configLocation,
        )}.`,
      ),
    );
    console.error(configParsed.error);
    return process.exit(1);
  }

  const result = await generateTypedClients(configParsed.data.config, {
    resetOverrides,
  }).catch((err: unknown) => {
    console.error(err);
    return process.exit(1);
  });
  if (result) {
    if (result.totalCount === 0) {
    } else if (result.totalCount === result.successCount) {
      console.log(
        `✅ Generated ${result.successCount} layout${result.successCount === 1 ? "" : "s"}`,
      );
    } else if (result.errorCount === result.totalCount) {
      console.log(`❌ Failed to generate any layouts`);
    } else {
      console.log(
        `⚠️ Generated ${result.successCount} of ${result.totalCount} layouts`,
      );
    }
  }
}

program
  .command("generate", { isDefault: true })
  .option("--config <filename>", "optional config file name")
  .option("--env-path <path>", "optional path to your .env file")
  .option(
    "--reset-overrides",
    "Recreate the overrides file(s), even if they already exist. Most useful when upgrading from @proofgeist/fmdapi",
    false,
  )
  .option(
    "--skip-env-check",
    "Ignore loading environment variables from a file.",
    false,
  )
  .action(async (options) => {
    // check if options.config resolves to a file
    {
    }
    const configPath = getConfigPath(options.config);
    const configLocation = path.toNamespacedPath(
      path.resolve(configPath ?? defaultConfigPaths[0] ?? ""),
    );

    if (!options.skipEnvCheck) {
      parseEnvs(options.envPath);
    }

    // default command
    await runCodegen({
      configLocation,
      resetOverrides: options.resetOverrides,
    });
  });

program
  .command("init")
  .option("--config <filename>", "optional config file name")
  .action(async (options) => {
    const configLocation = path.toNamespacedPath(
      path.resolve(options.config ?? defaultConfigPaths[0] ?? ""),
    );
    console.log(configLocation);
    init({ configLocation });
  });
program.parse();

function parseEnvs(envPath?: string | undefined) {
  let actualEnvPath = envPath;
  if (!actualEnvPath || !fs.existsSync(actualEnvPath)) {
    const possiblePaths = [".env.local", ".env"];
    for (const path of possiblePaths) {
      if (fs.existsSync(path)) {
        actualEnvPath = path;
        break;
      }
    }
  }

  const envRes = config({ path: actualEnvPath });
  if (envRes.error) {
    console.log(
      chalk.red(
        `Could not resolve your environment variables.\n${envRes.error.message}\n`,
      ),
    );
    throw new Error("Could not resolve your environment variables.");
  }
}

function getConfigPath(configPath?: string): string | null {
  if (configPath) {
    // If a config path is specified, check if it exists
    try {
      fs.accessSync(configPath, fs.constants.F_OK);
      return configPath;
    } catch (e) {
      // If it doesn't exist, continue to default paths
    }
  }

  // Try default paths in order
  for (const path of defaultConfigPaths) {
    try {
      fs.accessSync(path, fs.constants.F_OK);
      return path;
    } catch (e) {
      // If path doesn't exist, try the next one
    }
  }
  return null;
}
