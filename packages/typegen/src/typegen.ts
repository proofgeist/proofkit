import path from "node:path";
import DataApi from "@proofkit/fmdapi";
import { FetchAdapter } from "@proofkit/fmdapi/adapters/fetch";
import { OttoAdapter, type OttoAPIKey } from "@proofkit/fmdapi/adapters/otto";
import { memoryStore } from "@proofkit/fmdapi/tokenStore/memory";
import chalk from "chalk";
import fs from "fs-extra";
import semver from "semver";
import { IndentationText, Project, ScriptKind } from "ts-morph";
import type { PackageJson } from "type-fest";
import type { z } from "zod/v4";
import { buildLayoutClient } from "./buildLayoutClient";
import { buildOverrideFile, buildSchema } from "./buildSchema";
import { commentHeader, defaultEnvNames, overrideCommentHeader } from "./constants";
import { generateODataTablesSingle } from "./fmodata/typegen";
import { formatAndSaveSourceFiles } from "./formatting";
import { getEnvValues, validateAndLogEnvValues } from "./getEnvValues";
import { getLayoutMetadata } from "./getLayoutMetadata";
import { type BuildSchemaArgs, typegenConfig, type typegenConfigSingle } from "./types";

type GlobalOptions = Omit<z.infer<typeof typegenConfig>, "config">;

export const generateTypedClients = async (
  config: z.infer<typeof typegenConfig>["config"],
  options?: GlobalOptions & { resetOverrides?: boolean; cwd?: string },
): Promise<
  | {
      successCount: number;
      errorCount: number;
      totalCount: number;
      outputPaths: string[];
    }
  | undefined
> => {
  const parsedConfig = typegenConfig.safeParse({ config });
  if (!parsedConfig.success) {
    console.log(chalk.red("ERROR: Invalid config"));
    console.log(config);
    console.dir(parsedConfig.error, { depth: null });
    return;
  }

  const configArray = Array.isArray(parsedConfig.data.config) ? parsedConfig.data.config : [parsedConfig.data.config];
  const postGenerateCommand = options?.postGenerateCommand ?? parsedConfig.data.postGenerateCommand;

  const { resetOverrides = false, cwd = process.cwd() } = options ?? {};

  let totalSuccessCount = 0;
  let totalErrorCount = 0;
  let totalCount = 0;
  const outputPaths: string[] = [];

  for (const singleConfig of configArray) {
    if (singleConfig.type === "fmdapi") {
      const result = await generateTypedClientsSingle(singleConfig, { resetOverrides, cwd, postGenerateCommand });
      if (result) {
        totalSuccessCount += result.successCount;
        totalErrorCount += result.errorCount;
        totalCount += result.totalCount;
        if (result.outputPath) {
          outputPaths.push(result.outputPath);
        }
      }
    } else if (singleConfig.type === "fmodata") {
      const outputPath = await generateODataTablesSingle(singleConfig, { cwd, postGenerateCommand });
      if (outputPath) {
        outputPaths.push(outputPath);
      }
    } else {
      console.log(chalk.red("ERROR: Invalid config type"));
    }
  }

  return { successCount: totalSuccessCount, errorCount: totalErrorCount, totalCount, outputPaths };
};

const generateTypedClientsSingle = async (
  config: Extract<z.infer<typeof typegenConfigSingle>, { type: "fmdapi" }>,
  options?: GlobalOptions & { resetOverrides?: boolean; cwd?: string },
) => {
  const {
    envNames,
    layouts,
    clientSuffix = "Client",

    generateClient = true,
    clearOldFiles = false,
    ...rest
  } = config;

  const { resetOverrides = false, cwd = process.cwd(), postGenerateCommand } = options ?? {};

  const validator = rest.validator ?? "zod/v4";

  const rootDir = path.join(cwd, rest.path ?? "schema");

  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8")) as PackageJson;
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
  } catch (_e) {
    // ignore
  }

  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
    },
  });

  const envValues = getEnvValues(envNames);
  const validationResult = validateAndLogEnvValues(envValues, envNames);

  if (!validationResult?.success) {
    return;
  }

  const { server, db, auth: validatedAuth } = validationResult;
  const auth: { apiKey: OttoAPIKey } | { username: string; password: string } =
    "apiKey" in validatedAuth ? { apiKey: validatedAuth.apiKey as OttoAPIKey } : validatedAuth;

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
              auth,
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
      type: validator === "zod" || validator === "zod/v4" || validator === "zod/v3" ? validator : "ts",
      strictNumbers: item.strictNumbers,
      webviewerScriptName: config?.type === "fmdapi" ? config.webviewerScriptName : undefined,
      envNames: (() => {
        const hasApiKey = envNames?.auth?.apiKey !== undefined;
        const hasUsername = envNames?.auth?.username !== undefined;

        return {
          auth: hasApiKey
            ? {
                apiKey: envNames?.auth?.apiKey ?? defaultEnvNames.apiKey,
                username: undefined,
                password: undefined,
              }
            : {
                apiKey: undefined,
                username: hasUsername && envNames?.auth ? envNames.auth.username : defaultEnvNames.username,
                password:
                  hasUsername && envNames?.auth && envNames.auth.password !== undefined
                    ? envNames.auth.password
                    : defaultEnvNames.password,
              },
          db: envNames?.db ?? defaultEnvNames.db,
          server: envNames?.server ?? defaultEnvNames.server,
        };
      })(),
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
        namedExports: [{ name: "client", alias: `${item.schemaName}${clientSuffix}` }],
        moduleSpecifier: `./${item.schemaName}`,
      });
    } else {
      console.log(chalk.yellow(`Skipping client generation for ${item.schemaName} because generateClient is false`));
    }
    successCount++;
  }

  // Only use built-in prettier formatting if no custom format command is provided
  if (postGenerateCommand) {
    // Just save without formatting - the custom command will format
    await project.save();
  } else {
    await formatAndSaveSourceFiles(project);
  }

  return { successCount, errorCount, totalCount, outputPath: rootDir };
};
