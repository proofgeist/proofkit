import { execFileSync, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.join(__dirname, "..");
const distEntry = path.join(packageDir, "dist/index.js");

function buildCli() {
  execFileSync("pnpm", ["build"], {
    cwd: packageDir,
    stdio: "pipe",
    encoding: "utf8",
  });
}

describe("proofkit-new CLI", () => {
  it("shows kebab-case init flags in help", () => {
    buildCli();
    const output = execFileSync("node", [distEntry, "init", "--help"], {
      cwd: packageDir,
      stdio: "pipe",
      encoding: "utf8",
    });

    expect(output).toContain("--app-type");
    expect(output).toContain("--non-interactive");
    expect(output).toContain("--no-install");
    expect(output).toContain("--no-git");
    expect(output).not.toContain("--appType");
  });

  it("prints the header and coming-soon message when run inside a ProofKit project", async () => {
    buildCli();
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "proofkit-new-cli-project-"));
    await fs.writeJson(path.join(cwd, "proofkit.json"), {
      appType: "browser",
      ui: "shadcn",
      dataSources: [],
      replacedMainPage: false,
      registryTemplates: [],
    });

    const output = execFileSync("node", [distEntry], {
      cwd,
      stdio: "pipe",
      encoding: "utf8",
    });

    expect(output).toContain("_______");
    expect(output).toContain("Found");
    expect(output).toContain("Coming soon");
  });

  it("fails with guidance when no command is used in non-interactive mode", () => {
    buildCli();
    const result = spawnSync("node", [distEntry, "--non-interactive"], {
      cwd: packageDir,
      stdio: "pipe",
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain("interactive-only in non-interactive mode");
    expect(`${result.stdout}\n${result.stderr}`).toContain("proofkit-new init <name> --non-interactive");
  });
});
