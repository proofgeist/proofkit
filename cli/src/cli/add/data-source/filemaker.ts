import * as p from "@clack/prompts";
import chalk from "chalk";
import { SemVer } from "semver";
import { type z } from "zod";

import {
  createDataAPIKey,
  getOttoFMSToken,
  listAPIKeys,
  listFiles,
} from "~/cli/ottofms.js";
import { addToFmschemaConfig } from "~/generators/fmdapi.js";
import { fetchServerVersions } from "~/helpers/version-fetcher.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";
import { addToEnv } from "~/utils/addToEnvs.js";
import {
  parseSettings,
  setSettings,
  type dataSourceSchema,
} from "~/utils/parseSettings.js";
import { formatAndSaveSourceFiles, getNewProject } from "~/utils/ts-morph.js";
import { validateAppName } from "~/utils/validateAppName.js";
import { runAddSchemaAction } from "../fmschema.js";

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
  const settings = parseSettings(projectDir);

  const existingFmDataSourceNames = settings.dataSources
    .filter((ds) => ds.type === "fm")
    .map((ds) => ds.name);

  const server = await getValidFileMakerServerUrl(opts.server);

  const canDoBrowserLogin =
    server.ottoVersion && server.ottoVersion.compare(new SemVer("4.7.0")) > 0;

  if (!canDoBrowserLogin && !opts.adminApiKey) {
    p.log.error(
      "OttoFMS 4.7.0 or later is required to auto-login with this CLI. Please install/upgrade OttoFMS on your server, or pass an Admin API key with the --adminApiKey flag then try again"
    );
  }

  const token =
    opts.adminApiKey || (await getOttoFMSToken({ url: server.url })).token;

  const fileList = await listFiles({ url: server.url, token });
  const selectedFile =
    opts.fileName ||
    (await p.select({
      message: `Which file would you like to connect to? ${chalk.dim(`(TIP: Select the file where your data is stored)`)}`,
      maxItems: 10,
      options: fileList.map((file) => ({
        value: file.filename,
        label: file.filename,
      })),
    }));
  if (typeof selectedFile !== "string") throw new Error("Invalid file");
  const fmFile = selectedFile;

  const allApiKeys = await listAPIKeys({ url: server.url, token });
  const thisFileApiKeys = allApiKeys.filter((key) => key.database === fmFile);

  let dataApiKey = opts.dataApiKey;
  if (!dataApiKey && thisFileApiKeys.length > 0) {
    const selectedKey = await p.select({
      message: "Which API key would you like to use?",
      options: [
        ...thisFileApiKeys.map((key) => ({
          value: key.key,
          label: `${chalk.bold(key.label)} - ${key.user}`,
          hint: key.key,
        })),
        {
          value: "create",
          label: "Create a new API key",
          hint: "Requires FileMaker credentials for this file",
        },
      ],
    });
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

  if (!dataApiKey) throw new Error("No API key");

  const name =
    existingFmDataSourceNames.length === 0
      ? "filemaker"
      : opts.name ??
        (
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
        ).toString();

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

  const schemaFile = addToEnv({
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
    (imp) => imp.getModuleSpecifierValue() === "@proofgeist/fmdapi"
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
      moduleSpecifier: "@proofgeist/fmdapi",
    });
  }

  addPackageDependency({
    projectDir,
    dependencies: ["@proofgeist/fmdapi"],
    devMode: false,
  });

  settings.dataSources.push(newDataSource);
  setSettings(settings, projectDir);

  addToFmschemaConfig({
    projectDir,
    dataSourceName: name,
    project,
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

  console.log("done");
}

async function getValidFileMakerServerUrl(
  defaultServerUrl?: string | undefined
): Promise<{
  url: URL;
  fmsVersion: SemVer;
  ottoVersion: SemVer | null;
}> {
  let url: URL | null = null;
  let fmsVersion: SemVer | null = null;
  let ottoVersion: SemVer | null = null;

  while (fmsVersion === null) {
    const serverUrl =
      defaultServerUrl ??
      (await p.text({
        message: "What is the URL of your FileMaker Server?",
        validate: (value) => {
          try {
            if (!value.startsWith("http"))
              return "URL must start with https://";
            const url = new URL(value);
            p.log.info(url.protocol);
            return;
          } catch {
            return "Please enter a valid URL";
          }
        },
      }));

    if (p.isCancel(serverUrl)) {
      p.cancel("Cancelled");
      process.exit(1);
    }

    try {
      url = new URL(serverUrl.toString());
    } catch {
      p.log.error(`Invalid URL: ${serverUrl.toString()}`);
      continue;
    }

    // check for FileMaker and Otto versions
    const { fmsInfo, ottoInfo } = await fetchServerVersions({
      url: url.origin,
    });
    fmsVersion = new SemVer(fmsInfo.ServerVersion.split(" ")[0]!) ?? null;
    ottoVersion = new SemVer(ottoInfo?.Otto.version ?? "") ?? null;
    defaultServerUrl = undefined;
  }

  if (url === null) throw new Error("Unable to get FileMaker Server URL");

  p.note(`🎉 FileMaker Server version ${fmsVersion} detected \n
    ${!!ottoVersion ? `🎉 OttoFMS version ${ottoVersion} detected` : "❌ OttoFMS not detected"}`);

  if (ottoVersion === null) {
    p.log.warn(
      "OttoFMS is strongly reccommended for the best experience integrating with web apps"
    );
  }

  return { url, ottoVersion, fmsVersion };
}
