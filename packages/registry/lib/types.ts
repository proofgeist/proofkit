import { z } from "zod/v3";
import {
  type RegistryItem as ShadcnRegistryItem,
  registryItemSchema,
} from "shadcn/registry";

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

// Defines a single file within a template
export const templateFileSchema = z.discriminatedUnion("type", [
  z.object({
    // The name of the file within this template directory
    sourceFileName: z.string(),
    // The destination path in a consumer project, relative to project root
    destinationPath: z.string().optional(),
    type: registryTypeSchema.extract(["registry:file", "registry:page"]),
  }),
  z.object({
    sourceFileName: z.string(),
    destinationPath: z.string().optional(),
    type: registryTypeSchema.exclude(["registry:file", "registry:page"]),
  }),
]);

export const postInstallStepsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("package.json script"),
    _from: z.string().optional(),
    data: z.object({
      scriptName: z.string(),
      scriptCommand: z.string(),
    }),
  }),
  z.object({
    action: z.literal("wrap provider"),
    _from: z.string().optional(),
    data: z.object({
      providerOpenTag: z
        .string()
        .describe(
          "The opening tag to use for the provider. This is used to wrap the provider in the correct location.",
        ),
      providerCloseTag: z
        .string()
        .describe("The closing tag to use for the provider."),
      imports: z
        .array(
          z.object({
            moduleSpecifier: z
              .string()
              .describe(
                "The module to import from (e.g., '@/config/query-provider')",
              ),
            defaultImport: z
              .string()
              .optional()
              .describe("The default import name (e.g., 'QueryProvider')"),
            namedImports: z
              .array(z.string())
              .optional()
              .describe(
                "Array of named imports (e.g., ['QueryProvider', 'useQuery'])",
              ),
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
  }),
]);

export type PostInstallStep = z.infer<typeof postInstallStepsSchema>;

const categorySchema = z.enum([
  "component",
  "page",
  "utility",
  "hook",
  "email",
]);

export const frameworkSchema = z.enum(["next-pages", "next-app", "manual"]);

const sharedMetadataSchema = registryItemSchema
  .omit({ name: true, type: true, files: true })
  .extend({
    title: z.string(),
    description: z.string().optional(),
    category: categorySchema,
    files: z.array(templateFileSchema),
    registryType: registryTypeSchema,
    postInstall: z
      .array(postInstallStepsSchema)
      .optional()
      .describe(
        "Steps that should be run by the ProofKit CLI after shadcn CLI is done",
      ),
    minimumProofKitVersion: z
      .string()
      .describe("The minimum version of ProofKit required to use this template")
      .optional(),
    allowedFrameworks: z.array(frameworkSchema).optional(),
  });

// Defines the metadata for a single template (_meta.ts)
export const templateMetadataSchema = z.discriminatedUnion("type", [
  sharedMetadataSchema.extend({
    type: z.literal("static"),
  }),
  sharedMetadataSchema.extend({
    type: z.literal("dynamic"),
    schema: z.unknown(), // a JSON schema for the required values to be passed as query(?) params
  }),
]);

export type TemplateFile = z.infer<typeof templateFileSchema>;
export type TemplateMetadata = z.infer<typeof templateMetadataSchema>;

export const registryIndexSchema = sharedMetadataSchema
  .pick({ title: true, category: true, description: true })
  .extend({ type: z.enum(["static", "dynamic"]) })
  .array();

// Adapt shadcn RegistryItem: require `content` in files and allow both single and array forms

export type ShadcnFilesUnion = Required<
  Exclude<ShadcnRegistryItem["files"], undefined>[number]
>[];

export type RegistryItem = Omit<ShadcnRegistryItem, "files"> & {
  files: ShadcnFilesUnion;
};
