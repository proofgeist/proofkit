import { Project, ScriptKind } from "ts-morph";

import chalk from "chalk";
import { OttoAdapter, type OttoAPIKey } from "@proofkit/fmdapi/adapters/otto";
import DataApi from "@proofkit/fmdapi";
import { FetchAdapter } from "@proofkit/fmdapi/adapters/fetch";
import { memoryStore } from "@proofkit/fmdapi/tokenStore/memory";
import fs from "fs-extra";
import path from "path";
import {
  typegenConfig,
  typegenConfigSingle,
  type BuildSchemaArgs,
} from "./types";
import {
  commentHeader,
  defaultEnvNames,
  overrideCommentHeader,
} from "./constants";
import { getLayoutMetadata } from "./getLayoutMetadata";
import { buildOverrideFile, buildSchema } from "./buildSchema";
import { buildLayoutClient } from "./buildLayoutClient";
import { z } from "zod/v4";
import { formatAndSaveSourceFiles } from "./formatting";
import { type PackageJson } from "type-fest";
import semver from "semver";

export const generateTypedClients = async (
  config: z.infer<typeof typegenConfig>["config"],
  options?: { resetOverrides?: boolean; cwd?: string },
): Promise<{
  successCount: number;
  errorCount: number;
  totalCount: number;
} | void> => {
  const parsedConfig = typegenConfig.safeParse({ config });
  if (!parsedConfig.success) {
    console.log(chalk.red("ERROR: Invalid config"));
    console.log(config);
    console.dir(parsedConfig.error, { depth: null });
    return;
  }

  const configArray = Array.isArray(parsedConfig.data.config)
    ? parsedConfig.data.config
    : [parsedConfig.data.config];

  for (const option of configArray) {
    if (option.type === "fmdapi") {
      await generateTypedClientsSingle(option, options);
    } else {
      console.log(
        chalk.yellow("WARNING: Unsupported config type: " + option.type),
      );
    }
  }
};

