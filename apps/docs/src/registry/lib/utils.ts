import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import createJiti from "jiti";
import type { RegistryItem, ShadcnFilesUnion, TemplateMetadata } from "./types";

const templatesPath = path.join(process.cwd(), "src/registry/templates");

export type RegistryIndexItem = {
  name: string;
  type: "static";
  categories: TemplateMetadata["categories"];
  // files: string[]; // destination paths
};

/**
 * Scans the templates directory and returns all template directories with _meta.ts files
 */
function getTemplateDirs(root: string, prefix = ""): string[] {
  const entries = fsSync.readdirSync(root, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirPath = path.join(root, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const files = fsSync.readdirSync(dirPath);
    if (files.includes("_meta.ts")) {
      result.push(rel);
    }
    // Recurse for nested templates
    const nested = getTemplateDirs(dirPath, rel);
    result.push(...nested);
  }
  return result;
}

/**
 * Loads template metadata using jiti
 */
function loadTemplateMeta(templatePath: string): TemplateMetadata {
  const jiti = createJiti(__filename, {
    interopDefault: true,
    requireCache: false,
  });

  const metaPath = path.join(templatesPath, templatePath, "_meta.ts");
  const metaModule = jiti(metaPath);
  const meta =
    metaModule.meta || metaModule.default?.meta || metaModule.default;

  if (!meta) {
    throw new Error(
      `Template ${templatePath}: _meta.ts must export a 'meta' object`,
    );
  }

  return meta;
}

export async function getRegistryIndex(): Promise<RegistryIndexItem[]> {
  const templateDirs = getTemplateDirs(templatesPath);

  const index = templateDirs.map((templatePath) => {
    const meta = loadTemplateMeta(templatePath);
    return {
      ...meta,
      name: templatePath, // Use the path as the name
    };
  });

  return index;
}

export async function getStaticComponent(
  namePath: string,
): Promise<RegistryItem> {
  const normalized = namePath.replace(/^\/+|\/+$/g, "");

  // Check if template exists
  const templateDirs = getTemplateDirs(templatesPath);
  if (!templateDirs.includes(normalized)) {
    throw new Error(`Template "${normalized}" not found`);
  }

  const meta = loadTemplateMeta(normalized);

  const files: ShadcnFilesUnion = await Promise.all(
    meta.files.map(async (file) => {
      const contentPath = path.join(
        templatesPath,
        normalized,
        file.sourceFileName,
      );
      const content = await fs.readFile(contentPath, "utf-8");

      const shadcnFile: ShadcnFilesUnion[number] =
        file.type === "registry:file" || file.type === "registry:page"
          ? {
              path: file.sourceFileName,
              type: file.type,
              content,
              target: file.destinationPath,
            }
          : {
              path: file.sourceFileName,
              type: file.type,
              content,
              target: file.destinationPath ?? "",
            };

      return shadcnFile;
    }),
  );

  return {
    ...meta,
    name: normalized,
    type: meta.registryType,
    files,
  };
}
