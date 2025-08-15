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
});

// Defines the metadata for a single template (_meta.ts)
export const templateMetadataSchema = z.discriminatedUnion("type", [
  sharedMetadataSchema.extend({
    type: z.literal("static"),
  }),
  sharedMetadataSchema.extend({
    type: z.literal("dynamic"),
    postInstall: z.string().optional(),
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
