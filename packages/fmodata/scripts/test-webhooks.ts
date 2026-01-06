/**
 * Webhook API Test Script
 *
 * This script tests all webhook methods against FileMaker Server
 * to understand the exact format and types returned.
 *
 * Usage:
 *   bun run scripts/test-webhooks.ts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { FMServerConnection, fmTableOccurrence, textField } from "@proofkit/fmodata";
import { config } from "dotenv";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, "../.env.local") });

const serverUrl = process.env.FMODATA_SERVER_URL;
const apiKey = process.env.FMODATA_API_KEY;
const username = process.env.FMODATA_USERNAME;
const password = process.env.FMODATA_PASSWORD;
const database = process.env.FMODATA_DATABASE;

if (!serverUrl) {
  throw new Error("FMODATA_SERVER_URL environment variable is required");
}

if (!database) {
  throw new Error("FMODATA_DATABASE environment variable is required");
}

// Use API key if available, otherwise username/password
let auth: { apiKey: string } | { username: string; password: string } | null = null;
if (apiKey) {
  auth = { apiKey };
} else if (username && password) {
  auth = { username, password };
}

if (!auth) {
  throw new Error(
    "Either FMODATA_API_KEY or (FMODATA_USERNAME and FMODATA_PASSWORD) environment variables are required",
  );
}

// Create a simple table occurrence for testing
const contacts = fmTableOccurrence("contacts", {
  PrimaryKey: textField().primaryKey(),
  name: textField(),
});

async function testWebhookMethods() {
  console.log("FileMaker OData Webhook API Test");
  console.log("=================================\n");

  if (!serverUrl) {
    throw new Error("serverUrl is required");
  }

  if (!auth) {
    throw new Error("auth is required");
  }

  const connection = new FMServerConnection({
    serverUrl,
    auth,
  });

  if (!database) {
    throw new Error("database is required");
  }
  const db = connection.database(database);

  try {
    // Test 1: List all webhooks
    console.log("=== Test 1: List All Webhooks ===\n");
    try {
      const listResult = await db.webhook.list();
      console.log("✅ list() succeeded");
      console.log("Type:", typeof listResult);
      console.log("Is Array:", Array.isArray(listResult));
      console.log("Result structure:");
      console.log(JSON.stringify(listResult, null, 2));
      console.log("\nTypeScript type should be:");
      console.log("  { Status: string; WebHook: Array<{ webHookID: number; tableName: string; url: string; ... }> }");
      console.log("\n");
    } catch (error: unknown) {
      console.log("❌ list() failed:", error instanceof Error ? error.message : String(error));
      console.log("Error:", error);
      console.log("\n");
    }

    // Test 2: Add a webhook
    console.log("=== Test 2: Add Webhook ===\n");
    let webhookId: string | number | undefined;
    try {
      const addResult = await db.webhook.add({
        webhook: "https://example.com/webhook",
        tableName: contacts,
        headers: { "X-Custom-Header": "test-value" },
      });
      console.log("✅ add() succeeded");
      console.log("Type:", typeof addResult);
      console.log("Is Array:", Array.isArray(addResult));
      console.log("Result structure:");
      console.log(JSON.stringify(addResult, null, 2));
      console.log("\nTypeScript type should be:");
      console.log("  { webHookResult: { webHookID: number } }");

      // Try to extract webhook ID from nested structure
      if (typeof addResult === "object" && addResult !== null) {
        const result = addResult as Record<string, unknown>;
        if ("webHookResult" in result) {
          const webHookResult = result.webHookResult as Record<string, unknown>;
          if (webHookResult && "webHookID" in webHookResult) {
            webhookId = webHookResult.webHookID as number;
          }
        } else if ("id" in result) {
          webhookId = result.id as number;
        } else if ("ID" in result) {
          webhookId = result.ID as number;
        } else if ("webhookId" in result) {
          webhookId = result.webhookId as number;
        }
      }
      console.log("Extracted webhook ID:", webhookId);
      console.log("\n");
    } catch (error: unknown) {
      console.log("❌ add() failed:", error instanceof Error ? error.message : String(error));
      console.log("Error:", error);
      console.log("\n");
    }

    // Test 3: Get a webhook (if we have an ID)
    if (webhookId !== undefined) {
      console.log("=== Test 3: Get Webhook ===\n");
      try {
        const getResult = await db.webhook.get(webhookId);
        console.log("✅ get() succeeded");
        console.log("Type:", typeof getResult);
        console.log("Is Array:", Array.isArray(getResult));
        console.log("Result structure:");
        console.log(JSON.stringify(getResult, null, 2));
        console.log("\nTypeScript type should be:");
        console.log(
          "  { webHookID: number; tableName: string; url: string; headers?: Record<string, string>; notifySchemaChanges: boolean; select: string; filter: string; pendingOperations: unknown[] }",
        );
        console.log("\n");
      } catch (error: unknown) {
        console.log("❌ get() failed:", error instanceof Error ? error.message : String(error));
        console.log("Error:", error);
        console.log("\n");
      }
    } else {
      console.log("=== Test 3: Get Webhook ===\n");
      console.log("⚠️  Skipping - no webhook ID available from add()");
      console.log("\n");
    }

    // Test 4: Invoke a webhook (if we have an ID)
    if (webhookId !== undefined) {
      console.log("=== Test 4: Invoke Webhook (without rowIDs) ===\n");
      try {
        const invokeResult = await db.webhook.invoke(webhookId);
        console.log("✅ invoke() succeeded (no rowIDs)");
        console.log("Type:", typeof invokeResult);
        console.log("Is Array:", Array.isArray(invokeResult));
        console.log("Result:", JSON.stringify(invokeResult, null, 2));
        console.log("\n");
      } catch (error: unknown) {
        console.log("❌ invoke() failed:", error instanceof Error ? error.message : String(error));
        console.log("Error:", error);
        console.log("\n");
      }

      console.log("=== Test 5: Invoke Webhook (with rowIDs) ===\n");
      try {
        const invokeResult = await db.webhook.invoke(webhookId, {
          rowIDs: [1, 2, 3],
        });
        console.log("✅ invoke() succeeded (with rowIDs)");
        console.log("Type:", typeof invokeResult);
        console.log("Is Array:", Array.isArray(invokeResult));
        console.log("Result:", JSON.stringify(invokeResult, null, 2));
        console.log("\n");
      } catch (error: unknown) {
        console.log("❌ invoke() failed:", error instanceof Error ? error.message : String(error));
        console.log("Error:", error);
        console.log("\n");
      }
    } else {
      console.log("=== Test 4 & 5: Invoke Webhook ===\n");
      console.log("⚠️  Skipping - no webhook ID available from add()");
      console.log("\n");
    }

    // Test 6: Remove a webhook (if we have an ID)
    if (webhookId !== undefined) {
      console.log("=== Test 6: Remove Webhook ===\n");
      try {
        await db.webhook.remove(webhookId);
        console.log("✅ remove() succeeded");
        console.log("(remove returns void, no data)");
        console.log("\n");
      } catch (error: unknown) {
        console.log("❌ remove() failed:", error instanceof Error ? error.message : String(error));
        console.log("Error:", error);
        console.log("\n");
      }
    } else {
      console.log("=== Test 6: Remove Webhook ===\n");
      console.log("⚠️  Skipping - no webhook ID available from add()");
      console.log("\n");
    }

    // Test 7: Try to get a webhook that doesn't exist (error case)
    console.log("=== Test 7: Get Non-Existent Webhook (Error Case) ===\n");
    try {
      await db.webhook.get(99_999);
      console.log("⚠️  get() succeeded (unexpected - webhook should not exist)");
      console.log("\n");
    } catch (error: unknown) {
      console.log("✅ get() failed as expected");
      console.log("Error type:", error?.constructor?.name ?? typeof error);
      console.log("Error message:", error.message);
      console.log("Error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.log("\n");
    }
  } catch (error: unknown) {
    console.error("\n❌ Test script failed:", error);
    throw error;
  }

  console.log("=================================");
  console.log("All tests complete!");
}

testWebhookMethods().catch((error) => {
  console.error("Test script failed:", error);
  process.exit(1);
});
