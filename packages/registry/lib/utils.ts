import fsSync, { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createJiti from "jiti";
import type { RegistryIndex, RegistryItem, TemplateMetadata } from "./types.js";

// Find the templates path relative to this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultTemplatesPath = path.resolve(__dirname, "../templates");

// Regex to match file extension for handlebars replacement
const FILE_EXTENSION_REGEX = /\.[^/.]+$/;

/**
 * Scans the templates directory and returns all template directories with _meta.ts files
 */
function getTemplateDirs(root: string, prefix = ""): string[] {
  const entries = fsSync.readdirSync(root, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
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
function loadTemplateMeta(templatePath: string, templatesPath: string = defaultTemplatesPath) {
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
  const meta: TemplateMetadata = metaModule.meta || metaModule.default?.meta || metaModule.default;

  if (!meta) {
    throw new Error(`Template ${templatePath}: ${metaFile} must export a 'meta' object`);
  }

  return {
    ...meta,
    registryPath: templatePath,
  };
}

export function getRegistryIndex(templatesPath: string = defaultTemplatesPath): RegistryIndex {
  const templateDirs = getTemplateDirs(templatesPath);

  const index = templateDirs.map((templatePath) => {
    const meta = loadTemplateMeta(templatePath, templatesPath);
    const item: RegistryIndex[number] = {
      name: templatePath, // Use the path as the name
      category: meta.category,
      title: meta.title,
      description: meta.description,
    };
    return item;
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
  templatesPath: string = defaultTemplatesPath,
): Promise<TemplateMetadata> {
  const normalized = getNormalizedPath(namePath);

  // Check for circular dependency
  if (visited.has(normalized)) {
    // Return a minimal metadata to avoid circular processing
    // but don't throw an error as circular deps might be valid
    const meta = loadTemplateMeta(normalized, templatesPath);
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

  const meta = loadTemplateMeta(normalized, templatesPath);

  const otherProofKitDependencies = getOtherProofKitDependencies(meta).filter(
    (name) => !visited.has(name), // Skip already visited dependencies
  );

  const otherProofKitDependenciesMeta = await Promise.all(
    otherProofKitDependencies.map(async (name) => {
      const meta = await getComponentMetaInternal(name, visited, templatesPath);
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

export function getComponentMeta(
  namePath: string,
  templatesPath: string = defaultTemplatesPath,
): Promise<TemplateMetadata> {
  return getComponentMetaInternal(namePath, new Set(), templatesPath);
}

export async function getStaticComponent(
  namePath: string,
  options?: { routeName?: string; templatesPath?: string },
): Promise<RegistryItem> {
  const normalized = getNormalizedPath(namePath);
  const templatesPath = options?.templatesPath ?? defaultTemplatesPath;
  const meta = await getComponentMeta(namePath, templatesPath);

  const files: RegistryItem["files"] = await Promise.all(
    meta.files.map(async (file) => {
      const sourceFile = file.handlebars
        ? file.sourceFileName.replace(FILE_EXTENSION_REGEX, ".hbs")
        : file.sourceFileName;

      const contentPath = path.join(templatesPath, normalized, sourceFile);
      const content = await fs.readFile(contentPath, "utf-8");

      const routeName = options?.routeName ?? namePath;
      const destinationPath = file.destinationPath ? file.destinationPath?.replace("__PATH__", routeName) : undefined;

      const shadcnFile =
        file.type === "registry:file" || file.type === "registry:page"
          ? {
              path: file.sourceFileName,
              type: file.type,
              content,
              target: destinationPath ?? file.sourceFileName,
            }
          : {
              path: file.sourceFileName,
              type: file.type,
              content,
              ...(destinationPath ? { target: destinationPath } : {}),
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

/**
 * Template transformation utilities for handling handlebars syntax in shadcn CLI
 */

/**
 * Mapping of handlebars expressions to TypeScript-safe placeholder tokens
 */
const HANDLEBARS_PLACEHOLDERS = {
  "{{schema.schemaName}}": "__HB_SCHEMA_NAME__",
  "{{schema.sourceName}}": "__HB_SOURCE_NAME__",
  "{{schema.clientSuffix}}": "__HB_CLIENT_SUFFIX__",
  // Add more mappings as needed
} as const;

/**
 * Converts handlebars expressions in template content to TypeScript-safe placeholder tokens
 * This allows the shadcn CLI to process the templates without TypeScript parsing errors
 */
export function encodeHandlebarsForShadcn(content: string): string {
  let result = content;

  // Replace specific handlebars expressions with placeholder tokens
  for (const [handlebars, placeholder] of Object.entries(HANDLEBARS_PLACEHOLDERS)) {
    result = result.replace(new RegExp(escapeRegExp(handlebars), "g"), placeholder);
  }

  return result;
}

/**
 * Converts placeholder tokens back to handlebars expressions
 * This is used by the CLI after shadcn has processed the templates
 */
export function decodeHandlebarsFromShadcn(content: string): string {
  let result = content;

  // Replace placeholder tokens back to handlebars expressions
  for (const [handlebars, placeholder] of Object.entries(HANDLEBARS_PLACEHOLDERS)) {
    result = result.replace(new RegExp(escapeRegExp(placeholder), "g"), handlebars);
  }

  return result;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Enhanced version of getStaticComponent that applies handlebars encoding for shadcn compatibility
 */
export async function getStaticComponentForShadcn(
  namePath: string,
  options?: { routeName?: string; templatesPath?: string },
): Promise<RegistryItem> {
  const component = await getStaticComponent(namePath, options);

  // Apply handlebars encoding to files that need it
  const encodedFiles = component.files?.map((file) => {
    // Only encode handlebars files that might contain problematic expressions
    if (file.path.endsWith(".hbs") || file.path.endsWith(".tsx") || file.path.endsWith(".ts")) {
      return {
        ...file,
        content: encodeHandlebarsForShadcn(file.content ?? ""),
      };
    }
    return file;
  });

  return {
    ...component,
    files: encodedFiles,
  };
}
