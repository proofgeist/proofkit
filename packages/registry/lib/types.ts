import { z } from "zod/v4";
import {
  type RegistryItem as ShadcnRegistryItem,
  registryItemTypeSchema,
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
    destinationPath: z.string(),
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
    name: z.string(),
    script: z.string(),
  }),
  z.object({
    action: z.literal("wrap provider"),
    providerOpenTag: z.string(),
    providerCloseTag: z.string(),
    importStatement: z.string(),
    parentTag: z
      .array(z.string())
      .optional()
      .describe(
        "If set, the provider will attempt to go inside of the parent tag. The first found tag will be used as the parent. If not set or none of the tags are found, the provider will be wrapped at the very top level.",
      ),
  }),
]);

const sharedMetadataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  category: z.enum(["component", "page", "utility", "hook", "email"]),
  files: z.array(templateFileSchema),
  registryType: registryTypeSchema,
  dependencies: z
    .array(z.string())
    .describe("NPM package dependencies")
    .optional(),
  registryDependencies: z
    .array(z.string())
    .describe("Other components")
    .optional(),
  postInstall: z
    .array(postInstallStepsSchema)
    .optional()
    .describe(
      "Steps that should be run by the ProofKit CLI after shadcn CLI is done",
    ),
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

// Adapt shadcn RegistryItem: require `content` in files and allow both single and array forms

export type ShadcnFilesUnion = Required<
  Exclude<ShadcnRegistryItem["files"], undefined>[number]
>[];

export type RegistryItem = Omit<ShadcnRegistryItem, "files"> & {
  files: ShadcnFilesUnion;
};
