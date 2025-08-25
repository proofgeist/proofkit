import path from "path";
import { fileURLToPath } from "url";
import fsExtra from "fs-extra";
import { defineConfig } from "tsdown";

const { readJSONSync } = fsExtra;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = process.env.npm_lifecycle_event === "dev";

// Read package versions at build time
const readPackageVersion = (packagePath: string) => {
  const packageJsonPath = path.join(
    __dirname,
    "..",
    packagePath,
    "package.json"
  );
  const packageJson = readJSONSync(packageJsonPath);
  if (!packageJson.version) {
    throw new Error(`No version found in ${packageJsonPath}`);
  }
  return packageJson.version;
};

const FMDAPI_VERSION = readPackageVersion("fmdapi");
const BETTER_AUTH_VERSION = readPackageVersion("better-auth");

export default defineConfig({
  clean: true,
  entry: ["src/index.ts"],
  format: ["esm"],
  minify: !isDev,
  target: "esnext",
  outDir: "dist",
  // Bundle workspace dependencies that shouldn't be external
  noExternal: ["@proofkit/registry"],
  // Keep Node.js built-in module imports as-is for better compatibility
  nodeProtocol: false,
  // Inject package versions and registry URL at build time
  define: {
    __FMDAPI_VERSION__: JSON.stringify(FMDAPI_VERSION),
    __BETTER_AUTH_VERSION__: JSON.stringify(BETTER_AUTH_VERSION),
    __REGISTRY_URL__: JSON.stringify(
      isDev ? "http://localhost:3005" : "https://proofkit.dev"
    ),
  },
  onSuccess: isDev ? "node dist/index.js" : undefined,
});
