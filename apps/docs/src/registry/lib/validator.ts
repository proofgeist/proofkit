import fs from "fs";
import path from "path";
import createJiti from "jiti";
import { templateMetadataSchema, type TemplateMetadata } from "./types";

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

export function validateRegistry() {
  const templatesPath = path.join(process.cwd(), "src/registry/templates");
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

        // Validate the metadata structure using zod schema
        const validationResult = templateMetadataSchema.safeParse(meta);
        if (!validationResult.success) {
          throw new Error(
            `Template ${rel}: Invalid metadata structure:\n${validationResult.error.issues
              .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
              .join("\n")}`,
          );
        }

        // Validate that declared files actually exist
        const templateDir = path.join(templatesPath, rel);
        const actualFiles = fs
          .readdirSync(templateDir)
          .filter((f) => f !== "_meta.ts");
        const declaredFiles = validationResult.data.files.map(
          (f) => f.sourceFileName,
        );

        for (const declaredFile of declaredFiles) {
          if (!actualFiles.includes(declaredFile)) {
            throw new Error(
              `Template ${rel}: Declared file '${declaredFile}' does not exist`,
            );
          }
        }

        // Check if template has content files
        if (actualFiles.length === 0) {
          throw new Error(`Template ${rel} has no content files`);
        }
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
