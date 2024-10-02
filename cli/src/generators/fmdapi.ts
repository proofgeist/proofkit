import path from "path";
import { type GenerateSchemaOptions } from "@proofgeist/fmdapi/dist/utils/codegen.d.ts";
import fs from "fs-extra";
import { SyntaxKind, type SourceFile } from "ts-morph";

import { PKG_ROOT } from "~/consts.js";
import { runExecCommand } from "~/helpers/installDependencies.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";
import { parseSettings } from "~/utils/parseSettings.js";
import { formatAndSaveSourceFiles, getNewProject } from "~/utils/ts-morph.js";

export function initFmdapi({ projectDir }: { projectDir: string }) {
  addPackageDependency({
    projectDir,
    dependencies: ["@proofgeist/fmdapi"],
    devMode: false,
  });

  const extrasDir = path.join(PKG_ROOT, "template/extras");
  fs.copySync(
    path.join(extrasDir, "config/fmschema.config.mjs"),
    path.join(projectDir, "fmschema.config.mjs")
  );
}

type Schema = GenerateSchemaOptions["schemas"][number];
export async function addLayout({
  projectDir = process.cwd(),
  schemas,
  runCodegen = true,
}: {
  projectDir?: string;
  schemas: Schema[];
  runCodegen?: boolean;
}) {
  const fmschemaConfig = path.join(projectDir, "fmschema.config.mjs");
  if (!fs.existsSync(fmschemaConfig)) {
    throw new Error("fmschema.config.mjs not found");
  }
  const project = getNewProject(projectDir);

  const sourceFile = project.addSourceFileAtPath(fmschemaConfig);
  const schemasArray = getSchemasArray(sourceFile);
  schemas.forEach((schema) => {
    schemasArray?.addElement(JSON.stringify(schema));
  });

  if (runCodegen) {
    await runCodegenCommand({ projectDir });
  }

  await formatAndSaveSourceFiles(project);
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

function getSchemasArray(sourceFile: SourceFile) {
  const configObject = sourceFile
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
    ?.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);

  // for each schema passed in, add to the schemas property of the config object
  const schemasArray = configObject
    ?.getPropertyOrThrow("schemas")
    .getFirstDescendantByKind(SyntaxKind.ArrayLiteralExpression);

  return schemasArray;
}

export function getExistingSchemas({
  projectDir = process.cwd(),
}: {
  projectDir?: string;
}) {
  const fmschemaConfig = path.join(projectDir, "fmschema.config.mjs");
  const project = getNewProject(projectDir);
  const sourceFile = project.addSourceFileAtPath(fmschemaConfig);
  const schemasArray = getSchemasArray(sourceFile);

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
