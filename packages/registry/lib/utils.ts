import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import createJiti from "jiti";
import type {
  RegistryItem,
  ShadcnFilesUnion,
  TemplateMetadata,
} from "./types.js";

// Find the templates path relative to this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesPath = path.resolve(__dirname, "../templates");

export type RegistryIndexItem = {
  name: string;
  type: TemplateMetadata["type"];
  category: TemplateMetadata["category"];
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
    // Look for either _meta.ts (source) or _meta.js (compiled)
    if (files.includes("_meta.ts") || files.includes("_meta.js")) {
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
function loadTemplateMeta(templatePath: string) {
  const jiti = createJiti(__filename, {
    interopDefault: true,
    requireCache: false,
  });

  // Try _meta.ts first (source), then _meta.js (compiled)
  const templateDir = path.join(templatesPath, templatePath);
  const files = fsSync.readdirSync(templateDir);
  const metaFile = files.includes("_meta.ts") ? "_meta.ts" : "_meta.js";
  const metaPath = path.join(templateDir, metaFile);

  const metaModule = jiti(metaPath);
  const meta: TemplateMetadata =
    metaModule.meta || metaModule.default?.meta || metaModule.default;

  if (!meta) {
    throw new Error(
      `Template ${templatePath}: ${metaFile} must export a 'meta' object`,
    );
  }

  return {
    ...meta,
    registryPath: templatePath,
  };
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

function getNormalizedPath(namePath: string): string {
  return namePath.replace(/^\/+|\/+$/g, "");
}

export function getOtherProofKitDependencies(meta: TemplateMetadata): string[] {
  return (meta.registryDependencies ?? [])
    .filter((x) => x.startsWith("{proofkit}/r/"))
    .map((x) => x.replace("{proofkit}/r/", ""))
    .map(getNormalizedPath);
}

async function getComponentMetaInternal(
  namePath: string,
  visited: Set<string> = new Set(),
): Promise<TemplateMetadata> {
  const normalized = getNormalizedPath(namePath);

  // Check for circular dependency
  if (visited.has(normalized)) {
    // Return a minimal metadata to avoid circular processing
    // but don't throw an error as circular deps might be valid
    const meta = loadTemplateMeta(normalized);
    return {
      ...meta,
      postInstall: meta.postInstall ?? [],
    };
  }

  const templateDirs = getTemplateDirs(templatesPath);
  if (!templateDirs.includes(normalized)) {
    throw new Error(`Template "${normalized}" not found`);
  }

  // Add to visited set before processing dependencies
  visited.add(normalized);

  const meta = loadTemplateMeta(normalized);

  const otherProofKitDependencies = getOtherProofKitDependencies(meta).filter(
    (name) => !visited.has(name), // Skip already visited dependencies
  );

  const otherProofKitDependenciesMeta = await Promise.all(
    otherProofKitDependencies.map(async (name) => {
      const meta = await getComponentMetaInternal(name, visited);
      return {
        ...meta,
        name,
      };
    }),
  );

  return {
    ...meta,
    postInstall: [
      ...(meta.postInstall ?? []),
      ...otherProofKitDependenciesMeta.flatMap((x) =>
        (x.postInstall ?? []).map((step) => ({
          ...step,
          _from: x.name,
        })),
      ),
    ],
  };
}

export async function getComponentMeta(
  namePath: string,
): Promise<TemplateMetadata> {
  return getComponentMetaInternal(namePath, new Set());
}

export async function getStaticComponent(
  namePath: string,
): Promise<RegistryItem> {
  const normalized = getNormalizedPath(namePath);
  const meta = await getComponentMeta(namePath);

  if (meta.type !== "static") {
    throw new Error(`Template "${normalized}" is not a static template`);
  }

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
