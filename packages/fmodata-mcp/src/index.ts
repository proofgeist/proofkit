#!/usr/bin/env node

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

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

import { startServer } from "./server.js";

// Start the server when this file is executed
startServer().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});

