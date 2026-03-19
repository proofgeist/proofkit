import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { resolveInitRequest } from "~/core/resolveInitRequest.js";
import { type ConsoleTranscript, makeTestLayer, type PromptTranscript } from "./test-layer.js";

describe("resolveInitRequest", () => {
  it("fails for missing project name in non-interactive mode", async () => {
    await expect(
      Effect.runPromise(
        resolveInitRequest(undefined, {
          noGit: true,
          noInstall: true,
          force: false,
          default: false,
          importAlias: "~/",
          CI: true,
        }).pipe(
          makeTestLayer({
            cwd: "/tmp",
            packageManager: "pnpm",
          }),
        ),
      ),
    ).rejects.toThrow("Project name is required in non-interactive mode.");
  });

  it("fails for incomplete non-interactive filemaker inputs", async () => {
    await expect(
      Effect.runPromise(
        resolveInitRequest("demo", {
          noGit: true,
          noInstall: true,
          force: false,
          default: false,
          importAlias: "~/",
          CI: true,
          appType: "browser",
          dataSource: "filemaker",
          server: "https://example.com",
        }).pipe(
          makeTestLayer({
            cwd: "/tmp",
            packageManager: "pnpm",
          }),
        ),
      ),
    ).rejects.toThrow("--file-name, --data-api-key");
  });

  it("fails when only one of layout-name and schema-name is provided", async () => {
    await expect(
      Effect.runPromise(
        resolveInitRequest("demo", {
          noGit: true,
          noInstall: true,
          force: false,
          default: false,
          importAlias: "~/",
          CI: true,
          appType: "browser",
          dataSource: "filemaker",
          layoutName: "API_Contacts",
        }).pipe(
          makeTestLayer({
            cwd: "/tmp",
            packageManager: "pnpm",
          }),
        ),
      ),
    ).rejects.toThrow("Both --layout-name and --schema-name must be provided together.");
  });

  it("resolves an interactive filemaker request from prompt responses", async () => {
    const request = await Effect.runPromise(
      resolveInitRequest(undefined, {
        noGit: true,
        noInstall: true,
        force: false,
        default: false,
        importAlias: "~/",
        CI: false,
      }).pipe(
        makeTestLayer({
          cwd: "/tmp",
          packageManager: "pnpm",
          nonInteractive: false,
          prompts: {
            text: ["interactive-app", "https://fm.example.com", "reportingContacts"],
            select: ["webviewer", "hosted"],
            searchSelect: ["Contacts.fmp12", "dk_existing", "API_Contacts"],
            confirm: [true],
          },
        }),
      ),
    );

    expect(request.projectName).toBe("interactive-app");
    expect(request.appType).toBe("webviewer");
    expect(request.dataSource).toBe("filemaker");
    expect(request.fileMaker).toMatchObject({
      mode: "hosted-otto",
      server: "https://fm.example.com",
      fileName: "Contacts.fmp12",
      dataApiKey: "dk_existing",
      schemaName: "reportingContacts",
    });
  });

  it("marks explicit filemaker inputs in non-interactive mode", async () => {
    const request = await Effect.runPromise(
      resolveInitRequest("demo", {
        noGit: true,
        noInstall: true,
        force: false,
        default: false,
        importAlias: "~/",
        CI: true,
        appType: "webviewer",
        dataSource: "filemaker",
        server: "https://fm.example.com",
        fileName: "Contacts.fmp12",
        dataApiKey: "dk_123",
        layoutName: "API_Contacts",
        schemaName: "Contacts",
      }).pipe(
        makeTestLayer({
          cwd: "/tmp",
          packageManager: "pnpm",
        }),
      ),
    );

    expect(request.hasExplicitFileMakerInputs).toBe(true);
    expect(request.fileMaker).toMatchObject({
      mode: "hosted-otto",
      server: "https://fm.example.com",
      fileName: "Contacts.fmp12",
      dataApiKey: "dk_123",
      layoutName: "API_Contacts",
      schemaName: "Contacts",
    });
  });

  it("uses local fm http for webviewer setup when available", async () => {
    const consoleTranscript: ConsoleTranscript = {
      info: [],
      warn: [],
      error: [],
      success: [],
      note: [],
    };

    const request = await Effect.runPromise(
      resolveInitRequest("demo", {
        noGit: true,
        noInstall: true,
        force: false,
        default: false,
        importAlias: "~/",
        CI: false,
        appType: "webviewer",
        dataSource: "filemaker",
      }).pipe(
        makeTestLayer({
          cwd: "/tmp",
          packageManager: "pnpm",
          nonInteractive: false,
          console: consoleTranscript,
          fileMaker: {
            localFmMcp: {
              healthy: true,
              connectedFiles: ["LocalFile.fmp12"],
            },
          },
        }),
      ),
    );

    expect(request.fileMaker).toMatchObject({
      mode: "local-fm-mcp",
      fileName: "LocalFile.fmp12",
    });
    expect(consoleTranscript.info).toContain("Using local ProofKit MCP file: LocalFile.fmp12");
  });

  it("asks which local FileMaker file to use when multiple are open", async () => {
    const promptTranscript: PromptTranscript = {
      text: [],
      password: [],
      select: [],
      searchSelect: [],
      multiSearchSelect: [],
      confirm: [],
    };

    const request = await Effect.runPromise(
      resolveInitRequest("demo", {
        noGit: true,
        noInstall: true,
        force: false,
        default: false,
        importAlias: "~/",
        CI: false,
        appType: "webviewer",
        dataSource: "filemaker",
      }).pipe(
        makeTestLayer({
          cwd: "/tmp",
          packageManager: "pnpm",
          nonInteractive: false,
          prompts: {
            searchSelect: ["B.fmp12"],
          },
          promptTranscript,
          fileMaker: {
            localFmMcp: {
              healthy: true,
              connectedFiles: ["A.fmp12", "B.fmp12"],
            },
          },
        }),
      ),
    );

    expect(request.fileMaker).toMatchObject({
      mode: "local-fm-mcp",
      fileName: "B.fmp12",
    });
    expect(promptTranscript.searchSelect).toContain(
      "Multiple FileMaker files are open. Which file should ProofKit use?",
    );
  });

  it("fails in non-interactive mode when multiple local FileMaker files are open without --file-name", async () => {
    await expect(
      Effect.runPromise(
        resolveInitRequest("demo", {
          noGit: true,
          noInstall: true,
          force: false,
          default: false,
          importAlias: "~/",
          CI: true,
          appType: "webviewer",
          dataSource: "filemaker",
        }).pipe(
          makeTestLayer({
            cwd: "/tmp",
            packageManager: "pnpm",
            fileMaker: {
              localFmMcp: {
                healthy: true,
                connectedFiles: ["A.fmp12", "B.fmp12"],
              },
            },
          }),
        ),
      ),
    ).rejects.toThrow(
      "Multiple FileMaker files are connected to the local ProofKit MCP Server. Pass --file-name with one of: A.fmp12, B.fmp12.",
    );
  });

  it("uses --file-name for non-interactive local MCP selection when multiple files are open", async () => {
    const request = await Effect.runPromise(
      resolveInitRequest("demo", {
        noGit: true,
        noInstall: true,
        force: false,
        default: false,
        importAlias: "~/",
        CI: true,
        appType: "webviewer",
        dataSource: "filemaker",
        fileName: "B.fmp12",
      }).pipe(
        makeTestLayer({
          cwd: "/tmp",
          packageManager: "pnpm",
          fileMaker: {
            localFmMcp: {
              healthy: true,
              connectedFiles: ["A.fmp12", "B.fmp12"],
            },
          },
        }),
      ),
    );

    expect(request.fileMaker).toMatchObject({
      mode: "local-fm-mcp",
      fileName: "B.fmp12",
    });
  });

  it("fails when --file-name does not match a connected local FileMaker file", async () => {
    await expect(
      Effect.runPromise(
        resolveInitRequest("demo", {
          noGit: true,
          noInstall: true,
          force: false,
          default: false,
          importAlias: "~/",
          CI: true,
          appType: "webviewer",
          dataSource: "filemaker",
          fileName: "Missing.fmp12",
        }).pipe(
          makeTestLayer({
            cwd: "/tmp",
            packageManager: "pnpm",
            fileMaker: {
              localFmMcp: {
                healthy: true,
                connectedFiles: ["A.fmp12", "B.fmp12"],
              },
            },
          }),
        ),
      ),
    ).rejects.toThrow(
      'FileMaker file "Missing.fmp12" is not currently connected to the local ProofKit MCP Server. Connected files: A.fmp12, B.fmp12.',
    );
  });

  it("prompts to retry when Proofkit MCP is running but no FileMaker file is open", async () => {
    const promptTranscript: PromptTranscript = {
      text: [],
      password: [],
      select: [],
      searchSelect: [],
      multiSearchSelect: [],
      confirm: [],
    };

    const request = await Effect.runPromise(
      resolveInitRequest("demo", {
        noGit: true,
        noInstall: true,
        force: false,
        default: false,
        importAlias: "~/",
        CI: false,
        appType: "webviewer",
        dataSource: "filemaker",
      }).pipe(
        makeTestLayer({
          cwd: "/tmp",
          packageManager: "pnpm",
          nonInteractive: false,
          prompts: {
            select: ["skip"],
          },
          promptTranscript,
          fileMaker: {
            localFmMcp: {
              healthy: true,
              connectedFiles: [],
            },
          },
        }),
      ),
    );

    expect(request.fileMaker).toBeUndefined();
    expect(request.skipFileMakerSetup).toBe(true);
    expect(promptTranscript.select).toContainEqual({
      message:
        "ProofKit MCP Server is running, but no FileMaker file is open yet. Open one, then choose how to continue.",
      options: ["retry", "hosted", "skip"],
    });
  });

  it("retries local MCP detection, then reports the connected file", async () => {
    const consoleTranscript: ConsoleTranscript = {
      info: [],
      warn: [],
      error: [],
      success: [],
      note: [],
    };

    const request = await Effect.runPromise(
      resolveInitRequest("demo", {
        noGit: true,
        noInstall: true,
        force: false,
        default: false,
        importAlias: "~/",
        CI: false,
        appType: "webviewer",
        dataSource: "filemaker",
      }).pipe(
        makeTestLayer({
          cwd: "/tmp",
          packageManager: "pnpm",
          nonInteractive: false,
          prompts: {
            select: ["retry"],
          },
          console: consoleTranscript,
          fileMaker: {
            localFmMcp: [
              {
                healthy: true,
                connectedFiles: [],
              },
              {
                healthy: true,
                connectedFiles: ["RetryConnected.fmp12"],
              },
            ],
          },
        }),
      ),
    );

    expect(request.fileMaker).toMatchObject({
      mode: "local-fm-mcp",
      fileName: "RetryConnected.fmp12",
    });
    expect(consoleTranscript.info).toContain("Using local ProofKit MCP file: RetryConnected.fmp12");
  });

  it("fails with a specific non-interactive error when Proofkit MCP is running but no FileMaker file is open", async () => {
    await expect(
      Effect.runPromise(
        resolveInitRequest("demo", {
          noGit: true,
          noInstall: true,
          force: false,
          default: false,
          importAlias: "~/",
          CI: true,
          appType: "webviewer",
          dataSource: "filemaker",
        }).pipe(
          makeTestLayer({
            cwd: "/tmp",
            packageManager: "pnpm",
            fileMaker: {
              localFmMcp: {
                healthy: true,
                connectedFiles: [],
              },
            },
          }),
        ),
      ),
    ).rejects.toThrow(
      "ProofKit MCP Server was detected, but no FileMaker files are open. Open a file in FileMaker and rerun, or pass --server.",
    );
  });
});
