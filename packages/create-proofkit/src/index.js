#!/usr/bin/env node

import { execa } from "execa";
import { getUserPkgManager } from "./getUserPkgManager.js";

async function main() {
  const args = process.argv.slice(2);

  const pkgManager = getUserPkgManager();
  const pkgManagerCmd =
    pkgManager === "pnpm"
      ? "pnpx"
      : pkgManager === "bun"
        ? "bunx"
        : pkgManager === "npm"
          ? "npx"
          : pkgManager;

  try {
    await execa(pkgManagerCmd, ["@proofkit/cli@latest", "init", ...args], {
      stdio: "inherit",
      env: {
        ...process.env,
        FORCE_COLOR: "1", // Preserve colors in output
      },
    });
  } catch (error) {
    console.error("Failed to create project");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Failed to create project");
  process.exit(1);
});