const generateTypedClientsSingle = async (
  config: Extract<z.infer<typeof typegenConfigSingle>, { type: "fmdapi" }>,
  options?: { resetOverrides?: boolean; cwd?: string },
) => {
  const {
    envNames,
    layouts,
    clientSuffix = "Client",

    generateClient = true,
    clearOldFiles = false,
    ...rest
  } = config;

  const { resetOverrides = false, cwd = process.cwd() } = options ?? {};

  const validator = rest.validator ?? "zod/v4";

  const rootDir = path.join(cwd, rest.path ?? "schema");

  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(cwd, "package.json"), "utf8"),
    ) as PackageJson;
    const fmdapiVersion = packageJson.dependencies?.["@proofkit/fmdapi"];
    if (fmdapiVersion && semver.valid(fmdapiVersion)) {
      const isAtLeast501 = semver.satisfies(fmdapiVersion, ">=5.0.1");
      if (!isAtLeast501) {
        console.log(
          chalk.yellow(
            "WARNING: @proofkit/typegen will generate types only compatible with @proofkit/fmdapi version 5.0.1 or higher. Please update to the latest version of @proofkit/fmdapi",
          ),
        );
      }
    }
  } catch (e) {
    // ignore
  }

  const project = new Project({});

  const server = process.env[envNames?.server ?? defaultEnvNames.server];
  const db = process.env[envNames?.db ?? defaultEnvNames.db];
  const apiKey =
    (envNames?.auth && "apiKey" in envNames.auth
      ? process.env[envNames.auth.apiKey ?? defaultEnvNames.apiKey]
      : undefined) ?? process.env[defaultEnvNames.apiKey];
  const username =
    (envNames?.auth && "username" in envNames.auth
      ? process.env[envNames.auth.username ?? defaultEnvNames.username]
      : undefined) ?? process.env[defaultEnvNames.username];
  const password =
    (envNames?.auth && "password" in envNames.auth
      ? process.env[envNames.auth.password ?? defaultEnvNames.password]
      : undefined) ?? process.env[defaultEnvNames.password];

  const auth: { apiKey: OttoAPIKey } | { username: string; password: string } =
    apiKey
      ? { apiKey: apiKey as OttoAPIKey }
      : { username: username ?? "", password: password ?? "" };

  if (!server || !db || (!apiKey && !username)) {
    console.log(chalk.red("ERROR: Could not get all required config values"));
    console.log("Ensure the following environment variables are set:");
    if (!server) console.log(`${envNames?.server ?? defaultEnvNames.server}`);
    if (!db) console.log(`${envNames?.db ?? defaultEnvNames.db}`);

    if (!apiKey) {
      // Determine the names to display in the error message
      const apiKeyNameToLog =
        envNames?.auth && "apiKey" in envNames.auth && envNames.auth.apiKey
          ? envNames.auth.apiKey
          : defaultEnvNames.apiKey;
      const usernameNameToLog =
        envNames?.auth && "username" in envNames.auth && envNames.auth.username
          ? envNames.auth.username
          : defaultEnvNames.username;
      const passwordNameToLog =
        envNames?.auth && "password" in envNames.auth && envNames.auth.password
          ? envNames.auth.password
          : defaultEnvNames.password;

      console.log(
        `${apiKeyNameToLog} (or ${usernameNameToLog} and ${passwordNameToLog})`,
      );
    }

    console.log();
    return;
  }

  await fs.ensureDir(rootDir);
  if (clearOldFiles) {
    fs.emptyDirSync(path.join(rootDir, "client"));
    fs.emptyDirSync(path.join(rootDir, "generated"));
  }
  const clientIndexFilePath = path.join(rootDir, "client", "index.ts");
  fs.rmSync(clientIndexFilePath, { force: true }); // ensure clean slate for this file

  let successCount = 0;
  let errorCount = 0;
  let totalCount = 0;

  for await (const item of layouts) {
    totalCount++;
    const client =
      "apiKey" in auth
        ? DataApi({
            adapter: new OttoAdapter({ auth, server, db }),
            layout: item.layoutName,
          })
        : DataApi({
            adapter: new FetchAdapter({
              auth: auth as any,
              server,
              db,
              tokenStore: memoryStore(),
            }),
            layout: item.layoutName,
          });
    const result = await getLayoutMetadata({
      client,
      valueLists: item.valueLists,
    });

    if (!result) {
      errorCount++;
      continue;
    }

    const { schema, portalSchema, valueLists } = result;
    const args: BuildSchemaArgs = {
      schemaName: item.schemaName,
      schema,
      layoutName: item.layoutName,
      portalSchema,
      valueLists,
      type:
        validator === "zod" || validator === "zod/v4" || validator === "zod/v3"
          ? validator
          : "ts",
      strictNumbers: item.strictNumbers,
      webviewerScriptName:
        config?.type === "fmdapi" ? config.webviewerScriptName : undefined,
      envNames: {
        auth:
          "apiKey" in auth
            ? {
                apiKey:
                  envNames?.auth && "apiKey" in envNames.auth
                    ? (envNames.auth.apiKey as OttoAPIKey)
                    : (defaultEnvNames.apiKey as OttoAPIKey),
              }
            : {
                username:
                  envNames?.auth && "username" in envNames.auth
                    ? envNames.auth.username
                    : defaultEnvNames.username,
                password:
                  envNames?.auth && "password" in envNames.auth
                    ? envNames.auth.password
                    : defaultEnvNames.password,
              },
        db: envNames?.db ?? defaultEnvNames.db,
        server: envNames?.server ?? defaultEnvNames.server,
      },
    };
    const schemaFile = project.createSourceFile(
      path.join(rootDir, "generated", `${item.schemaName}.ts`),
      { leadingTrivia: commentHeader },
      {
        overwrite: true,
        scriptKind: ScriptKind.TS,
      },
    );
    buildSchema(schemaFile, args);

    const overrideFilePath = path.join(rootDir, `${item.schemaName}.ts`);
    if (!fs.existsSync(overrideFilePath) || resetOverrides) {
      // only build the override file if it doesn't exist
      const overrideFile = project.createSourceFile(
        overrideFilePath,
        {
          leadingTrivia: overrideCommentHeader,
        },
        {
          overwrite: true,
          scriptKind: ScriptKind.TS,
        },
      );
      buildOverrideFile(overrideFile, schemaFile, args);
    }

    if (item.generateClient ?? generateClient) {
      await fs.ensureDir(path.join(rootDir, "client"));
      const layoutClientFile = project.createSourceFile(
        path.join(rootDir, "client", `${item.schemaName}.ts`),
        { leadingTrivia: commentHeader },
        {
          overwrite: true,
          scriptKind: ScriptKind.TS,
        },
      );
      buildLayoutClient(layoutClientFile, args);

      await fs.ensureFile(clientIndexFilePath);
      const clientIndexFile = project.addSourceFileAtPath(clientIndexFilePath);
      clientIndexFile.addExportDeclaration({
        namedExports: [
          { name: "client", alias: `${item.schemaName}${clientSuffix}` },
        ],
        moduleSpecifier: `./${item.schemaName}`,
      });
    } else {
      console.log(
        chalk.yellow(
          `Skipping client generation for ${item.schemaName} because generateClient is false`,
        ),
      );
    }
    successCount++;
  }

  await formatAndSaveSourceFiles(project);

  return { successCount, errorCount, totalCount };
};
