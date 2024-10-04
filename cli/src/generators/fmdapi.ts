import path from "path";
import { type GenerateSchemaOptions } from "@proofgeist/fmdapi/dist/utils/codegen.d.ts";
import fs from "fs-extra";
import {
  SyntaxKind,
  type ObjectLiteralExpression,
  type Project,
  type SourceFile,
} from "ts-morph";

import { PKG_ROOT } from "~/consts.js";
import { runExecCommand } from "~/helpers/installDependencies.js";
import { parseSettings } from "~/utils/parseSettings.js";
import { formatAndSaveSourceFiles, getNewProject } from "~/utils/ts-morph.js";

type Schema = GenerateSchemaOptions["schemas"][number];
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
  const fmschemaConfig = path.join(projectDir, "fmschema.config.mjs");
  if (!fs.existsSync(fmschemaConfig)) {
    throw new Error("fmschema.config.mjs not found");
  }
  const project = getNewProject(projectDir);

  const sourceFile = project.addSourceFileAtPath(fmschemaConfig);
  const schemasArray = getSchemasArray(sourceFile, dataSourceName);
  schemas.forEach((schema) => {
    schemasArray?.addElement(JSON.stringify(schema));
  });

  await formatAndSaveSourceFiles(project);

  if (runCodegen) {
    await runCodegenCommand({ projectDir });
  }
}

export async function runCodegenCommand({
  projectDir,
}: {
  projectDir: string;
}) {
  const settings = parseSettings(projectDir);
  await runExecCommand({
    projectDir,
    command: ["@proofgeist/fmdapi@latest", `--env-path=${settings.envFile}`],
    successMessage: "Successfully generated types from your layout",
  });
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

function getConfigObject(sourceFile: SourceFile, dataSourceName: string) {
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
          ?.getText();
        return pathString?.endsWith(dataSourceName);
      })
      ?.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  }
  return configObj;
}

function getSchemasArray(sourceFile: SourceFile, dataSourceName: string) {
  const configObj = getConfigObject(sourceFile, dataSourceName);
  // for each schema passed in, add to the schemas property of the config object
  const schemasArray = configObj
    ?.getPropertyOrThrow("schemas")
    .getFirstDescendantByKind(SyntaxKind.ArrayLiteralExpression);

  return schemasArray;
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
          const name = pa.getName();
          return name === "layout" || name === '"layout"';
        });

      const layoutName = layoutProperty?.getInitializer()?.getText();

      // remove the quotes from the layout name
      const cleanedLayoutName = layoutName?.replace(/"/g, "");

      return cleanedLayoutName;
    });

  return existingSchemas ?? [];
}

export function addToFmschemaConfig({
  projectDir,
  dataSourceName,
  project,
}: {
  projectDir: string;
  dataSourceName: string;
  project: Project;
}) {
  const configFilePath = path.join(projectDir, "fmschema.config.mjs");
  const alreadyExists = fs.existsSync(configFilePath);
  if (!alreadyExists) {
    const extrasDir = path.join(PKG_ROOT, "template/extras");
    fs.copySync(
      path.join(extrasDir, "config/fmschema.config.mjs"),
      path.join(projectDir, configFilePath)
    );
    const sourceFile = project.addSourceFileAtPath(configFilePath);
    const configObj = getConfigObject(sourceFile, dataSourceName);
    configObj
      ?.getProperty("path")
      ?.asKind(SyntaxKind.PropertyAssignment)
      ?.setInitializer((writer) =>
        writer.quote("./src/config/schemas/filemaker")
      );
  } else {
    // since the file a®eady existed, we need to ensure the config variable is an array now before we proceed

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
        writer
          .quote("path")
          .write(": ")
          .quote(`./src/config/schemas/${dataSourceName}`)
          .newLine();
      });
    });
  }
}
