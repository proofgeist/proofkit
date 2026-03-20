import { afterEach, describe, expect, it, vi } from "vitest";
import { parseNameAndPath } from "~/utils/parseNameAndPath.js";
import { validateAppName } from "~/utils/validateAppName.js";

describe("legacy project name utils", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes the current directory name when parsing '.'", () => {
    vi.spyOn(process, "cwd").mockReturnValue("/tmp/My App");
    expect(parseNameAndPath(".")).toEqual(["my-app", "."]);
  });

  it("validates the normalized current directory name for '.'", () => {
    vi.spyOn(process, "cwd").mockReturnValue("/tmp/My App");
    expect(validateAppName(".")).toBeUndefined();
  });
});
