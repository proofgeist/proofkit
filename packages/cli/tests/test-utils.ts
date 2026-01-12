import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Replaces @proofkit/* package versions with "latest" in package.json
 * This fixes CI issues where scaffolded projects reference unpublished versions
 */
function useLatestProofkitVersions(projectDir: string): void {
  const pkgPath = join(projectDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

  const replaceProofkitVersions = (deps: Record<string, string> | undefined) => {
    if (!deps) {
      return;
    }
    for (const name of Object.keys(deps)) {
      if (name.startsWith("@proofkit/")) {
        console.log(`  Replacing ${name}@${deps[name]} with latest`);
        deps[name] = "latest";
      }
    }
  };

  console.log("Using latest published @proofkit/* versions...");
  replaceProofkitVersions(pkg.dependencies);
  replaceProofkitVersions(pkg.devDependencies);

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
}

/**
 * Verifies that a project at the given directory can be built without errors
 * @param projectDir The directory containing the project to build
 * @throws If the build fails
 */
export function verifyProjectBuilds(projectDir: string): void {
  console.log(`\nVerifying project build in ${projectDir}...`);

  try {
    // Replace unpublished @proofkit versions with latest
    useLatestProofkitVersions(projectDir);

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
