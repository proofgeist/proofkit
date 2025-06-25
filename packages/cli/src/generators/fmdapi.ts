import path from "path";
import { type typegenConfigSingle } from "@proofkit/typegen/config";
import { execa } from "execa";
import fs from "fs-extra";
import { applyEdits, modify, parse as parseJsonc } from "jsonc-parser";
import { SyntaxKind } from "ts-morph";
import { type z } from "zod/v4";

import { state } from "~/state.js";
import { getUserPkgManager } from "~/utils/getUserPkgManager.js";
import { getSettings, type envNamesSchema } from "~/utils/parseSettings.js";
import { getNewProject } from "~/utils/ts-morph.js";

// Input schema for functions like addLayout
// This might be different from the layout config stored in the file
type Schema = {
  layoutName: string;
  schemaName: string;
  valueLists?: "strict" | "allowEmpty" | "ignore";
  generateClient?: boolean;
  strictNumbers?: boolean;
};

// For a single data source configuration object
type ImportedDataSourceConfig = z.infer<typeof typegenConfigSingle>;
// For a single layout configuration object within a data source
type ImportedLayoutConfig = ImportedDataSourceConfig["layouts"][number];

// This type represents the actual structure of the JSONC file, including $schema
type FullProofkitTypegenJsonFile = {
  $schema?: string;
  config: ImportedDataSourceConfig | ImportedDataSourceConfig[];
};

// Helper functions for JSON config
async function readJsonConfigFile(
  configPath: string
): Promise<FullProofkitTypegenJsonFile | null> {
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    const fileContent = await fs.readFile(configPath, "utf8");
    const parsed = parseJsonc(fileContent) as FullProofkitTypegenJsonFile;
    return parsed;
  } catch (error) {
    console.error(
      `Error reading or parsing JSONC config at ${configPath}:`,
      error
    );
    // Return a default structure for the *file* if parsing fails but file exists
    return {
      $schema: "https://proofkit.dev/typegen-config-schema.json",
      config: [],
    };
  }
}

async function writeJsonConfigFile(
  configPath: string,
  fileContent: FullProofkitTypegenJsonFile
) {
  // Check if file exists to preserve comments
  if (fs.existsSync(configPath)) {
    const originalText = await fs.readFile(configPath, "utf8");
    // Use jsonc-parser's modify function to preserve comments
    const edits = modify(originalText, ["config"], fileContent.config, {
      formattingOptions: {
        tabSize: 2,
        insertSpaces: true,
        eol: "\n",
      },
    });
    const modifiedText = applyEdits(originalText, edits);
    await fs.writeFile(configPath, modifiedText, "utf8");
  } else {
    // If file doesn't exist, create it with proper formatting
    await fs.writeJson(configPath, fileContent, { spaces: 2 });
  }
}

export async function addLayout({
  projectDir = process.cwd(),
  schemas,
  runCodegen = true,
  dataSourceName,
}: {
  projectDir?: string;
  schemas: Schema[];
  runCodegen?: boolean;
  dataSourceName: string;
}) {
  const jsonConfigPath = path.join(projectDir, "proofkit-typegen.config.jsonc");
  let fileContent = await readJsonConfigFile(jsonConfigPath);

  if (!fileContent) {
    fileContent = {
      $schema: "https://proofkit.dev/typegen-config-schema.json",
      config: [],
    };
  }

  // Work with the 'config' property which is TypegenConfig['config']
  let configProperty = fileContent.config;

  let configArray: ImportedDataSourceConfig[];
  if (Array.isArray(configProperty)) {
    configArray = configProperty;
  } else {
    configArray = [configProperty];
    fileContent.config = configArray; // Update fileContent to ensure it's an array for later ops
  }

  const layoutsToAdd: ImportedLayoutConfig[] = schemas.map((schema) => ({
    layoutName: schema.layoutName,
    schemaName: schema.schemaName,
    valueLists: schema.valueLists,
    generateClient: schema.generateClient,
    strictNumbers: schema.strictNumbers,
  }));

  let targetDataSource: ImportedDataSourceConfig | undefined = configArray.find(
    (ds) =>
      ds.path?.endsWith(dataSourceName) ||
      ds.path?.endsWith(dataSourceName + "/") ||
      ds.path === dataSourceName
  );

  if (!targetDataSource) {
    targetDataSource = {
      layouts: [],
      path: `./src/config/schemas/${dataSourceName}`,
      // other default properties for a new DataSourceConfig can be added here if needed
    };
    configArray.push(targetDataSource);
  } else {
    targetDataSource.layouts = targetDataSource.layouts || [];
  }

  targetDataSource.layouts.push(...layoutsToAdd);
  // fileContent.config is already pointing to configArray if it was modified

  await writeJsonConfigFile(jsonConfigPath, fileContent);

  if (runCodegen) {
    await runCodegenCommand();
  }
}

