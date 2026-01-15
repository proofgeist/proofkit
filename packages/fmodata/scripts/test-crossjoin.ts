/**
 * CrossJoin Test Script
 *
 * Tests various crossjoin queries against a live FileMaker OData server
 * to understand the actual response format.
 *
 * Usage: bun run scripts/test-crossjoin.ts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import createClient from "@fetchkit/ffetch";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading from .env.local, but env vars take precedence
config({ path: path.resolve(__dirname, "../.env.local") });

const serverUrl = process.env.FMODATA_SERVER_URL;
const apiKey = process.env.FMODATA_API_KEY;
const database = process.env.FMODATA_DATABASE;

console.log("Environment check:");
console.log(`  FMODATA_SERVER_URL: ${serverUrl ? "✓ set" : "✗ missing"}`);
console.log(`  FMODATA_API_KEY: ${apiKey ? "✓ set" : "✗ missing"}`);
console.log(`  FMODATA_DATABASE: ${database ? "✓ set" : "✗ missing"}`);

if (!serverUrl || !apiKey || !database) {
  console.error("Missing required env vars: FMODATA_SERVER_URL, FMODATA_API_KEY, FMODATA_DATABASE");
  process.exit(1);
}

const ffetch = createClient();

async function makeRequest(path: string): Promise<{ status: number; data: unknown }> {
  const cleanBaseUrl = serverUrl!.replace(/\/+$/, "");
  const basePath = `${cleanBaseUrl}/otto/fmi/odata/v4/${encodeURIComponent(database!)}`;
  const fullUrl = `${basePath}${path.startsWith("/") ? path : `/${path}`}`;

  console.log(`\n${"=".repeat(80)}`);
  console.log(`Request: GET ${path}`);
  console.log(`Full URL: ${fullUrl}`);

  try {
    const response = await ffetch(fullUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const contentType = response.headers.get("content-type") || "";
    let data: unknown;

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    console.log(`Status: ${response.status}`);
    console.log(`Response:`);
    console.log(JSON.stringify(data, null, 2));

    return { status: response.status, data };
  } catch (error) {
    console.error(`Error:`, error);
    return { status: 0, data: null };
  }
}

async function main() {
  console.log("CrossJoin Response Format Test");
  console.log("==============================\n");

  // Without expand - what do we get?
  await makeRequest("/$crossjoin(contacts,users)?$top=2");

  // With single expand - what fields come back?
  await makeRequest("/$crossjoin(contacts,users)?$top=2&$expand=contacts");

  // Key question: does the result include BOTH records or just expanded one?
  // Look at navigationLinks to understand the join

  console.log("\n\nDone!");
}

main().catch(console.error);
