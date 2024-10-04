import path from "path";
import * as p from "@clack/prompts";
import { type OttoAPIKey } from "@proofgeist/fmdapi";
import { type ValueListsOptions } from "@proofgeist/fmdapi/typegen/types.js";
import chalk from "chalk";
import { Command } from "commander";
import dotenv from "dotenv";
import { z } from "zod";

import { addLayout, getExistingSchemas } from "~/generators/fmdapi.js";
import { type Settings } from "~/utils/parseSettings.js";
import { commonFileMakerLayoutPrefixes, getLayouts } from "../fmdapi.js";

export const runAddSchemaAction = async ({
  projectDir = process.cwd(),
  settings,
  sourceName = "filemaker",
  ...opts
}: {
  projectDir?: string;
  settings: Settings;
  sourceName?: string;
  layoutName?: string;
  schemaName?: string;
  valueLists?: ValueListsOptions;
}) => {
  const dataSource = settings.dataSources
    .filter((s) => s.type === "fm")
    .find((s) => s.name === sourceName);
  if (!dataSource)
    throw new Error(
      `FileMaker data source ${sourceName} not found in your ProofKit config`
    );

  const spinner = p.spinner();
  spinner.start("Loading layouts from your FileMaker file...");
  if (settings.envFile) {
    dotenv.config({
      path: path.join(projectDir, settings.envFile),
    });
  }

  const dataApiKey = process.env[dataSource.envNames.apiKey]! as OttoAPIKey;
  const fmFile = process.env[dataSource.envNames.database]!;
  const server = process.env[dataSource.envNames.server]!;

  const layouts = await getLayouts({
    dataApiKey,
    fmFile,
    server,
  });

  const existingSchemas = getExistingSchemas({
    projectDir,
    dataSourceName: sourceName,
  });
  spinner.stop("Loaded layouts from your FileMaker file");

  if (existingSchemas.length > 0) {
    p.note(
      existingSchemas.join("\n"),
      "Detected existing layouts in your project"
    );
  }

  const selectedLayout =
    opts.layoutName ??
    ((await p.select({
      message: `Select a new layout to read data from`,
      maxItems: 10,
      options: layouts
        .filter((layout) => !existingSchemas.includes(layout))
        .map((layout) => ({
          label: layout,
          value: layout,
        })),
    })) as string);

  const defaultSchemaName = getDefaultSchemaName(selectedLayout);
  const schemaName =
    opts.schemaName ??
    (
      await p.text({
        message: `Enter a friendly name for the new schema.\n${chalk.dim("This will the name by which you refer to this layout in your codebase")}`,
        // initialValue: selectedLayout,
        defaultValue: defaultSchemaName,
        placeholder: defaultSchemaName,
      })
    ).toString();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const valueLists =
    opts.valueLists ??
    ((await p.select({
      message: `Should we use value lists on this layout?\n${chalk.dim(
        "This will allow fields that contain a value list to be auto-completed in typescript and also validated to prevent incorrect values"
      )}`,
      options: [
        { label: "No, ignore value lists", value: "ignore" },
        { label: "Yes, but allow empty fields", value: "allowEmpty" },
        {
          label: "Yes; empty values should fail validation",
          value: "strict",
        },
      ],
    })) as ValueListsOptions);

  const valueListsValidated = z
    .enum(["ignore", "allowEmpty", "strict"])
    .catch("ignore")
    .parse(valueLists);

  await addLayout({
    runCodegen: true,
    projectDir,
    dataSourceName: sourceName,
    schemas: [
      {
        layout: selectedLayout,
        schemaName,
        valueLists: valueListsValidated,
      },
    ],
  });

  p.outro("Layout added");
};

export const makeAddSchemaCommand = () => {
  const addSchemaCommand = new Command("layout")
    .alias("schema")
    .description("Add a new layout to your fmschema file")
    .action(async (opts: { settings: Settings }) => {
      const settings = opts.settings;
      await runAddSchemaAction({ settings });
    });

  return addSchemaCommand;
};

function getDefaultSchemaName(layout: string) {
  let schemaName = layout.replace(/[-\s]/g, "_");
  for (const prefix of commonFileMakerLayoutPrefixes) {
    if (schemaName.startsWith(prefix)) {
      schemaName = schemaName.replace(prefix, "");
    }
  }
  return schemaName;
}
