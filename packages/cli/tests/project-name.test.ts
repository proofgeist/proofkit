import { afterEach, describe, expect, it, vi } from "vitest";
import { parseNameAndPath, validateAppName } from "~/utils/projectName.js";

describe("projectName utils", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes Windows-style separators when parsing the app name and directory", () => {
    expect(parseNameAndPath("apps\\my-app")).toEqual(["my-app", "apps/my-app"]);
    expect(parseNameAndPath(".\\my-app\\")).toEqual(["my-app", "./my-app"]);
  });

  it("converts spaces to dashes when parsing the app name and directory", () => {
    expect(parseNameAndPath("my app")).toEqual(["my-app", "my-app"]);
    expect(validateAppName("my app")).toBeUndefined();
  });

  it("preserves leading directory casing while normalizing only the package segment", () => {
    expect(parseNameAndPath("Apps Folder/My App")).toEqual(["my-app", "Apps Folder/my-app"]);
  });

  it("normalizes scoped package segments without lowercasing leading directories", () => {
    expect(parseNameAndPath("Apps Folder/@My Scope/My App")).toEqual([
      "@my-scope/my-app",
      "Apps Folder/@my-scope/my-app",
    ]);
  });

  it("validates the actual current directory name when projectName is '.'", () => {
    vi.spyOn(process, "cwd").mockReturnValue("/tmp/My App");
    expect(validateAppName(".")).toBeUndefined();
  });

  it("accepts '.' when the current directory name is valid", () => {
    vi.spyOn(process, "cwd").mockReturnValue("/tmp/my-app");
    expect(validateAppName(".")).toBeUndefined();
  });

  it("normalizes the current directory name when parsing '.'", () => {
    vi.spyOn(process, "cwd").mockReturnValue("/tmp/My App");
    expect(parseNameAndPath(".")).toEqual(["my-app", "."]);
  });
});