export async function addConfig({
  config,
  projectDir,
  runCodegen = true,
}: {
  config: ImportedDataSourceConfig | ImportedDataSourceConfig[];
  projectDir: string;
  runCodegen?: boolean;
}) {
  const jsonConfigPath = path.join(projectDir, "proofkit-typegen.config.jsonc");
  let fileContent = await readJsonConfigFile(jsonConfigPath);

  const configsToAdd = Array.isArray(config) ? config : [config];

  if (!fileContent) {
    fileContent = {
      $schema: "https://proofkit.dev/typegen-config-schema.json",
      config: configsToAdd,
    };
  } else {
    if (Array.isArray(fileContent.config)) {
      fileContent.config.push(...configsToAdd);
    } else {
      fileContent.config = [fileContent.config, ...configsToAdd];
    }
  }

  await writeJsonConfigFile(jsonConfigPath, fileContent);

  if (runCodegen) {
    await runCodegenCommand();
  }
}

export async function runCodegenCommand() {
  const projectDir = state.projectDir;
  const settings = getSettings();
  if (settings.dataSources.length === 0) {
    console.log("no data sources found, skipping typegen");
    return;
  }
  const pkgManager = getUserPkgManager();

  const hasFileMakerDataSources = settings.dataSources.some(
    (ds) => ds.type === "fm"
  );

  if (hasFileMakerDataSources) {
    // The command now directly uses @proofkit/typegen which should read the new jsonc file
    const { failed } = await execa(
      pkgManager === "npm"
        ? "npx"
        : pkgManager === "pnpm"
          ? "pnpm"
          : pkgManager === "bun"
            ? "bunx"
            : pkgManager,
      pkgManager === "pnpm"
        ? ["dlx", "@proofkit/typegen@latest", `--env-path=${settings.envFile}`]
        : ["@proofkit/typegen@latest", `--env-path=${settings.envFile}`],
      {
        cwd: projectDir,
        stderr: "inherit",
        stdout: "inherit",
      }
    );
    if (failed) {
      throw new Error("Failed to run codegen command");
    }
  }
}

export function getClientSuffix({
  projectDir = process.cwd(),
  dataSourceName,
}: {
  projectDir?: string;
  dataSourceName: string;
}): string {
  const jsonConfigPath = path.join(projectDir, "proofkit-typegen.config.jsonc");
  if (!fs.existsSync(jsonConfigPath)) {
    return "Client";
  }
  try {
    const fileContent = fs.readFileSync(jsonConfigPath, "utf8");
    const parsed = parseJsonc(fileContent) as FullProofkitTypegenJsonFile;

    let targetDataSource: ImportedDataSourceConfig | undefined;

    const configToSearch = Array.isArray(parsed.config)
      ? parsed.config
      : [parsed.config];

    targetDataSource = configToSearch.find(
      (ds) =>
        ds.path?.endsWith(dataSourceName) ||
        ds.path?.endsWith(dataSourceName + "/") ||
        ds.path === dataSourceName
    );
    return targetDataSource?.clientSuffix ?? "Client";
  } catch (error) {
    console.error(
      `Error reading or parsing JSONC config for getClientSuffix: ${jsonConfigPath}`,
      error
    );
    return "Client";
  }
}

