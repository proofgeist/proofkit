import path from "path";
import { type GenerateSchemaOptionsSingle } from "@proofgeist/fmdapi/utils/typegen/types.js";
import { execa } from "execa";
import fs from "fs-extra";
import {
  SyntaxKind,
  type ObjectLiteralExpression,
  type Project,
  type SourceFile,
} from "ts-morph";
import { type z } from "zod";

import { PKG_ROOT } from "~/consts.js";
import { state } from "~/state.js";
import { getUserPkgManager } from "~/utils/getUserPkgManager.js";
import { getSettings, type envNamesSchema } from "~/utils/parseSettings.js";
import { formatAndSaveSourceFiles, getNewProject } from "~/utils/ts-morph.js";

type Schema = GenerateSchemaOptionsSingle["schemas"][number];
export async function addLayout({
  projectDir = process.cwd(),
  schemas,
  runCodegen = true,
  dataSourceName,

  ...args
}: {
  projectDir?: string;
  schemas: Schema[];
  runCodegen?: boolean;
  dataSourceName: string;
  project?: Project;
}) {
  const fmschemaConfig = path.join(projectDir, "fmschema.config.mjs");
  if (!fs.existsSync(fmschemaConfig)) {
    throw new Error("fmschema.config.mjs not found");
  }
  const project = args.project ?? getNewProject(projectDir);

  const sourceFile = project.addSourceFileAtPath(fmschemaConfig);
  const schemasArray = getSchemasArray(sourceFile, dataSourceName);
  schemas.forEach((schema) => {
    schemasArray?.addElement(JSON.stringify(schema));
  });

  if (!args.project) {
    await formatAndSaveSourceFiles(project);
  }

  if (runCodegen) {
    await runCodegenCommand();
  }
}

