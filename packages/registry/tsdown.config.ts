import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["lib/index.ts"],
  outDir: "dist/lib",
  format: ["esm"],
  clean: true,
  dts: true,
  sourcemap: true,
  onSuccess: async () => {
    // Copy templates to dist directory after successful build
    console.log("📁 Copying templates to dist...");
    try {
      const { execSync } = await import("child_process");
      const fs = await import("fs");
      const path = await import("path");

      execSync("cp -r templates dist/", { stdio: "inherit" });
      console.log("✅ Templates copied successfully");

      // Find and rename the hashed .d.ts file to index.d.ts
      const distLib = "dist/lib";
      const files = fs.readdirSync(distLib);
      const dtsFile = files.find((f) => f.match(/^index-.+\.d\.ts$/));
      const dtsMapFile = files.find((f) => f.match(/^index-.+\.d\.ts\.map$/));

      if (dtsFile) {
        fs.renameSync(
          path.join(distLib, dtsFile),
          path.join(distLib, "index.d.ts"),
        );
        console.log(`✅ Renamed ${dtsFile} to index.d.ts`);
      }

      if (dtsMapFile) {
        fs.renameSync(
          path.join(distLib, dtsMapFile),
          path.join(distLib, "index.d.ts.map"),
        );
        console.log(`✅ Renamed ${dtsMapFile} to index.d.ts.map`);
      }
    } catch (error) {
      console.error("❌ Failed to copy templates:");
      console.error(error);
      throw error;
    }
  },
});
