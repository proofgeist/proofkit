import { cpSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, "..");
const webDistDir = join(rootDir, "web", "dist");
const distWebDir = join(rootDir, "dist", "web");

if (existsSync(webDistDir)) {
  console.log("Copying web assets to dist/web...");
  cpSync(webDistDir, distWebDir, { recursive: true });
  console.log("Build complete!");
} else {
  console.warn("Web dist directory not found, skipping copy");
}
