#!/usr/bin/env node

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Load .env file from workspace root
// When running from dist/index.js: __dirname is packages/fmodata-mcp/dist
// We need to go up 2 levels to get to workspace root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Calculate workspace root: from dist/ go up to packages/fmodata-mcp, then up to root
const workspaceRoot = resolve(__dirname, "../..");
const rootEnvPath = resolve(workspaceRoot, "..", ".env");
const rootEnvLocalPath = resolve(workspaceRoot, "..", ".env.local");

// Also check current working directory (in case running from root)
const cwdRootEnv = resolve(process.cwd(), ".env");

// Load .env files (dotenv.config is safe to call even if file doesn't exist)
// Later calls override earlier ones, so .env.local takes precedence
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: rootEnvLocalPath });
dotenv.config({ path: cwdRootEnv });

import { createServer, type ODataConfig } from "./server.js";
import { startServer } from "./server.js";

/**
 * Parse command-line arguments for configuration
 * Supports formats like:
 *   --host=https://example.com
 *   --host "https://example.com"
 *   --database=MyDatabase
 *   --username=admin
 *   --password=secret
 *   --ottoApiKey=dk_xxx
 *   --ottoPort=3030
 */
function parseArgs(): Partial<ODataConfig> {
  const args = process.argv.slice(2);
  const config: Partial<ODataConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    // Handle --key=value format
    if (arg.startsWith("--") && arg.includes("=")) {
      const [key, ...valueParts] = arg.substring(2).split("=");
      const value = valueParts.join("="); // Rejoin in case value contains =

      switch (key) {
        case "host":
        case "server":
          config.host = value;
          break;
        case "database":
        case "db":
        case "filename":
          config.database = value;
          break;
        case "username":
        case "user":
          config.username = value;
          break;
        case "password":
        case "pass":
          config.password = value;
          break;
        case "ottoApiKey":
        case "apiKey":
        case "key":
          config.ottoApiKey = value;
          break;
        case "ottoPort":
        case "port":
          config.ottoPort = parseInt(value, 10);
          break;
      }
    }
    // Handle --key value format
    else if (arg.startsWith("--")) {
      const key = arg.substring(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith("--")) {
        const value = nextArg;

        switch (key) {
          case "host":
          case "server":
            config.host = value;
            i++; // Skip next arg
            break;
          case "database":
          case "db":
          case "filename":
            config.database = value;
            i++; // Skip next arg
            break;
          case "username":
          case "user":
            config.username = value;
            i++; // Skip next arg
            break;
          case "password":
          case "pass":
            config.password = value;
            i++; // Skip next arg
            break;
          case "ottoApiKey":
          case "apiKey":
          case "key":
            config.ottoApiKey = value;
            i++; // Skip next arg
            break;
          case "ottoPort":
          case "port":
            config.ottoPort = parseInt(value, 10);
            i++; // Skip next arg
            break;
        }
      }
    }
    // Handle --http flag for HTTP mode
    else if (arg === "--http" || arg === "--server") {
      // HTTP mode - will call startServer()
      return config; // Return config but mark HTTP mode
    }
  }

  return config;
}

// Check if we should run in HTTP mode or stdio mode
const isHttpMode =
  process.argv.includes("--http") || process.argv.includes("--server");
const config = parseArgs();

if (isHttpMode) {
  // HTTP mode - start Express server with config from args
  startServer(config).catch((error) => {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  });
} else {
  // Stdio mode - start stdio transport (for use with mcp.json args)
  (async () => {
    try {
      const server = await createServer(config);
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.error("fmodata-mcp server running on stdio");
    } catch (error) {
      console.error("Failed to start MCP server:", error);
      process.exit(1);
    }
  })();
}

