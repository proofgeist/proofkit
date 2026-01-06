import { execSync } from "node:child_process";

/**
 * Verifies that a project at the given directory can be built without errors
 * @param projectDir The directory containing the project to build
 * @throws If the build fails
 */
export function verifyProjectBuilds(projectDir: string): void {
  console.log(`\nVerifying project build in ${projectDir}...`);

  try {
    console.log("Installing dependencies...");
    // Run pnpm install while ignoring workspace settings
    execSync("pnpm install --prefer-offline --ignore-workspace", {
      cwd: projectDir,
      stdio: "inherit",
      encoding: "utf-8",
      env: {
        ...process.env,
        PNPM_DEBUG: "1", // Enable debug logging
      },
    });

    console.log("Building project...");
    execSync("pnpm build", {
      cwd: projectDir,
      stdio: "inherit",
      encoding: "utf-8",
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
      },
    });
  } catch (error) {
    console.error("Build process failed:", error);
    throw error;
  }
}
