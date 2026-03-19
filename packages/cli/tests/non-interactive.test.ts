import { describe, expect, it } from "vitest";
import { detectNonInteractiveTerminal, resolveNonInteractiveMode } from "~/utils/nonInteractive.js";

describe("non-interactive detection", () => {
  it("treats piped terminals as non-interactive", () => {
    expect(
      detectNonInteractiveTerminal({
        stdinIsTTY: false,
        stdoutIsTTY: true,
        env: {},
      }),
    ).toBe(true);
  });

  it("treats TERM=dumb as non-interactive", () => {
    expect(
      detectNonInteractiveTerminal({
        stdinIsTTY: true,
        stdoutIsTTY: true,
        env: { TERM: "dumb" },
      }),
    ).toBe(true);
  });

  it("treats coding-agent env vars as non-interactive even with a tty", () => {
    expect(
      detectNonInteractiveTerminal({
        stdinIsTTY: true,
        stdoutIsTTY: true,
        env: { CODEX: "1" },
      }),
    ).toBe(true);
  });

  it("keeps real terminals interactive when no signals are present", () => {
    expect(
      detectNonInteractiveTerminal({
        stdinIsTTY: true,
        stdoutIsTTY: true,
        env: {},
      }),
    ).toBe(false);
  });

  it("lets explicit flags force non-interactive mode", () => {
    expect(
      resolveNonInteractiveMode({
        nonInteractive: true,
        stdinIsTTY: true,
        stdoutIsTTY: true,
        env: {},
      }),
    ).toBe(true);
    expect(
      resolveNonInteractiveMode({
        CI: true,
        stdinIsTTY: true,
        stdoutIsTTY: true,
        env: {},
      }),
    ).toBe(true);
  });
});
