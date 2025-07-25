import * as p from "@clack/prompts";
import chalk from "chalk";
import { SemVer } from "semver";
import { type z } from "zod/v4";

import {
  createDataAPIKey,
  getOttoFMSToken,
  listAPIKeys,
  listFiles,
} from "~/cli/ottofms.js";
import { abortIfCancel } from "~/cli/utils.js";
import { addToFmschemaConfig } from "~/generators/fmdapi.js";
import { fetchServerVersions } from "~/helpers/version-fetcher.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";
import { addToEnv } from "~/utils/addToEnvs.js";
import {
  getSettings,
  setSettings,
  type dataSourceSchema,
} from "~/utils/parseSettings.js";
import { formatAndSaveSourceFiles, getNewProject } from "~/utils/ts-morph.js";
import { validateAppName } from "~/utils/validateAppName.js";
import { runAddSchemaAction } from "../fmschema.js";
import { deployDemoFile, filename } from "./deploy-demo-file.js";

export async function promptForFileMakerDataSource({
  projectDir,
  ...opts
}: {
  projectDir: string;
  name?: string;
  server?: string;
  adminApiKey?: string;
  fileName?: string;
  dataApiKey?: string;
  layoutName?: string;
  schemaName?: string;
}) {
  const settings = getSettings();

  const existingFmDataSourceNames = settings.dataSources
    .filter((ds) => ds.type === "fm")
    .map((ds) => ds.name);

  const server = await getValidFileMakerServerUrl(opts.server);

  const canDoBrowserLogin =
    server.ottoVersion && server.ottoVersion.compare(new SemVer("4.7.0")) > 0;

  if (!canDoBrowserLogin && !opts.adminApiKey) {
    return p.cancel(
      "OttoFMS 4.7.0 or later is required to auto-login with this CLI. Please install/upgrade OttoFMS on your server, or pass an Admin API key with the --adminApiKey flag then try again"
    );
  }

  const token =
    opts.adminApiKey || (await getOttoFMSToken({ url: server.url })).token;

  const fileList = await listFiles({ url: server.url, token });
  const demoFileExists = fileList
    .map((f) => f.filename.replace(".fmp12", ""))
    .includes(filename.replace(".fmp12", ""));
  let fmFile = opts.fileName;
  while (true) {
    fmFile =
      opts.fileName ||
      abortIfCancel(
        await p.select({
          message: `Which file would you like to connect to? ${chalk.dim(`(TIP: Select the file where your data is stored)`)}`,
          maxItems: 10,
          options: [
            {
              value: "$deployDemoFile",
              label: "Deploy NEW ProofKit Demo File",
              hint: "Use OttoFMS to deploy a new file for testing",
            },
            ...fileList
              .sort((a, b) => a.filename.localeCompare(b.filename))
              .map((file) => ({
                value: file.filename,
                label: file.filename,
              })),
          ],
        })
      );

    if (fmFile !== "$deployDemoFile") break;

    if (demoFileExists) {
      const replace = abortIfCancel(
        await p.confirm({
          message:
            "The demo file already exists, do you want to replace it with a fresh copy?",
          active: "Yes, replace",
          inactive: "No, select another file",
          initialValue: false,
        })
      );
      if (replace) break;
    } else {
      break;
    }
  }

  if (!fmFile) throw new Error("No file selected");

  let dataApiKey = opts.dataApiKey;
  if (fmFile === "$deployDemoFile") {
    const { apiKey } = await deployDemoFile({
      url: server.url,
      token,
      operation: demoFileExists ? "replace" : "install",
    });
    dataApiKey = apiKey;
    fmFile = filename;
    opts.layoutName = opts.layoutName ?? "API_Contacts";
    opts.schemaName = opts.schemaName ?? "Contacts";
  } else {
    const allApiKeys = await listAPIKeys({ url: server.url, token });
    const thisFileApiKeys = allApiKeys.filter((key) => key.database === fmFile);

    if (!dataApiKey && thisFileApiKeys.length > 0) {
      const selectedKey = abortIfCancel(
        await p.select({
          message: `Which OttoFMS Data API key would you like to use? ${chalk.dim(`(This determines the access that you'll have to the data in this file)`)}`,
          options: [
            ...thisFileApiKeys.map((key) => ({
              value: key.key,
              label: `${chalk.bold(key.label)} - ${key.user}`,
              hint: `${key.key.slice(0, 5)}...${key.key.slice(-4)}`,
            })),
            {
              value: "create",
              label: "Create a new API key",
              hint: "Requires FileMaker credentials for this file",
            },
          ],
        })
      );
      if (typeof selectedKey !== "string") throw new Error("Invalid key");
      if (selectedKey !== "create") dataApiKey = selectedKey;
    }

    if (!dataApiKey) {
      // data api was not provided, prompt to create a new one
      const resp = await createDataAPIKey({
        filename: fmFile,
        url: server.url,
      });
      dataApiKey = resp.apiKey;
    }
  }
  if (!dataApiKey) throw new Error("No API key");

  const name =
    existingFmDataSourceNames.length === 0
      ? "filemaker"
      : (opts.name ??
        abortIfCancel(
          await p.text({
            message: "What do you want to call this data source?",
            validate: (value) => {
              if (value === "filemaker") return "That name is reserved";

              // require name to be unique
              if (existingFmDataSourceNames?.includes(value))
                return "That name is already in use in this project, pick something unique";

              // require name to be alphanumeric, lowercase, etc
              return validateAppName(value);
            },
          })
        ));

  const newDataSource: z.infer<typeof dataSourceSchema> = {
    type: "fm",
    name,
    envNames:
      name === "filemaker"
        ? {
            database: "FM_DATABASE",
            server: "FM_SERVER",
            apiKey: "OTTO_API_KEY",
          }
        : {
            database: `${name.toUpperCase()}_FM_DATABASE`,
            server: `${name.toUpperCase()}_FM_SERVER`,
            apiKey: `${name.toUpperCase()}_OTTO_API_KEY`,
          },
  };

  const project = getNewProject(projectDir);

  const schemaFile = await addToEnv({
    projectDir,
    project,
    envs: [
      {
        name: newDataSource.envNames.database,
        zodValue: `z.string().endsWith(".fmp12")`,
        defaultValue: fmFile,
        type: "server",
      },
      {
        name: newDataSource.envNames.server,
        zodValue: `z.string().url()`,
        type: "server",
        defaultValue: server.url.origin,
      },
      {
        name: newDataSource.envNames.apiKey,
        zodValue: `z.string().startsWith("dk_") as z.ZodType<OttoAPIKey>`,
        type: "server",
        defaultValue: dataApiKey,
      },
    ],
  });

  const fmdapiImport = schemaFile.getImportDeclaration(
    (imp) => imp.getModuleSpecifierValue() === "@proofkit/fmdapi"
  );
  if (fmdapiImport) {
    fmdapiImport
      .getNamedImports()
      .find((imp) => imp.getName() === "OttoAPIKey")
      ?.remove();
    fmdapiImport.addNamedImport({ name: "OttoAPIKey", isTypeOnly: true });
  } else {
    schemaFile.addImportDeclaration({
      namedImports: [{ name: "OttoAPIKey", isTypeOnly: true }],
      moduleSpecifier: "@proofkit/fmdapi",
    });
  }

  addPackageDependency({
    projectDir,
    dependencies: ["@proofkit/fmdapi"],
    devMode: false,
  });

  settings.dataSources.push(newDataSource);
  setSettings(settings);

  addToFmschemaConfig({
    dataSourceName: name,
    envNames: name === "filemaker" ? undefined : newDataSource.envNames,
  });

  await formatAndSaveSourceFiles(project);

  // now prompt for layout
  await runAddSchemaAction({
    settings,
    sourceName: name,
    projectDir,
    layoutName: opts.layoutName,
    schemaName: opts.schemaName,
    valueLists: "allowEmpty",
  });
}

async function getValidFileMakerServerUrl(
  defaultServerUrl?: string | undefined
): Promise<{
  url: URL;
  fmsVersion: SemVer;
  ottoVersion: SemVer | null;
}> {
  const spinner = p.spinner();
  let url: URL | null = null;
  let fmsVersion: SemVer | null = null;
  let ottoVersion: SemVer | null = null;

  while (fmsVersion === null) {
    const serverUrl =
      defaultServerUrl ??
      abortIfCancel(
        await p.text({
          message: `What is the URL of your FileMaker Server?\n${chalk.cyan("TIP: You can copy any valid path on the server and paste it here.")}`,
          validate: (value) => {
            try {
              // try to make sure the url is https
              if (!value.startsWith("https://")) {
                if (value.startsWith("http://")) {
                  value = value.replace("http://", "https://");
                } else {
                  value = `https://${value}`;
                }
              }

              // try to make sure the url is valid
              new URL(value);
              return;
            } catch {
              return "Please enter a valid URL";
            }
          },
        })
      );

    try {
      url = new URL(serverUrl);
    } catch {
      p.log.error(`Invalid URL: ${serverUrl.toString()}`);
      continue;
    }

    spinner.start("Validating Server URL...");

    // check for FileMaker and Otto versions
    const { fmsInfo, ottoInfo } = await fetchServerVersions({
      url: url.origin,
    });

    spinner.stop();

    fmsVersion = new SemVer(fmsInfo.ServerVersion.split(" ")[0]!) ?? null;
    ottoVersion = new SemVer(ottoInfo?.Otto.version ?? "") ?? null;
    defaultServerUrl = undefined;
  }

  if (url === null) throw new Error("Unable to get FileMaker Server URL");

  p.note(`🎉 FileMaker Server version ${fmsVersion} detected \n
    ${!!ottoVersion ? `🎉 OttoFMS version ${ottoVersion} detected` : "❌ OttoFMS not detected"}`);

  return { url, ottoVersion, fmsVersion };
}
