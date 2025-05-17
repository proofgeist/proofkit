import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { verifyProjectBuilds } from "./test-utils";

describe("Non-Interactive CLI Tests", () => {
  // Use root-level tmp directory for test outputs
  const testDir = join(__dirname, "..", "..", "tmp", "cli-tests");
  const cliPath = join(__dirname, "..", "dist", "index.js");

  // Parse test environment variables
  const testEnv = z
    .object({
      OTTO_SERVER_URL: z.string().url(),
      OTTO_ADMIN_API_KEY: z.string().min(1),
      FM_DATA_API_KEY: z.string().min(1),
      FM_FILE_NAME: z.string().min(1),
      FM_LAYOUT_NAME: z.string().min(1),
    })
    .parse(process.env);

  beforeEach(() => {
    // Ensure the test directory exists
    mkdirSync(testDir, { recursive: true });
  });

  it("should create a project with FileMaker integration in CI mode", () => {
    const projectName = "test-fm-project";

    // Build the command with all necessary flags for non-interactive mode
    const command = [
      `node "${cliPath}" init`,
      projectName,
      "--ci",
      "--appType browser",
      "--dataSource filemaker",
      `--server "${testEnv.OTTO_SERVER_URL}"`,
      `--adminApiKey "${testEnv.OTTO_ADMIN_API_KEY}"`,
      `--dataApiKey "${testEnv.FM_DATA_API_KEY}"`,
      `--fileName "${testEnv.FM_FILE_NAME}"`,
      `--layoutName "${testEnv.FM_LAYOUT_NAME}"`,
      "--noGit", // Skip git initialization for testing
    ].join(" ");

    // Execute the command
    expect(() => {
      execSync(command, {
        cwd: testDir,
        env: {
          ...process.env,
          CI: "true",
        },
        encoding: "utf-8",
      });
    }).not.toThrow();

    const projectDir = join(testDir, projectName);

    // Verify project structure
    expect(existsSync(projectDir)).toBe(true);
    expect(existsSync(join(projectDir, "package.json"))).toBe(true);
    expect(existsSync(join(projectDir, "proofkit.json"))).toBe(true);
    expect(existsSync(join(projectDir, ".env"))).toBe(true);

    // Verify package.json content
    const pkgJson = JSON.parse(
      readFileSync(join(projectDir, "package.json"), "utf-8")
    );
    expect(pkgJson.name).toBe(projectName);

    // Verify proofkit.json content
    const proofkitConfig = JSON.parse(
      readFileSync(join(projectDir, "proofkit.json"), "utf-8")
    );
    expect(proofkitConfig.appType).toBe("browser");
    expect(proofkitConfig.dataSources).toContainEqual(
      expect.objectContaining({
        type: "fm",
        name: "filemaker",
      })
    );

    // Verify the project can be built successfully
    verifyProjectBuilds(projectDir);
  });
});
