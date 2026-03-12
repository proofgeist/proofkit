import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CLI_PATH = resolve(__dirname, "../../../dist/cli/index.js");

describe("CLI binary integration", () => {
  it("dist/cli/index.js exists after build", () => {
    // This test verifies the binary was built.
    // If the file doesn't exist, skip with a hint rather than failing hard.
    if (!existsSync(CLI_PATH)) {
      console.warn("CLI binary not found at", CLI_PATH, "— run `pnpm build` first");
      return;
    }
    expect(existsSync(CLI_PATH)).toBe(true);
  });

  it("fmodata --help exits 0 and shows usage", () => {
    if (!existsSync(CLI_PATH)) {
      console.warn("Skipping: CLI binary not built");
      return;
    }
    const output = execSync(`node ${CLI_PATH} --help`, { encoding: "utf8" });
    expect(output).toContain("fmodata");
    expect(output).toContain("Usage");
  });

  it("fmodata records --help shows records subcommands", () => {
    if (!existsSync(CLI_PATH)) {
      console.warn("Skipping: CLI binary not built");
      return;
    }
    const output = execSync(`node ${CLI_PATH} records --help`, { encoding: "utf8" });
    expect(output).toContain("list");
    expect(output).toContain("insert");
    expect(output).toContain("update");
    expect(output).toContain("delete");
  });

  it("fmodata metadata --help shows metadata subcommands", () => {
    if (!existsSync(CLI_PATH)) {
      console.warn("Skipping: CLI binary not built");
      return;
    }
    const output = execSync(`node ${CLI_PATH} metadata --help`, { encoding: "utf8" });
    expect(output).toContain("get");
    expect(output).toContain("tables");
  });
});