export function getExistingSchemas({
  projectDir = process.cwd(),
  dataSourceName,
}: {
  projectDir?: string;
  dataSourceName: string;
}): { layout?: string; schemaName?: string }[] {
  const jsonConfigPath = path.join(projectDir, "proofkit-typegen.config.jsonc");
  if (!fs.existsSync(jsonConfigPath)) {
    return [];
  }
  try {
    const fileContent = fs.readFileSync(jsonConfigPath, "utf8");
    const parsed = parseJsonc(fileContent) as FullProofkitTypegenJsonFile;
    let targetDataSource: ImportedDataSourceConfig | undefined;

    const configToSearch = Array.isArray(parsed.config)
      ? parsed.config
      : [parsed.config];

    targetDataSource = configToSearch.find(
      (ds) =>
        ds.path?.endsWith(dataSourceName) ||
        ds.path?.endsWith(dataSourceName + "/") ||
        ds.path === dataSourceName
    );

    if (targetDataSource?.layouts) {
      return targetDataSource.layouts.map((layout) => ({
        layout: layout.layoutName,
        schemaName: layout.schemaName,
      }));
    }
    return [];
  } catch (error) {
    console.error(
      `Error reading or parsing JSONC config for getExistingSchemas: ${jsonConfigPath}`,
      error
    );
    return [];
  }
}

export async function addToFmschemaConfig({
  dataSourceName,
  envNames,
}: {
  dataSourceName: string;
  envNames?: z.infer<typeof envNamesSchema>;
}) {
  const projectDir = state.projectDir;
  const jsonConfigPath = path.join(projectDir, "proofkit-typegen.config.jsonc");
  let fileContent = await readJsonConfigFile(jsonConfigPath);

  const newDataSource: ImportedDataSourceConfig = {
    layouts: [],
    path: `./src/config/schemas/${dataSourceName}`,
    clearOldFiles: true,
    clientSuffix: "Layout",
  };

  if (envNames) {
    newDataSource.envNames = {
      server: envNames.server,
      db: envNames.database,
      auth: { apiKey: envNames.apiKey },
    };
  }
  if (state.appType === "webviewer") {
    newDataSource.webviewerScriptName = "ExecuteDataApi";
  }

  if (!fileContent) {
    fileContent = {
      $schema: "https://proofkit.dev/typegen-config-schema.json",
      config: [newDataSource],
    };
  } else {
    let configArray: ImportedDataSourceConfig[];
    if (Array.isArray(fileContent.config)) {
      configArray = fileContent.config;
    } else {
      configArray = [fileContent.config];
      fileContent.config = configArray;
    }

    const existingDsIndex = configArray.findIndex(
      (ds) => ds.path === newDataSource.path
    );
    if (existingDsIndex === -1) {
      configArray.push(newDataSource);
    } else {
      configArray[existingDsIndex] = {
        ...configArray[existingDsIndex],
        ...newDataSource,
        layouts:
          newDataSource.layouts.length > 0
            ? newDataSource.layouts
            : configArray[existingDsIndex]?.layouts || [],
      };
    }
  }
  await writeJsonConfigFile(jsonConfigPath, fileContent);
}

