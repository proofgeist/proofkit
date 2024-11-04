import path from "path";
import fs from "fs-extra";
import { Project, SyntaxKind } from "ts-morph";

import {
  getClientSuffix,
  getFieldNamesForSchema,
} from "~/generators/fmdapi.js";
import { parseSettings } from "~/utils/parseSettings.js";
import { formatAndSaveSourceFiles, getNewProject } from "~/utils/ts-morph.js";
import { type TPostInstallFn } from "../types.js";

export const postInstallTable: TPostInstallFn = async ({
  projectDir,
  pageDir,
  dataSource,
  schemaName,
}) => {
  if (!dataSource) {
    throw new Error("DataSource is required for table page");
  } else if (!schemaName) {
    throw new Error("SchemaName is required for table page");
  } else if (dataSource.type !== "fm") {
    throw new Error("FileMaker DataSource is required for table page");
  }

  const clientSuffix = getClientSuffix({
    projectDir,
    dataSourceName: dataSource.name,
  });

  const allFieldNames = getFieldNamesForSchema({
    projectDir,
    schemaName,
    dataSourceName: dataSource.name,
  });

  const { auth } = parseSettings(projectDir);

  const substitutions = {
    __SOURCE_NAME__: dataSource.name,
    __TYPE_NAME__: `T${schemaName}`,
    __CLIENT_NAME__: `${schemaName}${clientSuffix}`,
    __SCHEMA_NAME__: schemaName,
    __ACTION_CLIENT__:
      auth.type === "none" ? "actionClient" : "authedActionClient",
    __FIRST_FIELD_NAME__: allFieldNames[0] ?? "NO_FIELDS_ON_YOUR_LAYOUT",
  };

  // read all files in pageDir and loop over them
  const files = await fs.readdir(pageDir);
  for await (const file of files) {
    const filePath = path.join(pageDir, file);
    let fileContent = await fs.readFile(filePath, "utf8");

    Object.entries(substitutions).forEach(([key, value]) => {
      fileContent = fileContent.replace(new RegExp(key, "g"), value);
    });

    await fs.writeFile(filePath, fileContent, "utf8");
  }

  // add the schemas to the columns array
  const project = getNewProject(projectDir);
  const sourceFile = project.addSourceFileAtPath(
    path.join(pageDir, "table.tsx")
  );
  const columns = sourceFile
    .getVariableDeclaration("columns")
    ?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);

  const fieldNames = filterOutCommonFieldNames(allFieldNames);

  for await (const fieldName of fieldNames) {
    columns?.addElement((writer) =>
      writer
        .inlineBlock(() => {
          if (fieldName.includes(".")) {
            writer.write(`accessorFn: (row) => row["${fieldName}"],`);
          } else {
            writer.write(`accessorKey: "${fieldName}",`);
          }
          writer.write(`header: "${fieldName}",`);
        })
        .write(",")
        .newLine()
    );
  }

  await formatAndSaveSourceFiles(project);
};

const commonFieldNamesToExclude = [
  "id",
  "pk",
  "createdat",
  "updatedat",
  "primarykey",
  "createdby",
  "modifiedby",
  "creationtimestamp",
  "modificationtimestamp",
];

function filterOutCommonFieldNames(fieldNames: string[]): string[] {
  return fieldNames.filter(
    (fieldName) =>
      !commonFieldNamesToExclude.includes(fieldName.toLowerCase()) ||
      fieldName.startsWith("_")
  );
}
