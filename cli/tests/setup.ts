import { execSync } from "child_process";
import path, { join } from "path";
import dotenv from "dotenv";
import { beforeAll } from "vitest";

beforeAll(() => {
  // Ensure test environment variables are loaded
  dotenv.config({ path: path.resolve(__dirname, "../.env.test") });
});

// Build the CLI before running any tests
execSync("pnpm build", { cwd: join(__dirname, "..") });
