import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { createApiApp } from "./app";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve path to embedded web assets
// When compiled, this will be relative to dist/esm/server/index.js
// So we go up to dist/esm, then into dist/web
const WEB_DIR = resolve(__dirname, "../../web");

export interface ServerOptions {
  port: number | null;
  cwd: string;
  configPath: string;
}

export async function startServer(options: ServerOptions) {
  const { port, cwd, configPath } = options;

  const app = new Hono();

  // Mount API routes
  const apiApp = createApiApp({ cwd, configPath });
  app.route("/", apiApp);

  // Serve static files (only for non-API routes)
  app.get("*", (c) => {
    const url = new URL(c.req.url);
    // Skip API routes
    if (url.pathname.startsWith("/api/")) {
      return c.notFound();
    }

    // Handle root path
    // Remove leading slash from pathname to avoid path.join() ignoring WEB_DIR
    const pathname = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const filePath = join(WEB_DIR, pathname);

    try {
      if (existsSync(filePath)) {
        const content = readFileSync(filePath);
        const ext = filePath.split(".").pop()?.toLowerCase();
        const contentType = getContentType(ext || "");
        return c.body(content, 200, {
          "Content-Type": contentType,
        });
      }
    } catch (_err) {
      // Fall through to SPA fallback
    }

    // SPA fallback - serve index.html for client-side routing
    try {
      const indexPath = join(WEB_DIR, "index.html");
      if (existsSync(indexPath)) {
        const content = readFileSync(indexPath);
        return c.html(content.toString());
      }
    } catch (_err) {
      // If we can't even serve index.html, return 404
    }

    return c.text("Not found", 404);
  });

  // If port is null, try to find an available port starting from 3141
  // Try 3141 first, then 3142-3151 (next 10 ports) if needed
  let actualPort: number;
  if (port === null) {
    actualPort = await findAvailablePort(3141, 11);
  } else {
    // If port is explicitly specified, use it as-is
    actualPort = port;
  }

  const server = serve({
    fetch: app.fetch,
    port: actualPort,
  });

  // The serve function from @hono/node-server already starts listening
  // We just need to return the server with a close method
  return Promise.resolve({
    port: actualPort,
    close: () => {
      server.close();
    },
  });
}

async function findAvailablePort(startPort: number, maxAttempts: number): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const portToTry = startPort + i;
    const isAvailable = await checkPortAvailable(portToTry);
    if (isAvailable) {
      return portToTry;
    }
  }
  throw new Error(`Could not find an available port in range ${startPort}-${startPort + maxAttempts - 1}`);
}

function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        // For other errors, assume port is not available
        resolve(false);
      }
    });

    server.once("listening", () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    html: "text/html",
    js: "application/javascript",
    mjs: "application/javascript",
    css: "text/css",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    eot: "application/vnd.ms-fontobject",
  };
  return types[ext] || "application/octet-stream";
}
