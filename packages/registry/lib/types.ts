import { z } from "zod/v3";

const registryTypeSchema = z
  .enum([
    "registry:lib",
    "registry:block",
    "registry:component",
    "registry:ui",
    "registry:hook",
    "registry:page",
    "registry:file",
    "registry:theme",
    "registry:style",
    "registry:item",
    "registry:example",
    "registry:internal",
  ])
  .describe(
    "The type property is used to specify the type of your registry item. This is used to determine the type and target path of the item when resolved for a project.",
  );

type RegistryType = z.infer<typeof registryTypeSchema>;

/**
 * Minimal file schema for shadcn CLI compatibility.
 * This matches the structure expected by shadcn but avoids importing heavy types.
 */
const registryItemFileSchema = z.discriminatedUnion("type", [
  z.object({
    path: z.string(),
    content: z.string().optional(),
    type: registryTypeSchema.extract(["registry:file", "registry:page"]),
    target: z.string(),
  }),
  z.object({
    path: z.string(),
    content: z.string().optional(),
    type: registryTypeSchema.exclude(["registry:file", "registry:page"]),
    target: z.string().optional(),
  }),
]);

/**
 * Base schema with common fields from shadcn's registryItemSchema.
 * We define our own to avoid importing the heavy shadcn types.
 */
const baseRegistryItemSchema = z.object({
  $schema: z.string().optional(),
  extends: z.string().optional(),
  title: z.string().optional(),
  author: z.string().optional(),
  description: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  devDependencies: z.array(z.string()).optional(),
  registryDependencies: z.array(z.string()).optional(),
  tailwind: z
    .object({
      config: z
        .object({
          content: z.array(z.string()).optional(),
          theme: z.record(z.string(), z.any()).optional(),
          plugins: z.array(z.string()).optional(),
        })
        .optional(),
    })
    .optional(),
  cssVars: z
    .object({
      theme: z.record(z.string(), z.string()).optional(),
      light: z.record(z.string(), z.string()).optional(),
      dark: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  css: z.record(z.string(), z.any()).optional(),
  envVars: z.record(z.string(), z.string()).optional(),
  meta: z.record(z.string(), z.any()).optional(),
  categories: z.array(z.string()).optional(),
});

type BaseRegistryItem = z.infer<typeof baseRegistryItemSchema>;

// Defines a single file within a template
export const templateFileSchema = z.discriminatedUnion("type", [
  z.object({
    // The name of the file within this template directory
    sourceFileName: z.string(),
    // The destination path in a consumer project, relative to project root
    destinationPath: z.string().optional(),
    type: registryTypeSchema.extract(["registry:file", "registry:page"]),
    handlebars: z.boolean().optional(),
  }),
  z.object({
    sourceFileName: z.string(),
    destinationPath: z.string().optional(),
    type: registryTypeSchema.exclude(["registry:file", "registry:page"]),
    handlebars: z.boolean().optional(),
  }),
]);

const buildPostInstallStepsSchema = <T extends z.AnyZodObject, A extends string>(action: A, dataSchema: T) => {
  return z.object({
    action: z.literal(action),
    data: dataSchema,
    _from: z.string().optional(),
  });
};

export const postInstallStepsSchema = z.discriminatedUnion("action", [
  buildPostInstallStepsSchema(
    "next-steps",
    z.object({
      message: z.string(),
    }),
  ),
  buildPostInstallStepsSchema(
    "package.json script",
    z.object({
      scriptName: z.string(),
      scriptCommand: z.string(),
    }),
  ),
  buildPostInstallStepsSchema(
    "env",
    z.object({
      envs: z
        .object({
          name: z.string(),
          zodValue: z.string(),
          defaultValue: z
            .string()
            .optional()
            .describe("This value will be added to the .env file, unless `addToRuntimeEnv` is set to `false`."),
          type: z.enum(["server", "client"]),
          addToRuntimeEnv: z.boolean().optional().describe("Whether to add the env to the runtime env."),
        })
        .array(),
    }),
  ),
  buildPostInstallStepsSchema(
    "wrap provider",
    z.object({
      providerOpenTag: z
        .string()
        .describe(
          "The opening tag to use for the provider. This is used to wrap the provider in the correct location.",
        ),
      providerCloseTag: z.string().describe("The closing tag to use for the provider."),
      imports: z
        .array(
          z.object({
            moduleSpecifier: z.string().describe("The module to import from (e.g., '@/config/query-provider')"),
            defaultImport: z.string().optional().describe("The default import name (e.g., 'QueryProvider')"),
            namedImports: z
              .array(z.string())
              .optional()
              .describe("Array of named imports (e.g., ['QueryProvider', 'useQuery'])"),
          }),
        )
        .describe(
          "Array of import configurations for the provider. Each import should have either defaultImport or namedImports.",
        ),
      parentTag: z
        .array(z.string())
        .optional()
        .describe(
          "If set, the provider will attempt to go inside of the parent tag. The first found tag will be used as the parent. If not set or none of the tags are found, the provider will be wrapped at the very top level.",
        ),
    }),
  ),
]);

export type PostInstallStep = z.infer<typeof postInstallStepsSchema>;

const categorySchema = z.enum(["component", "page", "utility", "hook", "email"]);

export const frameworkSchema = z.enum(["next-pages", "next-app", "manual"]);

export type TemplateMetadata = BaseRegistryItem & {
  title: string;
  description?: string;
  category: z.infer<typeof categorySchema>;
  files: TemplateFile[];
  registryType: RegistryType;
  postInstall?: PostInstallStep[];
  minimumProofKitVersion?: string;
  allowedFrameworks?: z.infer<typeof frameworkSchema>[];
  schemaRequired?: boolean;
};

// Defines the metadata for a single template (_meta.ts)
export const templateMetadataSchema: z.ZodType<TemplateMetadata> = baseRegistryItemSchema.extend({
  title: z.string(),
  description: z.string().optional(),
  category: categorySchema,
  files: z.array(templateFileSchema),
  registryType: registryTypeSchema,
  postInstall: z
    .array(postInstallStepsSchema)
    .optional()
    .describe("Steps that should be run by the ProofKit CLI after shadcn CLI is done"),
  minimumProofKitVersion: z
    .string()
    .describe("The minimum version of ProofKit required to use this template")
    .optional(),
  allowedFrameworks: z.array(frameworkSchema).optional(),
  schemaRequired: z.boolean().optional().describe("Whether this template requires a database schema to be selected"),
});

export type TemplateFile = z.infer<typeof templateFileSchema>;

export type RegistryIndex = Array<{
  name: string;
  title: string;
  category: z.infer<typeof categorySchema>;
  description?: string;
}>;

export const registryIndexSchema: z.ZodType<RegistryIndex> = z
  .object({
    name: z.string(),
    title: z.string(),
    category: categorySchema,
    description: z.string().optional(),
  })
  .array();

/**
 * Output type compatible with shadcn CLI's RegistryItem.
 * Defined locally to avoid importing heavy shadcn types.
 */
export type RegistryItem = BaseRegistryItem & {
  name: string;
  type: RegistryType;
  files?: z.infer<typeof registryItemFileSchema>[];
  docs?: string;
};
