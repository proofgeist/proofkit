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
    server: z
      .string()
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    db: z
      .string()
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    auth: z
      .object({
        apiKey: z
          .string()
          .optional()
          .transform((val) => (val === "" ? undefined : val)),
        username: z
          .string()
          .optional()
          .transform((val) => (val === "" ? undefined : val)),
        password: z
          .string()
          .optional()
          .transform((val) => (val === "" ? undefined : val)),
      })
      .optional()
      .transform((val) => {
        if (!val || Object.values(val).every((v) => v === undefined)) {
          return undefined;
        }
        return val;
      }),
  })
  .optional()
  .transform((val) => {
    if (val && Object.values(val).every((v) => v === undefined)) {
      return undefined;
    }
    return val ?? undefined;
  })
  .meta({
    description:
      "If you're using other environment variables than the default, custom the NAMES of them here for the typegen to lookup their values when it runs.",
  });

const path = z
  .string()
  .default("schema")
  .optional()
  .meta({ description: "The folder path to output the generated files" });

// Field-level override configuration
const fieldOverride = z.object({
  // Field name to apply override to
  fieldName: z.string().meta({
    description: "The field name this override applies to",
  }),
  // Exclude this field from generation
  exclude: z.boolean().optional().meta({
    description: "If true, this field will be excluded from generation",
  }),
  // Override the inferred type from metadata
  typeOverride: z
    .enum([
      "text", // textField()
      "number", // numberField()
      "boolean", // numberField().outputValidator(z.coerce.boolean())
      "fmBooleanNumber", // Same as boolean, explicit FileMaker 0/1 pattern
      "date", // dateField()
      "timestamp", // timestampField()
      "container", // containerField()
    ])
    .optional()
    .meta({
      description:
        "Override the inferred field type from metadata. Options: text, number, boolean, fmBooleanNumber, date, timestamp, container",
    }),
});

// Table-level configuration (opt-in model)
const tableConfig = z.object({
  // Table name to generate
  tableName: z.string().meta({
    description:
      "The entity set name (table occurrence name) to generate. This table will be included in metadata download and type generation.",
  }),
  // Override the generated TypeScript variable name
  // (original entity set name is still used for the path)
  variableName: z.string().optional().meta({
    description:
      "Override the generated TypeScript variable name. The original entity set name is still used for the OData path.",
  }),
  // Field-specific overrides as an array
  fields: z.array(fieldOverride).optional().meta({
    description: "Field-specific overrides as an array",
  }),
  reduceMetadata: z.boolean().optional().meta({
    description:
      "If undefined, the top-level setting will be used. If true, reduced OData annotations will be requested from the server to reduce payload size. This will prevent comments, entity ids, and other properties from being generated.",
  }),
  alwaysOverrideFieldNames: z.boolean().optional().meta({
    description:
      "If undefined, the top-level setting will be used. If true, field names will always be updated to match metadata, even when matching by entity ID. If false, existing field names are preserved when matching by entity ID.",
  }),
});

const typegenConfigSingleBase = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("fmdapi"),
    configName: z.string().optional(),
    envNames,
    layouts: z.array(layoutConfig).default([]),
    path,
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
  }),
  z.object({
    type: z.literal("fmodata"),
    configName: z.string().optional(),
    envNames: z.optional(envNames),
    path,
    reduceMetadata: z.boolean().optional().meta({
      description:
        "If true, reduced OData annotations will be requested from the server to reduce payload size. This will prevent comments, entity ids, and other properties from being generated.",
    }),
    clearOldFiles: z.boolean().default(false).optional().meta({
      description:
        "If false, the path will not be cleared before the new files are written. Only the `client` and `generated` directories are cleared to allow for potential overrides to be kept.",
    }),
    alwaysOverrideFieldNames: z.boolean().default(true).optional().meta({
      description:
        "If true (default), field names will always be updated to match metadata, even when matching by entity ID. If false, existing field names are preserved when matching by entity ID.",
    }),
    tables: z.array(tableConfig).default([]).meta({
      description:
        "Required array of tables to generate. Only the tables specified here will be downloaded and generated. Each table can have field-level overrides for excluding fields, renaming variables, and overriding field types.",
    }),
  }),
]);

// Add default "type" field for backwards compatibility
export const typegenConfigSingle = z.preprocess((data) => {
  if (data && typeof data === "object" && !("type" in data)) {
    return { ...data, type: "fmdapi" };
  }
  return data;
}, typegenConfigSingleBase);

export const typegenConfig = z.object({
  config: z.union([z.array(typegenConfigSingle), typegenConfigSingle]),
});

export type TypegenConfig = z.infer<typeof typegenConfig>;

export type FmodataConfig = Extract<
  z.infer<typeof typegenConfigSingle>,
  { type: "fmodata" }
>;

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
