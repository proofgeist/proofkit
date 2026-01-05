/**
 * Batch Request Test Script
 *
 * This script tests batch requests directly against FileMaker Server
 * to understand the exact format expected and returned.
 *
 * Usage:
 *   bun run scripts/test-batch.ts
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, "../.env.local") });

const serverUrl = process.env.FMODATA_SERVER_URL;
const username = process.env.FMODATA_USERNAME;
const password = process.env.FMODATA_PASSWORD;
const database = process.env.FMODATA_DATABASE;

if (!serverUrl) {
  throw new Error("FMODATA_SERVER_URL environment variable is required");
}

if (!username || !password) {
  throw new Error(
    "FMODATA_USERNAME and FMODATA_PASSWORD environment variables are required",
  );
}

if (!database) {
  throw new Error("FMODATA_DATABASE environment variable is required");
}

// Generate a random boundary
function generateBoundary(prefix: string): string {
  const randomHex = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
  return `${prefix}${randomHex}`;
}

async function testSimpleBatch() {
  console.log("=== Testing Simple Batch Request ===\n");

  // Construct base URL
  const cleanUrl = serverUrl!.replace(/\/+$/, "");
  const baseUrl = `${cleanUrl}/fmi/odata/v4`;
  const fullBaseUrl = `${baseUrl}/${database}`;
  const batchUrl = `${fullBaseUrl}/$batch`;

  console.log("Batch URL:", batchUrl);

  // Generate boundary
  const batchBoundary = generateBoundary("batch_");
  console.log("Batch Boundary:", batchBoundary);

  // Construct batch request body according to Claris docs
  // Note: After the HTTP request line, there should be a blank line, then immediately the next boundary
  const batchBody = [
    `--${batchBoundary}`,
    "Content-Type: application/http",
    "Content-Transfer-Encoding: binary",
    "",
    `GET ${fullBaseUrl}/contacts?$top=2 HTTP/1.1`,
    "", // Blank line after HTTP request (required even with no body)
    "", // Empty line before boundary
    `--${batchBoundary}`,
    "Content-Type: application/http",
    "Content-Transfer-Encoding: binary",
    "",
    `GET ${fullBaseUrl}/users?$top=2 HTTP/1.1`,
    "", // Blank line after HTTP request
    "", // Empty line before boundary
    `--${batchBoundary}--`,
  ].join("\r\n");

  console.log("\n=== Request Body ===");
  console.log(batchBody);
  console.log("\n=== End Request Body ===\n");

  // Create Basic Auth header
  const authString = `${username}:${password}`;
  const authHeader = `Basic ${Buffer.from(authString).toString("base64")}`;

  console.log("Authorization:", authHeader.substring(0, 20) + "...");

  // Make the request
  try {
    console.log("\nSending request...\n");

    const response = await fetch(batchUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": `multipart/mixed; boundary=${batchBoundary}`,
        "OData-Version": "4.0",
      },
      body: batchBody,
    });

    console.log("Response Status:", response.status);
    console.log("Response Status Text:", response.statusText);
    console.log("\nResponse Headers:");
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });

    const responseText = await response.text();
    console.log("\n=== Response Body ===");
    console.log(responseText);
    console.log("=== End Response Body ===\n");

    if (!response.ok) {
      console.error("\n❌ Request failed!");
      // Try to parse as JSON error
      try {
        const errorData = JSON.parse(responseText);
        console.error("Error details:", JSON.stringify(errorData, null, 2));
      } catch {
        // Not JSON, already printed above
      }
    } else {
      console.log("\n✅ Request succeeded!");
    }
  } catch (error) {
    console.error("\n❌ Request threw error:");
    console.error(error);
  }
}

async function testBatchWithChangeset() {
  console.log("\n\n=== Testing Batch with Changeset ===\n");

  const cleanUrl = serverUrl!.replace(/\/+$/, "");
  const baseUrl = `${cleanUrl}/fmi/odata/v4`;
  const fullBaseUrl = `${baseUrl}/${database}`;
  const batchUrl = `${fullBaseUrl}/$batch`;

  // Generate boundaries
  const batchBoundary = generateBoundary("batch_");
  const changesetBoundary = generateBoundary("changeset_");

  console.log("Batch Boundary:", batchBoundary);
  console.log("Changeset Boundary:", changesetBoundary);

  // Construct batch with changeset (based on Claris example)
  // Key formatting rules discovered:
  // - GET requests (no body): request line → blank → blank → boundary
  // - POST/PATCH (with body): request line → headers (incl Content-Length) → blank → body → boundary (NO blank!)
  // - No blank line between closing changeset and closing batch boundaries

  const postBody = JSON.stringify({
    name: `Test Batch ${Date.now()}`,
    hobby: "Testing",
  });

  const batchBody = [
    `--${batchBoundary}`,
    "Content-Type: application/http",
    "Content-Transfer-Encoding: binary",
    "",
    `GET ${fullBaseUrl}/contacts?$top=1 HTTP/1.1`,
    "", // Blank line after HTTP request (no body)
    "", // Second blank before boundary (for requests without body)
    `--${batchBoundary}`,
    `Content-Type: multipart/mixed; boundary=${changesetBoundary}`,
    "",
    `--${changesetBoundary}`,
    "Content-Type: application/http",
    "Content-Transfer-Encoding: binary",
    "Content-ID: 1",
    "",
    `POST ${fullBaseUrl}/contacts HTTP/1.1`,
    "Content-Type: application/json",
    `Content-Length: ${postBody.length}`,
    "", // Blank line separating headers from body
    postBody,
    // NO blank line after body - boundary comes immediately
    `--${changesetBoundary}--`,
    `--${batchBoundary}--`,
  ].join("\r\n");

  console.log("\n=== Request Body ===");
  console.log(batchBody);
  console.log("\n=== End Request Body ===\n");

  const authString = `${username}:${password}`;
  const authHeader = `Basic ${Buffer.from(authString).toString("base64")}`;

  try {
    console.log("Sending request...\n");

    const response = await fetch(batchUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": `multipart/mixed; boundary=${batchBoundary}`,
        "OData-Version": "4.0",
      },
      body: batchBody,
    });

    console.log("Response Status:", response.status);
    console.log("Response Status Text:", response.statusText);
    console.log("\nResponse Headers:");
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });

    const responseText = await response.text();
    console.log("\n=== Response Body ===");
    console.log(responseText);
    console.log("=== End Response Body ===\n");

    if (!response.ok) {
      console.error("\n❌ Request failed!");
      try {
        const errorData = JSON.parse(responseText);
        console.error("Error details:", JSON.stringify(errorData, null, 2));
      } catch {
        // Not JSON, already printed above
      }
    } else {
      console.log("\n✅ Request succeeded!");
    }
  } catch (error) {
    console.error("\n❌ Request threw error:");
    console.error(error);
  }
}

async function main() {
  console.log("FileMaker OData Batch Request Test");
  console.log("===================================\n");

  // Test 1: Simple batch with two GET requests
  await testSimpleBatch();

  // Test 2: Batch with changeset
  await testBatchWithChangeset();

  console.log("\n\nTests complete!");
}

main().catch((error) => {
  console.error("Test script failed:", error);
  process.exit(1);
});
