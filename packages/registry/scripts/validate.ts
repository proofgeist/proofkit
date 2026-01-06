#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import createJiti from "jiti";

// Run validation before build starts
console.log("🔍 Validating registry before build...");
try {
  // Use jiti to load TypeScript source directly (since the compiled JS doesn't exist yet)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const validatorPath = path.resolve(__dirname, "../lib/validator.ts");

  const jiti = createJiti(__filename, {
    interopDefault: true,
    requireCache: false,
  });
  const validatorModule = jiti(validatorPath);
  const { validateRegistry } = validatorModule;
  validateRegistry();
  console.log("✅ Registry validation completed successfully");
} catch (error) {
  console.error("❌ Registry validation failed:");
  console.error(error);
  process.exit(1);
}
