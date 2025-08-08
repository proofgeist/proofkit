import { defineConfig } from "tsdown";

// Run validation before build starts
console.log("🔍 Validating registry before build...");
try {
  const { validateRegistry } = await import("./lib/validator.js");
  validateRegistry();
  console.log("✅ Registry validation completed successfully");
} catch (error) {
  console.error("❌ Registry validation failed:");
  console.error(error);
  process.exit(1);
}

export default defineConfig({
  entry: ["lib/index.ts"],
  outDir: "dist/lib",
  format: ["esm"],
  clean: true,
  dts: false,
  sourcemap: true,
  onSuccess: async () => {
    // Copy templates to dist directory after successful build
    console.log("📁 Copying templates to dist...");
    try {
      const { execSync } = await import("child_process");
      execSync("cp -r templates dist/", { stdio: "inherit" });
      console.log("✅ Templates copied successfully");
    } catch (error) {
      console.error("❌ Failed to copy templates:");
      console.error(error);
      throw error;
    }
  },
});