export async function addConfig({
  config,
  projectDir,
  runCodegen = true,
  ...args
}: {
  config: GenerateSchemaOptionsSingle;
  projectDir: string;
  project?: Project;
  runCodegen?: boolean;
}) {
  const fmschemaConfig = path.join(projectDir, "fmschema.config.mjs");
  if (!fs.existsSync(fmschemaConfig)) {
    throw new Error("fmschema.config.mjs not found");
  }
  const project = args.project ?? getNewProject(projectDir);
  const sourceFile = project.addSourceFileAtPath(fmschemaConfig);
  const configVar = getConfigVarStatement(sourceFile);

  if (
    configVar?.getInitializer()?.getKind() ===
    SyntaxKind.ObjectLiteralExpression
  ) {
    // convert it to an array
    const existingText = configVar.getInitializer()?.getText();
    configVar.setInitializer(`[${existingText}]`);
  }

  const configArray = configVar?.getInitializerIfKindOrThrow(
    SyntaxKind.ArrayLiteralExpression
  );

  configArray?.addElement((writer) => {
    writer.writeLine(JSON.stringify(config));
  });

  if (!args.project) {
    await formatAndSaveSourceFiles(project);
  }

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
    const { failed } = await execa(
      pkgManager === "npm"
        ? "npx"
        : pkgManager === "pnpm"
          ? "pnpx"
          : pkgManager === "bun"
            ? "bunx"
            : pkgManager,
      ["@proofgeist/fmdapi", `--env-path=${settings.envFile}`],
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

function getConfigVarStatement(sourceFile: SourceFile) {
  return sourceFile
    .getVariableDeclarations()
    .find((vd) => {
      const isExport = !!vd
        .getDescendantsOfKind(SyntaxKind.SyntaxList)
        .find((dsc) => dsc.getChildrenOfKind(SyntaxKind.ExportKeyword));

      const nameIsConfig = vd
        .getVariableStatement()
        ?.getDescendantsOfKind(SyntaxKind.Identifier)
        .find((id) => id.getText() === "config");

      return isExport && nameIsConfig;
    })
    ?.getVariableStatement()
    ?.getFirstDescendantByKind(SyntaxKind.VariableDeclaration);
}

export function getConfigObject(
  sourceFile: SourceFile,
  dataSourceName: string
) {
  const configExpression = getConfigVarStatement(sourceFile)?.getInitializer();
  let configObj: ObjectLiteralExpression | undefined = undefined;

  if (configExpression?.getKind() === SyntaxKind.ObjectLiteralExpression) {
    configObj = configExpression.asKind(SyntaxKind.ObjectLiteralExpression);
  } else if (
    configExpression?.getKind() === SyntaxKind.ArrayLiteralExpression
  ) {
    // find the config object in the array, matching the dataSourceName
    configObj = configExpression
      .asKind(SyntaxKind.ArrayLiteralExpression)
      ?.getElements()
      .find((elm) => {
        const obj = elm.asKind(SyntaxKind.ObjectLiteralExpression);
        const pathString = obj
          ?.getDescendantsOfKind(SyntaxKind.PropertyAssignment)
          .find((pa) => pa.getName() === "path")
          ?.getInitializerIfKind(SyntaxKind.StringLiteral)
          ?.getText()
          ?.replace(/"/g, ""); // remove the quotes from the path, if they exist

        return pathString?.endsWith(dataSourceName);
      })
      ?.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  }
  return configObj;
}

function getSchemasArray(sourceFile: SourceFile, dataSourceName: string) {
  const configObj = getConfigObject(sourceFile, dataSourceName);
  if (!configObj) {
    throw new Error("could not find config object in fmschema.config.mjs");
  }

  // for each schema passed in, add to the schemas property of the config object
  const schemasArray = configObj
    .getPropertyOrThrow("schemas")
    .getFirstDescendantByKind(SyntaxKind.ArrayLiteralExpression);

  return schemasArray;
}

export function getClientSuffix({
  projectDir = process.cwd(),
  dataSourceName,
}: {
  projectDir?: string;
  dataSourceName: string;
}) {
  const fmschemaConfig = path.join(projectDir, "fmschema.config.mjs");
  const project = getNewProject(projectDir);
  const sourceFile = project.addSourceFileAtPath(fmschemaConfig);
  const configObj = getConfigObject(sourceFile, dataSourceName);
  const clientSuffix = configObj
    ?.getProperty("clientSuffix")
    ?.asKind(SyntaxKind.PropertyAssignment)
    ?.getInitializerIfKind(SyntaxKind.StringLiteral)
    ?.getText()
    .replace(/"/g, "");

  return clientSuffix ?? "Client";
}

export function getExistingSchemas({
  projectDir = process.cwd(),
  dataSourceName,
}: {
  projectDir?: string;
  dataSourceName: string;
}) {
  const fmschemaConfig = path.join(projectDir, "fmschema.config.mjs");
  const project = getNewProject(projectDir);
  const sourceFile = project.addSourceFileAtPath(fmschemaConfig);
  const schemasArray = getSchemasArray(sourceFile, dataSourceName);

  const existingSchemas = schemasArray
    ?.getChildrenOfKind(SyntaxKind.ObjectLiteralExpression)
    .map((element) => {
      const layoutProperty = element
        .getDescendantsOfKind(SyntaxKind.PropertyAssignment)
        .find((pa) => {
          const name = pa.getName()?.replace(/"/g, "");
          return name === "layout";
        });

      const layout = layoutProperty
        ?.getInitializer()
        ?.getText()
        ?.replace(/"/g, "");
      const schemaNameProperty = element
        .getDescendantsOfKind(SyntaxKind.PropertyAssignment)
        .find((pa) => {
          const name = pa.getName()?.replace(/"/g, "");
          return name === "schemaName";
        });

      const schemaName = schemaNameProperty
        ?.getInitializer()
        ?.getText()
        ?.replace(/"/g, "");

      return { layout, schemaName };
    });

  return existingSchemas ?? [];
}

export function addToFmschemaConfig({
  dataSourceName,
  project,
  envNames,
}: {
  dataSourceName: string;
  project: Project;
  envNames?: z.infer<typeof envNamesSchema>;
}) {
  const projectDir = state.projectDir;
  const configFilePath = path.join(projectDir, "fmschema.config.mjs");
  const alreadyExists = fs.existsSync(configFilePath);
  if (!alreadyExists) {
    const extrasDir = path.join(PKG_ROOT, "template/extras");
    fs.copySync(
      path.join(extrasDir, "config/fmschema.config.mjs"),
      path.join(configFilePath)
    );

    const sourceFile = project.addSourceFileAtPath(configFilePath);
    const configObj = getConfigObject(sourceFile, dataSourceName);
    configObj
      ?.getProperty("path")
      ?.asKind(SyntaxKind.PropertyAssignment)
      ?.setInitializer((writer) =>
        writer.quote("./src/config/schemas/filemaker")
      );

    if (state.appType === "webviewer") {
      configObj?.addPropertyAssignment({
        name: "webviewerScriptName",
        initializer: (writer) => writer.quote("ExecuteDataApi"),
      });
    }
  } else {
    // since the file already existed, we need to ensure the config variable is an array now before we proceed

    const sourceFile = project.addSourceFileAtPath(configFilePath);
    const configVar = getConfigVarStatement(sourceFile);

    if (
      configVar?.getInitializer()?.getKind() ===
      SyntaxKind.ObjectLiteralExpression
    ) {
      // convert it to an array
      const existingText = configVar.getInitializer()?.getText();
      configVar.setInitializer(`[${existingText}]`);
    }

    const configArray = configVar?.getInitializerIfKindOrThrow(
      SyntaxKind.ArrayLiteralExpression
    );

    configArray?.addElement((writer) => {
      writer.block(() => {
        writer
          .quote("clientSuffix")
          .write(": ")
          .quote("Layout")
          .write(",")
          .newLine();
        writer.quote("schemas").write(": [],").newLine();
        writer.quote("clearOldFiles").write(": true,").newLine();
        if (envNames) {
          writer
            .quote("envNames")
            .write(": ")
            .block(() => {
              writer
                .quote("auth")
                .write(": {")
                .quote("apiKey")
                .write(`: `)
                .quote(envNames.apiKey)
                .write(" },")
                .newLine();
              writer
                .quote("database")
                .write(`: `)
                .quote(envNames.database)
                .write(",")
                .newLine();
              writer
                .quote("server")
                .write(`: `)
                .quote(envNames.server)
                .write(",")
                .newLine();
            })
            .write(",");
        }
        writer
          .quote("path")
          .write(": ")
          .quote(`./src/config/schemas/${dataSourceName}`)
          .newLine();
      });
    });
  }
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
  const sourceFile = project.addSourceFileAtPath(
    path.join(
      projectDir,
      `src/config/schemas/${dataSourceName}/${schemaName}.ts`
    )
  );
  const zodSchema = sourceFile.getVariableDeclaration(`Z${schemaName}`);

  if (zodSchema) {
    // parse from the zod object
    const properties = zodSchema
      .getInitializer()
      ?.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression)
      ?.getProperties();

    const fieldNames =
      properties
        ?.map((pr) =>
          pr.asKind(SyntaxKind.PropertyAssignment)?.getName()?.replace(/"/g, "")
        )
        .filter(Boolean) ?? [];

    return fieldNames;
  } else {
    const typeAlias = sourceFile.getTypeAlias(`T${schemaName}`);
    const properties = typeAlias
      ?.getFirstDescendantByKind(SyntaxKind.TypeLiteral)
      ?.getProperties();

    const fieldNames =
      properties
        ?.map((pr) =>
          pr.asKind(SyntaxKind.PropertySignature)?.getName()?.replace(/"/g, "")
        )
        .filter(Boolean) ?? [];

    return fieldNames;
  }
}

export function removeFromFmschemaConfig({
  dataSourceName,
  project,
}: {
  dataSourceName: string;
  project?: Project;
}) {
  const projectDir = state.projectDir;
  if (!project) project = getNewProject(projectDir);

  const configFilePath = path.join(projectDir, "fmschema.config.mjs");
  if (!fs.existsSync(configFilePath)) {
    return;
  }

  const sourceFile = project.addSourceFileAtPath(configFilePath);
  const configVar = getConfigVarStatement(sourceFile);

  // Handle single config object case
  if (
    configVar?.getInitializer()?.getKind() ===
    SyntaxKind.ObjectLiteralExpression
  ) {
    // If it's a single object and matches our data source, clear its schemas
    const configObj = configVar
      .getInitializer()
      ?.asKind(SyntaxKind.ObjectLiteralExpression);
    if (!configObj) return;

    const pathProp = configObj
      .getProperty("path")
      ?.asKind(SyntaxKind.PropertyAssignment);
    const pathValue = pathProp
      ?.getInitializer()
      ?.getText()
      ?.replace(/['"]/g, "");

    if (pathValue?.includes(dataSourceName)) {
      const schemasArray = configObj
        .getProperty("schemas")
        ?.asKind(SyntaxKind.PropertyAssignment)
        ?.getInitializer()
        ?.asKind(SyntaxKind.ArrayLiteralExpression);

      if (schemasArray) {
        const emptyArray: string[] = [];
        schemasArray.replaceWithText(`[${emptyArray.join(",")}]`);
      }
    }
    return;
  }

  // Handle array of configs case
  const configArray = configVar?.getInitializerIfKind(
    SyntaxKind.ArrayLiteralExpression
  );
  if (configArray) {
    const elements = configArray.getElements();
    const newElements = elements.filter((element) => {
      if (!element.asKind(SyntaxKind.ObjectLiteralExpression)) {
        return true;
      }
      const pathProp = element
        .asKind(SyntaxKind.ObjectLiteralExpression)
        ?.getProperty("path")
        ?.asKind(SyntaxKind.PropertyAssignment);
      const pathValue = pathProp
        ?.getInitializer()
        ?.getText()
        ?.replace(/['"]/g, "");
      return !pathValue?.includes(dataSourceName);
    });
    configArray.replaceWithText(
      `[${newElements.map((el) => el.getText()).join(",")}]`
    );
  }
}

export async function removeLayout({
  projectDir = state.projectDir,
  schemaName,
  dataSourceName,
  runCodegen = true,
  ...args
}: {
  projectDir?: string;
  schemaName: string;
  dataSourceName: string;
  runCodegen?: boolean;
  project?: Project;
}) {
  const fmschemaConfig = path.join(projectDir, "fmschema.config.mjs");
  if (!fs.existsSync(fmschemaConfig)) {
    throw new Error("fmschema.config.mjs not found");
  }
  const project = args.project ?? getNewProject(projectDir);

  const sourceFile = project.addSourceFileAtPath(fmschemaConfig);
  const schemasArray = getSchemasArray(sourceFile, dataSourceName);
  if (!schemasArray) {
    throw new Error("Could not find schemas array in config");
  }

  // Find and remove the schema with matching schemaName
  const elements = schemasArray.getElements();
  if (!elements) {
    throw new Error("Could not find schemas array in config");
  }

  const newElements = elements.filter((element) => {
    if (!element.asKind(SyntaxKind.ObjectLiteralExpression)) {
      return true;
    }
    const schemaNameProp = element
      .asKind(SyntaxKind.ObjectLiteralExpression)
      ?.getProperty("schemaName")
      ?.asKind(SyntaxKind.PropertyAssignment);
    const schemaNameValue = schemaNameProp
      ?.getInitializer()
      ?.getText()
      ?.replace(/['"]/g, "");
    return schemaNameValue !== schemaName;
  });

  schemasArray.replaceWithText(
    `[${newElements.map((el) => el.getText()).join(",")}]`
  );

  // Clean up generated schema file
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

  if (!args.project) {
    await formatAndSaveSourceFiles(project);
  }

  if (runCodegen) {
    await runCodegenCommand();
  }
}
