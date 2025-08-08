import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import createJiti from "jiti";
import { templateMetadataSchema, type TemplateMetadata } from "./types.js";

export interface ValidationContext {
  templatesPath: string;
  templateName: string;
  templateDir: string;
}

/**
 * Check if a registry template path is valid
 */
export function isValidRegistryTemplate(
  templatePath: string,
  templatesPath: string,
): boolean {
  const fullTemplatePath = path.join(templatesPath, templatePath);
  const metaPath = path.join(fullTemplatePath, "_meta.ts");
  return fs.existsSync(metaPath);
}

/**
 * Validate a single template metadata object
 */
export function validateTemplateMetadata(
  meta: unknown,
  context: ValidationContext,
): void {
  // Validate the metadata structure using zod schema
  const validationResult = templateMetadataSchema.safeParse(meta);
  if (!validationResult.success) {
    throw new Error(
      `Template ${context.templateName}: Invalid metadata structure:\n${validationResult.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`,
    );
  }

  const validatedMeta = validationResult.data;

  // Validate that declared files actually exist
  const actualFiles = fs
    .readdirSync(context.templateDir)
    .filter((f) => f !== "_meta.ts");
  const declaredFiles = validatedMeta.files.map((f) => f.sourceFileName);

  for (const declaredFile of declaredFiles) {
    if (!actualFiles.includes(declaredFile)) {
      throw new Error(
        `Template ${context.templateName}: Declared file '${declaredFile}' does not exist`,
      );
    }
  }

  // Check if template has content files when it declares files
  // Templates with empty files array in metadata are valid (e.g., dependency-only templates)
  if (declaredFiles.length > 0 && actualFiles.length === 0) {
    throw new Error(
      `Template ${context.templateName} declares files but has no content files`,
    );
  }

  // Validate registryDependencies references (only ProofKit registry references)
  if (validatedMeta.registryDependencies) {
    for (const registryRef of validatedMeta.registryDependencies) {
      if (registryRef.startsWith("{proofkit}/r/")) {
        const templatePath = registryRef.replace("{proofkit}/r/", "");
        if (!isValidRegistryTemplate(templatePath, context.templatesPath)) {
          throw new Error(
            `Template ${context.templateName}: Invalid registryDependencies reference '${registryRef}' - template does not exist in the registry`,
          );
        }
      }
      // Non-ProofKit registry dependencies are not validated
    }
  }
}

function getTemplateDirs(root: string, prefix = ""): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirPath = path.join(root, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const files = fs.readdirSync(dirPath);
    if (files.includes("_meta.ts")) {
      result.push(rel);
    }
    // Recurse for nested templates
    const nested = getTemplateDirs(dirPath, rel);
    result.push(...nested);
  }
  return result;
}

export function validateRegistry(): void {
  // Find the templates path relative to this module
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const templatesPath = path.resolve(__dirname, "../templates");
  const jiti = createJiti(__filename, {
    interopDefault: true,
    requireCache: false,
  });

  try {
    const templateDirs = getTemplateDirs(templatesPath);

    for (const rel of templateDirs) {
      const metaPath = path.join(templatesPath, rel, "_meta.ts");

      // Check if meta file exists
      if (!fs.existsSync(metaPath)) {
        throw new Error(`Template ${rel} is missing _meta.ts file`);
      }

      // Load and validate the meta file using jiti
      try {
        const metaModule = jiti(metaPath);
        const meta =
          metaModule.meta || metaModule.default?.meta || metaModule.default;

        if (!meta) {
          throw new Error(
            `Template ${rel}: _meta.ts must export a 'meta' object`,
          );
        }

        // Use the refactored validation function
        const context: ValidationContext = {
          templatesPath,
          templateName: rel,
          templateDir: path.join(templatesPath, rel),
        };

        validateTemplateMetadata(meta, context);
      } catch (loadError) {
        if (
          loadError instanceof Error &&
          loadError.message.includes("Template")
        ) {
          throw loadError; // Re-throw our custom errors
        }
        throw new Error(
          `Template ${rel}: Failed to load _meta.ts - ${loadError}`,
        );
      }
    }

    console.log(
      `✅ Registry validation passed for ${templateDirs.length} templates`,
    );
  } catch (err) {
    console.error("Registry validation failed:", err);
    throw err; // stop the build
  }
}
