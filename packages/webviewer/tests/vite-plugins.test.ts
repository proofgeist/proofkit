import type { HtmlTagDescriptor } from "vite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildMockScriptTag,
  buildNoConnectedFilesRuntimeError,
  defaultWsUrl,
  discoverConnectedFileName,
  fmBridge,
  resolveWsUrl,
} from "../src/fm-bridge.ts";

describe("resolveWsUrl", () => {
  it("prefers an explicit websocket URL", () => {
    expect(
      resolveWsUrl({
        fmMcpBaseUrl: "http://localhost:1365",
        wsUrl: "ws://example.test/custom",
      }),
    ).toBe("ws://example.test/custom");
  });

  it("derives the websocket URL from the HTTP base URL", () => {
    expect(
      resolveWsUrl({
        fmMcpBaseUrl: "https://example.test:9999/",
      }),
    ).toBe("wss://example.test:9999/ws");
  });

  it("falls back to the default websocket URL for invalid base URLs", () => {
    expect(
      resolveWsUrl({
        fmMcpBaseUrl: "not a url",
      }),
    ).toBe(defaultWsUrl);
  });
});

describe("buildMockScriptTag", () => {
  it("builds the fm-mock script tag with required query params", () => {
    const tag = buildMockScriptTag({
      baseUrl: "http://localhost:1365/",
      fileName: "Contacts",
      wsUrl: "ws://localhost:1365/ws",
      debug: true,
    });

    expect(tag).toEqual({
      tag: "script",
      attrs: {
        src: "http://localhost:1365/fm-mock.js?fileName=Contacts&wsUrl=ws%3A%2F%2Flocalhost%3A1365%2Fws&debug=true",
      },
      injectTo: "head-prepend",
    } satisfies HtmlTagDescriptor);
  });
});

describe("discoverConnectedFileName", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns the first non-empty connected file name", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(["", "Contacts", "Invoices"]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(discoverConnectedFileName("http://localhost:1365")).resolves.toBe("Contacts");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:1365/connectedFiles",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("aborts stalled requests with the standard reachability error", async () => {
    vi.useFakeTimers();

    try {
      const abortError = new DOMException("The operation was aborted.", "AbortError");
      vi.mocked(globalThis.fetch).mockImplementation(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(abortError);
            });
          }),
      );

      const pendingRequest = discoverConnectedFileName("http://localhost:1365");
      const pendingExpectation = expect(pendingRequest).rejects.toMatchObject({
        cause: abortError,
        message:
          "fmBridge could not reach http://localhost:1365/connectedFiles. Start fm-mcp and connect a FileMaker webviewer.",
      });

      await vi.advanceTimersByTimeAsync(5000);
      await pendingExpectation;
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects non-ok HTTP responses", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response("nope", { status: 503 }));

    await expect(discoverConnectedFileName("http://localhost:1365")).rejects.toThrow(
      "fmBridge received HTTP 503 from http://localhost:1365/connectedFiles. Ensure fm-mcp is healthy and reachable.",
    );
  });

  it("rejects invalid payloads", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ fileName: "Contacts" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(discoverConnectedFileName("http://localhost:1365")).rejects.toThrow(
      "fmBridge expected an array response from http://localhost:1365/connectedFiles.",
    );
  });

  it("returns null when no connected files are available", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(["", "   "]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(discoverConnectedFileName("http://localhost:1365")).resolves.toBeNull();
  });
});

describe("fmBridge", () => {
  const originalFetch = globalThis.fetch;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    if (typeof originalWindow === "undefined") {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      globalThis.window = originalWindow;
    }
  });

  it("injects the bridge script in serve mode", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(["Contacts"]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const plugin = fmBridge({
      fmMcpBaseUrl: "http://localhost:1365",
      debug: true,
    });

    if (typeof plugin.apply === "function") {
      expect(plugin.apply({} as never, { command: "serve", mode: "development" } as never)).toBe(true);
    }

    const tags = await plugin.transformIndexHtml?.("");

    expect(tags).toEqual([
      {
        tag: "script",
        attrs: {
          src: "http://localhost:1365/fm-mock.js?fileName=Contacts&wsUrl=ws%3A%2F%2Flocalhost%3A1365%2Fws&debug=true",
        },
        injectTo: "head-prepend",
      },
    ]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("opts out of build mode", async () => {
    const plugin = fmBridge({
      fmMcpBaseUrl: "http://localhost:1365",
    });

    expect(typeof plugin.apply).toBe("function");
    if (typeof plugin.apply !== "function") {
      return;
    }

    expect(plugin.apply({} as never, { command: "build", mode: "production" } as never)).toBe(false);
    await expect(plugin.transformIndexHtml?.("")).resolves.toBeUndefined();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("warns and injects a fallback bridge when FM MCP responds with no connected files", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const plugin = fmBridge({
      fmMcpBaseUrl: "http://localhost:1365",
    });

    if (typeof plugin.apply === "function") {
      expect(plugin.apply({} as never, { command: "serve", mode: "development" } as never)).toBe(true);
    }

    await expect(plugin.configureServer?.({} as never)).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      "fmBridge found no connected FileMaker files at http://localhost:1365/connectedFiles. Dev server will continue. Connect a FileMaker webviewer to enable bridge forwarding.",
    );

    const tags = await plugin.transformIndexHtml?.("");

    expect(tags).toHaveLength(1);
    expect(tags?.[0]).toMatchObject({
      tag: "script",
      injectTo: "head-prepend",
    });
    expect(tags?.[0]).toHaveProperty("children");
  });

  it("logs runtime errors from the fallback bridge when no file is connected", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const plugin = fmBridge({
      fmMcpBaseUrl: "http://localhost:1365",
    });

    if (typeof plugin.apply === "function") {
      expect(plugin.apply({} as never, { command: "serve", mode: "development" } as never)).toBe(true);
    }

    const tags = await plugin.transformIndexHtml?.("");
    const tag = tags?.[0];

    expect(tag).toHaveProperty("children");

    globalThis.window = {} as Window & typeof globalThis;
    new Function((tag as HtmlTagDescriptor & { children: string }).children)();

    expect(typeof globalThis.window.filemaker).toBe("function");
    globalThis.window.filemaker?.("TestScript", "{}");
    globalThis.window.FileMaker?.PerformScript("TestScript", "{}");

    expect(console.error).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenNthCalledWith(
      1,
      buildNoConnectedFilesRuntimeError("http://localhost:1365/connectedFiles"),
    );
    expect(console.error).toHaveBeenNthCalledWith(
      2,
      buildNoConnectedFilesRuntimeError("http://localhost:1365/connectedFiles"),
    );
  });
});
