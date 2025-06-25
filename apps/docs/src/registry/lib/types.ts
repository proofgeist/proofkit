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

// Defines the metadata for a single template (_meta.ts)
export const templateMetadataSchema = z.object({
  title: z.string(),
  registryType: registryTypeSchema,
  type: z.literal("static"),
  description: z.string().optional(),
  categories: z.array(z.enum(["component", "page", "utility", "hook"])),
  files: z.array(templateFileSchema),
  dependencies: z
    .array(z.string())
    .describe("NPM package dependencies")
    .optional(),
  registryDependencies: z
    .array(z.string())
    .describe("Other components")
    .optional(),
});

export type TemplateFile = z.infer<typeof templateFileSchema>;
export type TemplateMetadata = z.infer<typeof templateMetadataSchema>;

// Adapt shadcn RegistryItem: require `content` in files and allow both single and array forms

export type ShadcnFilesUnion = Required<
  Exclude<ShadcnRegistryItem["files"], undefined>[number]
>[];

export type RegistryItem = Omit<ShadcnRegistryItem, "files"> & {
  files: ShadcnFilesUnion;
};
