import path from "path";
import { type GenerateSchemaOptions } from "@proofgeist/fmdapi/dist/utils/codegen.d.ts";
import fs from "fs-extra";
import { Project, SyntaxKind, type SourceFile } from "ts-morph";

import { PKG_ROOT } from "~/consts.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";

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
  const project = new Project({
    tsConfigFilePath: path.join(projectDir, "tsconfig.json"),
  });
  const sourceFile = project.addSourceFileAtPath(fmschemaConfig);
  const schemasArray = getSchemasArray(sourceFile);
  schemas.forEach((schema) => {
    schemasArray?.addElement(JSON.stringify(schema));
  });

  if (runCodegen) {
    await runCodegenCommand({ projectDir });
  }

  sourceFile.saveSync();
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function runCodegenCommand({
  projectDir,
}: {
  projectDir: string;
}) {
  // to do this without installing fmdapi (which may be required if running before running install) I need to change the fmdapi package to use ts-morph so it doesn't depend on typescript
  console.warn("TODO: run codegen");
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
  const project = new Project({
    tsConfigFilePath: path.join(projectDir, "tsconfig.json"),
  });
  const sourceFile = project.addSourceFileAtPath(fmschemaConfig);
  const schemasArray = getSchemasArray(sourceFile);

  const existingSchemas = schemasArray
    ?.getChildrenOfKind(SyntaxKind.ObjectLiteralExpression)
    .map((element) => {
      const layout = element
        .getProperty("layout")
        ?.getFirstDescendantByKind(SyntaxKind.StringLiteral);
      return layout?.getLiteralText();
    });
  return existingSchemas ?? [];
}
