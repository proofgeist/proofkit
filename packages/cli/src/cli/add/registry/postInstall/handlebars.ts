import path from "path";
import { TemplateFile, decodeHandlebarsFromShadcn } from "@proofkit/registry";
import fs from "fs-extra";
import handlebars from "handlebars";

import { getShadcnConfig } from "~/helpers/shadcn-cli.js";
import { state } from "~/state.js";
import { DataSource, getSettings } from "~/utils/parseSettings.js";
import { getClientSuffix, getFieldNamesForSchema } from "~/generators/fmdapi.js";

// Register handlebars helpers
handlebars.registerHelper("eq", function (a, b) {
  return a === b;
});

handlebars.registerHelper(
  "findFirst",
  function (this: any, array, predicate, options) {
    if (!array || !Array.isArray(array)) return options.inverse(this);

    for (let i = 0; i < array.length; i++) {
      const item = array[i];
      if (predicate === "fm" && item.type === "fm") {
        return options.fn(item);
      }
    }
    return options.inverse(this);
  }
);

type DataSourceForTemplate = {
  dataSource: DataSource;
  schemaName: string;
}

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


function buildDataSourceData(args: DataSourceForTemplate) {
  const { dataSource, schemaName } = args;

  const clientSuffix = getClientSuffix({
    projectDir: state.projectDir??process.cwd(),
    dataSourceName: dataSource.name,
  });

  const allFieldNames = getFieldNamesForSchema({
    schemaName,
    dataSourceName: dataSource.name,
  }).filter(Boolean) as string[];

  return {
    sourceName: dataSource.name,
    schemaName,
    clientSuffix,
    allFieldNames,
    fieldNames: filterOutCommonFieldNames(allFieldNames)
  }
}

export function buildHandlebarsData(args?: DataSourceForTemplate) {
  const proofkit = getSettings();
  const shadcn = getShadcnConfig();

  return {
    proofkit,
    shadcn,
    schema: args ? buildDataSourceData(args) : {
      sourceName: "UnknownDataSource",
      schemaName: "UnknownSchema",
      clientSuffix: "UnknownClientSuffix",
      allFieldNames: ["UnknownFieldName"],
      fieldNames: ["UnknownFieldName"],
    },
  };
}

export async function randerHandlebarsToFile(
  file: TemplateFile,
  data: ReturnType<typeof buildHandlebarsData>
) {
  const inputPath = getFilePath(file, data);
  let rawTemplate = await fs.readFile(inputPath, "utf8");
  
  // Decode placeholder tokens back to handlebars syntax
  // This uses the centralized decoding function from the registry package
  rawTemplate = decodeHandlebarsFromShadcn(rawTemplate);
  
  const template = handlebars.compile(rawTemplate);
  const rendered = template(data);
  await fs.writeFile(inputPath, rendered);
}

export function getFilePath(
  file: TemplateFile,
  data: ReturnType<typeof buildHandlebarsData>
): string {
  const thePath = file.sourceFileName;

  if (file.destinationPath) return file.destinationPath;

  const cwd = state.projectDir ?? process.cwd();
  const { shadcn } = data;

  // Create a mapping between registry types and their corresponding shadcn config aliases
  const typeToAliasMap: Record<string, string | undefined> = {
    "registry:lib": shadcn?.aliases?.lib || shadcn?.aliases?.utils,
    "registry:component": shadcn?.aliases?.components,
    "registry:ui": shadcn?.aliases?.ui || shadcn?.aliases?.components,
    "registry:hook": shadcn?.aliases?.hooks,
    // These types don't have direct aliases, so we use fallback paths
    "registry:file": "src",
    "registry:page": "src/app",
    "registry:block": shadcn?.aliases?.components
      ? shadcn.aliases.components.startsWith("@/")
        ? `${shadcn.aliases.components.replace("@/", "src/")}/blocks`
        : `src/${shadcn.aliases.components}/blocks`
      : "src/components/blocks",
    "registry:theme": "src/theme",
    "registry:style": "src/styles",
  };

  const aliasPath = typeToAliasMap[file.type];

  if (aliasPath) {
    // Handle @/ prefix which represents the src directory
    if (aliasPath.startsWith("@/")) {
      const resolvedPath = aliasPath.replace("@/", "src/");
      return path.join(cwd, resolvedPath, thePath);
    }
    // If the alias starts with a path separator or contains src/, treat it as a relative path from cwd
    else if (aliasPath.startsWith("/") || aliasPath.includes("src/")) {
      return path.join(cwd, aliasPath, thePath);
    }
    // Otherwise, treat it as an alias that should be resolved relative to src/
    else {
      return path.join(cwd, "src", aliasPath, thePath);
    }
  }

  // Fallback to hardcoded paths for unsupported types
  switch (file.type) {
    case "registry:lib":
      return path.join(cwd, "src", "lib", thePath);
    case "registry:file":
      return path.join(cwd, "src", thePath);
    case "registry:page":
      // For page templates, use the route name if available in template data
      const routeName = (data as any).routeName;
      if (routeName) {
        // Add /(main) prefix for Next.js app router structure
        const pageRoute = routeName === "/" ? "" : routeName;
        return path.join(cwd, "src", "app", "(main)", pageRoute, thePath);
      }
      return path.join(cwd, "src", "app", thePath);
    case "registry:block":
      return path.join(cwd, "src", "components", "blocks", thePath);
    case "registry:component":
      return path.join(cwd, "src", "components", thePath);
    case "registry:ui":
      return path.join(cwd, "src", "components", thePath);
    case "registry:hook":
      return path.join(cwd, "src", "hooks", thePath);
    case "registry:theme":
      return path.join(cwd, "src", "theme", thePath);
    case "registry:style":
      return path.join(cwd, "src", "styles", thePath);
    default:
      // default to source file name
      return thePath;
  }
}
