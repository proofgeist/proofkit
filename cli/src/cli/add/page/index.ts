import path from "path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs-extra";

import { PKG_ROOT } from "~/consts.js";
import { getExistingSchemas } from "~/generators/fmdapi.js";
import { addRouteToNav } from "~/generators/route.js";
import { type DataSource, type Settings } from "~/utils/parseSettings.js";
import { abortIfCancel } from "../../utils.js";
import { pageTemplates } from "./templates.js";

export const runAddPageAction = async ({
  settings,
  ...opts
}: {
  settings: Settings;
  routeName?: string;
  pageName?: string;
  dataSourceName?: string;
  schemaName?: string;
  template?: string;
}) => {
  const projectDir = process.cwd();
  let routeName =
    opts.routeName ??
    abortIfCancel(
      await p.text({
        message:
          "What should be the route for this new page? This will show in the URL",
        placeholder: "/my-page",
        validate: (value) => {
          if (value.length === 0) {
            return "Route name is required";
          }
          return;
        },
      })
    );

  if (!routeName.startsWith("/")) {
    routeName = `/${routeName}`;
  }

  const pageName =
    opts.pageName ??
    abortIfCancel(
      await p.text({
        message: `Enter page name:\n${chalk.dim("This title will show in the nav menu, unless left blank")}`,
        initialValue: routeName.replace("/", ""),
      })
    );

  const template =
    opts.template ??
    abortIfCancel(
      await p.select({
        message: "What template should be used for this page?",
        options: Object.entries(pageTemplates).map(([key, value]) => ({
          value: key,
          label: value.label,
          hint: value.hint,
        })),
      })
    );

  const pageTemplate = pageTemplates[template];
  if (!pageTemplate) return p.cancel(`Page template ${template} not found`);

  let dataSource: DataSource | undefined;
  let schemaName: string | undefined;
  if (pageTemplate.requireData) {
    if (settings.dataSources.length === 0)
      return p.cancel(
        "This template requires a data source, but you don't have any. Add a data source first, or choose another page template"
      );

    const dataSourceName =
      opts.dataSourceName ?? settings.dataSources.length > 1
        ? abortIfCancel(
            await p.select({
              message: "Which data source should be used for this page?",
              options: settings.dataSources.map((dataSource) => ({
                value: dataSource.name,
                label: dataSource.name,
              })),
            })
          )
        : settings.dataSources[0]?.name;

    dataSource = settings.dataSources.find(
      (dataSource) => dataSource.name === dataSourceName
    );
    if (!dataSource) return p.cancel(`Data source ${dataSourceName} not found`);

    schemaName = await promptForSchemaFromDataSource({
      projectDir,
      dataSource,
    });
  }

  const spinner = p.spinner();
  spinner.start("Adding page from template");

  // copy template files
  const templatePath = path.join(
    PKG_ROOT,
    "template/pages",
    pageTemplate.templatePath
  );
  const destPath = path.join(projectDir, "src/app/(main)", routeName);
  await fs.copy(templatePath, destPath);

  if (pageName !== "") {
    await addRouteToNav({
      projectDir: process.cwd(),
      navType: "primary",
      label: pageName,
      href: routeName,
    });
  }

  // call post-install function
  await pageTemplate.postIntallFn?.({
    projectDir,
    pageDir: destPath,
    dataSource,
    schemaName,
  });

  spinner.stop("Added page!");
};

export const makeAddPageCommand = () => {
  const addPageCommand = new Command("page")
    .description("Add a new page to your project")
    .action(async (opts: { settings: Settings }) => {
      const settings = opts.settings;
      await runAddPageAction({ settings });
    });

  return addPageCommand;
};

async function promptForSchemaFromDataSource({
  projectDir = process.cwd(),
  dataSource,
}: {
  projectDir?: string;
  dataSource: DataSource;
}) {
  if (dataSource.type === "supabase") {
    throw new Error("Not implemented");
  } else {
    const schemas = getExistingSchemas({
      projectDir,
      dataSourceName: dataSource.name,
    })
      .map((s) => s.schemaName)
      .filter(Boolean);

    if (schemas.length === 0) {
      p.cancel("This data source doesn't have any schemas to load data from");
      return undefined;
    }

    if (schemas.length === 1) return schemas[0];

    const schemaName = abortIfCancel(
      await p.select({
        message: "Which schema should this page load data from?",
        options: schemas.map((o) => ({ label: o, value: o })),
      })
    );
    return schemaName;
  }
}
