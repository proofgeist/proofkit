import { z } from "zod/v4";

const valueListsOptions = z.enum(["strict", "allowEmpty", "ignore"]);
export type ValueListsOptions = z.infer<typeof valueListsOptions>;

const layoutConfig = z.object({
  layoutName: z.string().meta({
    description: "The layout name from your FileMaker solution",
  }),
  schemaName: z.string().meta({
    description: "A friendly name for the generated layout-specific client",
  }),
  valueLists: valueListsOptions.optional().meta({
    description:
      "If set to 'strict', the value lists will be validated to ensure that the values are correct. If set to 'allowEmpty', the value lists will be validated to ensure that the values are correct, but empty value lists will be allowed. If set to 'ignore', the value lists will not be validated and typed as `string`.",
  }),
  generateClient: z.boolean().optional().meta({
    description:
      "If true, a layout-specific client will be generated (unless set to `false` at the top level)",
  }),
  strictNumbers: z.boolean().optional().meta({
    description:
      "If true, number fields will be typed as `number | null`. It's false by default because sometimes very large number will be returned as scientific notation via the Data API and therefore the type will be `number | string`.",
  }),
});

const envNames = z
  .object({
    server: z.string(),
    db: z.string(),
    auth: z.union([
      z
        .object({
          apiKey: z.string(),
        })
        .partial(),
      z
        .object({
          username: z.string(),
          password: z.string(),
        })
        .partial(),
    ]),
  })
  .partial()
  .optional()
  .meta({
    description:
      "If you're using other environment variables than the default, custom the NAMES of them here for the typegen to lookup their values when it runs.",
  });

export const typegenConfigSingle = z.object({
  envNames,
  layouts: z.array(layoutConfig),
  path: z
    .string()
    .default("schema")
    .optional()
    .meta({ description: "The folder path to output the generated files" }),
  clearOldFiles: z.boolean().default(false).optional().meta({
    description:
      "If false, the path will not be cleared before the new files are written. Only the `client` and `generated` directories are cleared to allow for potential overrides to be kept.",
  }),
  validator: z
    .union([z.enum(["zod", "zod/v4", "zod/v3"]), z.literal(false)])
    .default("zod/v4")
    .optional()
    .meta({
      description:
        "If set to 'zod', 'zod/v4', or 'zod/v3', the validator will be generated using zod, otherwise it will generated Typescript types only and no runtime validation will be performed",
    }),
  clientSuffix: z.string().default("Layout").optional().meta({
    description: "The suffix to be added to the schema name for each layout",
  }),
  generateClient: z.boolean().default(true).optional().meta({
    description:
      "If true, a layout-specific client will be generated for each layout provided, otherwise it will only generate the types. This option can be overridden for each layout individually.",
  }),
  webviewerScriptName: z.string().optional().meta({
    description:
      "The name of the webviewer script to be used. If this key is set, the generated client will use the @proofkit/webviewer adapter instead of the OttoFMS or Fetch adapter, which will only work when loaded inside of a FileMaker webviewer.",
  }),
});

export const typegenConfig = z.object({
  config: z.union([typegenConfigSingle, z.array(typegenConfigSingle)]),
});

export type TypegenConfig = z.infer<typeof typegenConfig>;

export type TSchema = {
  name: string;
  type: "string" | "fmnumber" | "valueList";
  values?: string[];
};

export type BuildSchemaArgs = {
  schemaName: string;
  schema: Array<TSchema>;
  type: "zod" | "zod/v4" | "zod/v3" | "ts";
  portalSchema?: { schemaName: string; schema: Array<TSchema> }[];
  valueLists?: { name: string; values: string[] }[];
  envNames: NonNullable<z.infer<typeof envNames>>;
  layoutName: string;
  strictNumbers?: boolean;
  webviewerScriptName?: string;
};