export function getFieldNamesForSchema({
  schemaName,
  dataSourceName,
}: {
  schemaName: string;
  dataSourceName: string;
}) {
  const projectDir = state.projectDir;
  const project = getNewProject(projectDir);
  const sourceFilePath = path.join(
    projectDir,
    `src/config/schemas/${dataSourceName}/generated/${schemaName}.ts`
  );

  const sourceFilePathAlternative = path.join(
    projectDir,
    `src/config/schemas/${dataSourceName}/${schemaName}.ts`
  );

  let fileToUse = sourceFilePath;
  if (!fs.existsSync(sourceFilePath)) {
    if (fs.existsSync(sourceFilePathAlternative)) {
      fileToUse = sourceFilePathAlternative;
    } else {
      return [];
    }
  }
  const sourceFile = project.addSourceFileAtPath(fileToUse);

  const zodSchema = sourceFile.getVariableDeclaration(`Z${schemaName}`);
  if (zodSchema) {
    const properties = zodSchema
      .getInitializer()
      ?.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression)
      ?.getProperties();
    return (
      properties
        ?.map((pr) =>
          pr.asKind(SyntaxKind.PropertyAssignment)?.getName()?.replace(/"/g, "")
        )
        .filter(Boolean) ?? []
    );
  } else {
    const typeAlias = sourceFile.getTypeAlias(`T${schemaName}`);
    const properties = typeAlias
      ?.getFirstDescendantByKind(SyntaxKind.TypeLiteral)
      ?.getProperties();
    return (
      properties
        ?.map((pr) =>
          pr.asKind(SyntaxKind.PropertySignature)?.getName()?.replace(/"/g, "")
        )
        .filter(Boolean) ?? []
    );
  }
}

export async function removeFromFmschemaConfig({
  dataSourceName,
}: {
  dataSourceName: string;
}) {
  const projectDir = state.projectDir;
  const jsonConfigPath = path.join(projectDir, "proofkit-typegen.config.jsonc");
  let fileContent = await readJsonConfigFile(jsonConfigPath);

  if (!fileContent) {
    return;
  }

  const pathToRemove = `./src/config/schemas/${dataSourceName}`;

  if (Array.isArray(fileContent.config)) {
    fileContent.config = fileContent.config.filter(
      (ds) => ds.path !== pathToRemove
    );
  } else {
    const currentConfig = fileContent.config as ImportedDataSourceConfig;
    if (currentConfig.path === pathToRemove) {
      fileContent.config = [];
    }
  }
  await writeJsonConfigFile(jsonConfigPath, fileContent);
}

export async function removeLayout({
  projectDir = state.projectDir,
  schemaName,
  dataSourceName,
  runCodegen = true,
}: {
  projectDir?: string;
  schemaName: string;
  dataSourceName: string;
  runCodegen?: boolean;
}) {
  const jsonConfigPath = path.join(projectDir, "proofkit-typegen.config.jsonc");
  let fileContent = await readJsonConfigFile(jsonConfigPath);

  if (!fileContent) {
    throw new Error(
      "proofkit-typegen.config.jsonc not found, cannot remove layout."
    );
  }

  let dataSourceModified = false;
  const targetDsPath = `./src/config/schemas/${dataSourceName}`;

  let configArray: ImportedDataSourceConfig[];
  if (Array.isArray(fileContent.config)) {
    configArray = fileContent.config;
  } else {
    configArray = [fileContent.config];
    fileContent.config = configArray;
  }

  const targetDataSource = configArray.find((ds) => ds.path === targetDsPath);

  if (targetDataSource?.layouts) {
    const initialCount = targetDataSource.layouts.length;
    targetDataSource.layouts = targetDataSource.layouts.filter(
      (layout) => layout.schemaName !== schemaName
    );
    if (targetDataSource.layouts.length < initialCount) {
      dataSourceModified = true;
    }
  }

  if (dataSourceModified) {
    await writeJsonConfigFile(jsonConfigPath, fileContent);
  }

  const schemaFilePath = path.join(
    projectDir,
    "src",
    "config",
    "schemas",
    dataSourceName,
    `${schemaName}.ts`
  );
  if (fs.existsSync(schemaFilePath)) {
    fs.removeSync(schemaFilePath);
  }

  if (runCodegen && dataSourceModified) {
    await runCodegenCommand();
  }
}

// Make sure to remove unused imports like Project, SyntaxKind, etc. if they are no longer used anywhere.
// Also remove getNewProject and formatAndSaveSourceFiles from imports if they were only for config.
