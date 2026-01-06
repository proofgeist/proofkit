#!/usr/bin/env node

import { execa } from "execa";
import { getUserPkgManager } from "./getUserPkgManager.js";

async function main() {
  const args = process.argv.slice(2);

  const pkgManager = getUserPkgManager();
  let pkgManagerCmd;
  if (pkgManager === "pnpm") {
    pkgManagerCmd = "pnpx";
  } else if (pkgManager === "bun") {
    pkgManagerCmd = "bunx";
  } else if (pkgManager === "npm") {
    pkgManagerCmd = "npx";
  } else {
    pkgManagerCmd = pkgManager;
  }

  try {
    await execa(pkgManagerCmd, ["@proofkit/cli@latest", "init", ...args], {
      stdio: "inherit",
      env: {
        ...process.env,
        FORCE_COLOR: "1", // Preserve colors in output
      },
    });
  } catch {
    console.error("Failed to create project");
    process.exit(1);
  }
}

main().catch(() => {
  console.error("Failed to create project");
  process.exit(1);
});
