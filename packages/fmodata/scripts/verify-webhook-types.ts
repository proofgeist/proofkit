/**
 * Webhook API Response Verification Script
 *
 * This script makes RAW HTTP requests (no library wrappers) to verify the
 * exact JSON structure returned by the FileMaker OData webhook endpoints.
 *
 * It tests: Webhook.GetAll, Webhook.Add, Webhook.Get, Webhook.Delete
 * and compares the actual response keys against our TypeScript type definitions.
 *
 * Usage:
 *   bun run scripts/verify-webhook-types.ts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, "../.env.local") });

const serverUrl = process.env.FMODATA_SERVER_URL;
const apiKey = process.env.FMODATA_API_KEY;
const database = process.env.FMODATA_DATABASE;

if (!(serverUrl && database && apiKey)) {
  throw new Error("FMODATA_SERVER_URL, FMODATA_API_KEY, and FMODATA_DATABASE are required in .env.local");
}

const baseUrl = `${serverUrl.replace(/\/+$/, "")}/otto/fmi/odata/v4/${encodeURIComponent(database)}`;

async function rawRequest(
  endpoint: string,
  method = "GET",
  body?: unknown,
): Promise<{ status: number; json: unknown; raw: string }> {
  const url = `${baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };
  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    json = null;
  }
  return { status: res.status, json, raw };
}

interface TypeMismatch {
  endpoint: string;
  expected: string[];
  actual: string[];
  missing: string[];
  extra: string[];
}

const mismatches: TypeMismatch[] = [];

function compareKeys(label: string, expectedKeys: string[], actual: Record<string, unknown>) {
  const actualKeys = Object.keys(actual).filter((k) => !k.startsWith("@")); // ignore @context etc.
  const missing = expectedKeys.filter((k) => !actualKeys.includes(k));
  const extra = actualKeys.filter((k) => !expectedKeys.includes(k));

  if (missing.length > 0 || extra.length > 0) {
    mismatches.push({
      endpoint: label,
      expected: expectedKeys,
      actual: actualKeys,
      missing,
      extra,
    });
    console.log(`  MISMATCH for ${label}:`);
    if (missing.length) {
      console.log(`    Missing from response: ${missing.join(", ")}`);
    }
    if (extra.length) {
      console.log(`    Extra in response: ${extra.join(", ")}`);
    }
  } else {
    console.log(`  OK: ${label} keys match`);
  }
}

async function main() {
  console.log("Webhook API Response Verification");
  console.log("==================================\n");

  // 1. Webhook.GetAll (list)
  console.log("--- Webhook.GetAll ---");
  const listRes = await rawRequest("/Webhook.GetAll");
  console.log(`  Status: ${listRes.status}`);
  console.log(`  Raw JSON:\n${JSON.stringify(listRes.json, null, 2)}\n`);

  if (listRes.json && typeof listRes.json === "object") {
    const listData = listRes.json as Record<string, unknown>;

    // Our type expects: { status: string; webhooks: WebhookInfo[] }
    compareKeys("WebhookListResponse", ["status", "webhooks"], listData);

    // Check first webhook item structure
    let webhooksKey: string | null = null;
    if ("webhooks" in listData) {
      webhooksKey = "webhooks";
    } else if ("WebHook" in listData) {
      webhooksKey = "WebHook";
    }
    if (webhooksKey) {
      const webhooks = listData[webhooksKey] as Record<string, unknown>[];
      if (webhooks && webhooks.length > 0) {
        const first = webhooks[0] as Record<string, unknown>;
        compareKeys(
          "WebhookInfo (from list)",
          [
            "webhookID",
            "tableName",
            "webhook",
            "headers",
            "notifySchemaChanges",
            "select",
            "filter",
            "pendingOperations",
          ],
          first,
        );
      }
    }
  }

  // 2. Webhook.Add
  console.log("\n--- Webhook.Add ---");
  const addRes = await rawRequest("/Webhook.Add", "POST", {
    webhook: "https://example.com/verify-test-webhook",
    tableName: "contacts",
    headers: { "X-Verify-Test": "true" },
    notifySchemaChanges: false,
  });
  console.log(`  Status: ${addRes.status}`);
  console.log(`  Raw JSON:\n${JSON.stringify(addRes.json, null, 2)}\n`);

  let addedWebhookId: number | undefined;

  if (addRes.json && typeof addRes.json === "object") {
    const addData = addRes.json as Record<string, unknown>;

    // Our type expects: { webhookResult: { webhookID: number } }
    compareKeys("WebhookAddResponse", ["webhookResult"], addData);

    // Check both possible keys
    let resultKey: string | null = null;
    if ("webhookResult" in addData) {
      resultKey = "webhookResult";
    } else if ("webHookResult" in addData) {
      resultKey = "webHookResult";
    }
    if (resultKey) {
      const result = addData[resultKey] as Record<string, unknown>;
      compareKeys("WebhookAddResponse inner", ["webhookID"], result);
      // Try both key casings
      addedWebhookId = (result.webhookID ?? result.webHookID) as number;
    }
  }

  // 3. Webhook.Get (using the ID from add)
  if (addedWebhookId !== undefined) {
    console.log(`\n--- Webhook.Get(${addedWebhookId}) ---`);
    const getRes = await rawRequest(`/Webhook.Get(${addedWebhookId})`);
    console.log(`  Status: ${getRes.status}`);
    console.log(`  Raw JSON:\n${JSON.stringify(getRes.json, null, 2)}\n`);

    if (getRes.json && typeof getRes.json === "object") {
      compareKeys(
        "WebhookInfo (from get)",
        [
          "webhookID",
          "tableName",
          "webhook",
          "headers",
          "notifySchemaChanges",
          "select",
          "filter",
          "pendingOperations",
        ],
        getRes.json as Record<string, unknown>,
      );
    }

    // 4. Webhook.Delete
    console.log(`\n--- Webhook.Delete(${addedWebhookId}) ---`);
    const deleteRes = await rawRequest(`/Webhook.Delete(${addedWebhookId})`, "POST");
    console.log(`  Status: ${deleteRes.status}`);
    console.log(`  Raw JSON:\n${JSON.stringify(deleteRes.json, null, 2)}\n`);

    if (deleteRes.json && typeof deleteRes.json === "object") {
      compareKeys("WebhookDeleteResponse", ["webhookResult"], deleteRes.json as Record<string, unknown>);
    }
  } else {
    console.log("\n  SKIP Webhook.Get and Webhook.Delete - no webhook ID from add");
  }

  // 5. Error case
  console.log("\n--- Webhook.Get(99999) (not found) ---");
  const notFoundRes = await rawRequest("/Webhook.Get(99999)");
  console.log(`  Status: ${notFoundRes.status}`);
  console.log(`  Raw JSON:\n${JSON.stringify(notFoundRes.json, null, 2)}\n`);

  // Summary
  console.log("\n==================================");
  if (mismatches.length === 0) {
    console.log("ALL TYPES MATCH the API response structure.");
  } else {
    console.log(`FOUND ${mismatches.length} TYPE MISMATCH(ES):\n`);
    for (const m of mismatches) {
      console.log(`  ${m.endpoint}:`);
      console.log(`    Expected keys: ${m.expected.join(", ")}`);
      console.log(`    Actual keys:   ${m.actual.join(", ")}`);
      if (m.missing.length) {
        console.log(`    Missing:       ${m.missing.join(", ")}`);
      }
      if (m.extra.length) {
        console.log(`    Extra:         ${m.extra.join(", ")}`);
      }
      console.log();
    }
  }

  return mismatches;
}

main()
  .then((mismatches) => {
    if (mismatches.length > 0) {
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });
