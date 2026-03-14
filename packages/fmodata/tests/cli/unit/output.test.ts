import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { printError, printResult } from "../../../src/cli/utils/output";

describe("printResult", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("prints JSON by default", () => {
    const data = [{ name: "Alice", age: 30 }];
    printResult(data, { pretty: false });
    expect(stdoutSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
  });

  it("prints table for array of objects", () => {
    const data = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    printResult(data, { pretty: true });
    const output = stdoutSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("name");
    expect(output).toContain("age");
    expect(output).toContain("Alice");
    expect(output).toContain("Bob");
  });

  it("prints key-value table for single object", () => {
    const data = { status: "ok", count: 42 };
    printResult(data, { pretty: true });
    const output = stdoutSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("Key");
    expect(output).toContain("Value");
    expect(output).toContain("status");
    expect(output).toContain("ok");
  });

  it("prints single-column table for primitive arrays in table mode", () => {
    printResult(["a", "b", "c"], { pretty: true });
    const output = stdoutSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("Value");
    expect(output).toContain("a");
    expect(output).toContain("b");
    expect(output).toContain("c");
  });
});

describe("printError", () => {
  it("writes to stderr and exits", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    expect(() => printError(new Error("something went wrong"))).toThrow("process.exit called");
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("something went wrong"));
    expect(exitSpy).toHaveBeenCalledWith(1);

    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
