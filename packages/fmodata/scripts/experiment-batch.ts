/**
 * Batch Operations Experiment Script
 *
 * This script experiments with batch operations containing inserts, updates,
 * and deletes to understand how FileMaker handles them, especially when
 * some operations fail.
 *
 * Usage:
 *   cd packages/fmodata && pnpm tsx scripts/experiment-batch.ts
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod/v4";
import {
  FMServerConnection,
  defineBaseTable,
  defineTableOccurrence,
} from "../src/index";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, "../.env.local") });

const serverUrl = process.env.FMODATA_SERVER_URL;
const username = process.env.FMODATA_USERNAME;
const password = process.env.FMODATA_PASSWORD;
const database = process.env.FMODATA_DATABASE;

if (!serverUrl || !username || !password || !database) {
  throw new Error(
    "Environment variables required: FMODATA_SERVER_URL, FMODATA_USERNAME, FMODATA_PASSWORD, FMODATA_DATABASE",
  );
}

// Define schemas
const contactsBase = defineBaseTable({
  schema: {
    PrimaryKey: z.string(),
    CreationTimestamp: z.string().nullable(),
    CreatedBy: z.string().nullable(),
    ModificationTimestamp: z.string().nullable(),
    ModifiedBy: z.string().nullable(),
    name: z.string().nullable(),
    hobby: z.string().nullable(),
    id_user: z.string().nullable(),
  },
  idField: "PrimaryKey",
});

const contactsTO = defineTableOccurrence({
  name: "contacts" as const,
  baseTable: contactsBase,
});

// Create connection
const connection = new FMServerConnection({
  serverUrl,
  auth: { username, password },
});

const db = connection.database(database, {
  occurrences: [contactsTO],
});

// Track created records for cleanup
const createdRecordIds: string[] = [];

async function cleanup() {
  console.log("\n🧹 Cleaning up created records...");
  for (const id of createdRecordIds) {
    try {
      await db.from("contacts").delete().byId(id).execute();
      console.log(`  Deleted: ${id}`);
    } catch (error) {
      console.log(`  Failed to delete ${id}:`, error);
    }
  }
}

async function experiment1_MultipleInserts() {
  console.log("\n" + "=".repeat(60));
  console.log("EXPERIMENT 1: Multiple Inserts in a Batch");
  console.log("=".repeat(60));

  const timestamp = Date.now();
  const insert1 = db.from("contacts").insert({
    name: `Batch Insert 1 - ${timestamp}`,
    hobby: "Insert Test",
  });

  const insert2 = db.from("contacts").insert({
    name: `Batch Insert 2 - ${timestamp}`,
    hobby: "Insert Test",
  });

  const insert3 = db.from("contacts").insert({
    name: `Batch Insert 3 - ${timestamp}`,
    hobby: "Insert Test",
  });

  console.log("\nExecuting batch with 3 insert operations...");

  const result = await db.batch([insert1, insert2, insert3]).execute();

  console.log("\nResult:");
  console.log(JSON.stringify(result, null, 2));

  if (result.data) {
    // Track for cleanup
    for (const item of result.data) {
      if (item && typeof item === "object" && "PrimaryKey" in item) {
        createdRecordIds.push(item.PrimaryKey as string);
      }
    }
  }

  return result;
}

async function experiment2_MixedOperations() {
  console.log("\n" + "=".repeat(60));
  console.log("EXPERIMENT 2: Mixed Operations (GET + INSERT + UPDATE + DELETE)");
  console.log("=".repeat(60));

  // First, create a record we can update/delete
  const timestamp = Date.now();
  const setupResult = await db
    .from("contacts")
    .insert({
      name: `Setup Record - ${timestamp}`,
      hobby: "Will be updated",
    })
    .execute();

  if (setupResult.error || !setupResult.data) {
    console.log("Failed to create setup record:", setupResult.error);
    return;
  }

  const setupRecordId = setupResult.data.PrimaryKey;
  console.log(`\nCreated setup record: ${setupRecordId}`);

  // Now create a batch with mixed operations
  const listQuery = db.from("contacts").list().top(2);

  const insertOp = db.from("contacts").insert({
    name: `Mixed Batch Insert - ${timestamp}`,
    hobby: "Mixed Test",
  });

  const updateOp = db
    .from("contacts")
    .update({ hobby: "Updated via batch" })
    .byId(setupRecordId);

  const deleteOp = db.from("contacts").delete().byId(setupRecordId);

  console.log("\nExecuting batch with: GET, INSERT, UPDATE, DELETE...");

  const result = await db
    .batch([listQuery, insertOp, updateOp, deleteOp])
    .execute();

  console.log("\nResult:");
  console.log(JSON.stringify(result, null, 2));

  if (result.data) {
    // Track insert result for cleanup
    const insertResult = result.data[1];
    if (insertResult && typeof insertResult === "object" && "PrimaryKey" in insertResult) {
      createdRecordIds.push(insertResult.PrimaryKey as string);
    }
  }

  return result;
}

async function experiment3_FailingOperation() {
  console.log("\n" + "=".repeat(60));
  console.log("EXPERIMENT 3: Batch with a Failing Operation in the Middle");
  console.log("=".repeat(60));

  const timestamp = Date.now();

  // Create a valid insert
  const insert1 = db.from("contacts").insert({
    name: `Before Failure - ${timestamp}`,
    hobby: "Should succeed",
  });

  // Try to update a non-existent record (should fail)
  const failingUpdate = db
    .from("contacts")
    .update({ hobby: "This should fail" })
    .byId("00000000-0000-0000-0000-000000000000");

  // Another valid insert (should this succeed or fail?)
  const insert2 = db.from("contacts").insert({
    name: `After Failure - ${timestamp}`,
    hobby: "Should this succeed?",
  });

  console.log("\nExecuting batch with: INSERT (valid), UPDATE (invalid ID), INSERT (valid)...");
  console.log("Question: What happens to the third operation when the second fails?");

  const result = await db.batch([insert1, failingUpdate, insert2]).execute();

  console.log("\nResult:");
  console.log(JSON.stringify(result, null, 2));

  if (result.data) {
    for (const item of result.data) {
      if (item && typeof item === "object" && "PrimaryKey" in item) {
        createdRecordIds.push(item.PrimaryKey as string);
      }
    }
  }

  return result;
}

async function experiment4_FailingDelete() {
  console.log("\n" + "=".repeat(60));
  console.log("EXPERIMENT 4: Batch with a Failing Delete");
  console.log("=".repeat(60));

  const timestamp = Date.now();

  // Create a valid insert
  const insert1 = db.from("contacts").insert({
    name: `Before Delete Fail - ${timestamp}`,
    hobby: "Should succeed",
  });

  // Try to delete a non-existent record
  const failingDelete = db
    .from("contacts")
    .delete()
    .byId("00000000-0000-0000-0000-000000000000");

  // Another valid insert
  const insert2 = db.from("contacts").insert({
    name: `After Delete Fail - ${timestamp}`,
    hobby: "Should this succeed?",
  });

  console.log("\nExecuting batch with: INSERT, DELETE (invalid ID), INSERT...");

  const result = await db.batch([insert1, failingDelete, insert2]).execute();

  console.log("\nResult:");
  console.log(JSON.stringify(result, null, 2));

  if (result.data) {
    for (const item of result.data) {
      if (item && typeof item === "object" && "PrimaryKey" in item) {
        createdRecordIds.push(item.PrimaryKey as string);
      }
    }
  }

  return result;
}

async function experiment5_AllGetWithOneFailure() {
  console.log("\n" + "=".repeat(60));
  console.log("EXPERIMENT 5: Multiple GETs with One Filter that Returns Nothing");
  console.log("=".repeat(60));

  // Query that should return results
  const query1 = db.from("contacts").list().top(2);

  // Query with a filter that returns empty (not an error, just no results)
  const query2 = db
    .from("contacts")
    .list()
    .filter({ name: "THIS_NAME_DEFINITELY_DOES_NOT_EXIST_12345" });

  // Another query that should return results
  const query3 = db.from("contacts").list().top(1);

  console.log("\nExecuting batch with: GET (valid), GET (empty filter), GET (valid)...");

  const result = await db.batch([query1, query2, query3]).execute();

  console.log("\nResult:");
  console.log(JSON.stringify(result, null, 2));

  return result;
}

async function experiment6_RawResponseInspection() {
  console.log("\n" + "=".repeat(60));
  console.log("EXPERIMENT 6: Raw Response Inspection - Direct Fetch");
  console.log("=".repeat(60));

  // Make a direct batch request to see raw response
  const timestamp = Date.now();
  const boundary = "batch_direct_test_123";
  
  const baseUrl = `${serverUrl}/fmi/odata/v4/${database}`;
  const batchUrl = `${baseUrl}/$batch`;
  
  // Build a simple batch body with one GET
  const batchBody = [
    `--${boundary}`,
    "Content-Type: application/http",
    "Content-Transfer-Encoding: binary",
    "",
    `GET ${baseUrl}/contacts?$top=1 HTTP/1.1`,
    "",
    "",
    `--${boundary}--`,
  ].join("\r\n");

  console.log("\n--- Sending Request ---");
  console.log("URL:", batchUrl);
  console.log("Body:", batchBody);

  const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

  const response = await fetch(batchUrl, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": `multipart/mixed; boundary=${boundary}`,
      "OData-Version": "4.0",
    },
    body: batchBody,
  });

  console.log("\n--- Response Info ---");
  console.log("Status:", response.status, response.statusText);
  console.log("Content-Type:", response.headers.get("content-type"));

  const responseText = await response.text();
  console.log("\n--- Raw Response Body ---");
  console.log(responseText);
  console.log("--- End Raw Response ---");
}

async function experiment7_RawResponseWithInsert() {
  console.log("\n" + "=".repeat(60));
  console.log("EXPERIMENT 7: Raw Response - Insert with Prefer header");
  console.log("=".repeat(60));

  const timestamp = Date.now();
  const boundary = "batch_insert_test_456";
  const changesetBoundary = "changeset_insert_789";
  
  const baseUrl = `${serverUrl}/fmi/odata/v4/${database}`;
  const batchUrl = `${baseUrl}/$batch`;
  
  const insertBody = JSON.stringify({
    name: `Direct Insert Test - ${timestamp}`,
    hobby: "Testing",
  });

  // Build a batch with INSERT using return=representation
  const batchBody = [
    `--${boundary}`,
    `Content-Type: multipart/mixed; boundary=${changesetBoundary}`,
    "",
    `--${changesetBoundary}`,
    "Content-Type: application/http",
    "Content-Transfer-Encoding: binary",
    "",
    `POST ${baseUrl}/contacts HTTP/1.1`,
    "Content-Type: application/json",
    "Prefer: return=representation",
    `Content-Length: ${insertBody.length}`,
    "",
    insertBody,
    `--${changesetBoundary}--`,
    `--${boundary}--`,
  ].join("\r\n");

  console.log("\n--- Sending Insert Request ---");
  console.log("Body:\n", batchBody);

  const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

  const response = await fetch(batchUrl, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": `multipart/mixed; boundary=${boundary}`,
      "OData-Version": "4.0",
    },
    body: batchBody,
  });

  console.log("\n--- Response Info ---");
  console.log("Status:", response.status, response.statusText);
  console.log("Content-Type:", response.headers.get("content-type"));

  const responseText = await response.text();
  console.log("\n--- Raw Response Body ---");
  console.log(responseText);
  console.log("--- End Raw Response ---");
  
  // Try to extract created record ID for cleanup
  const pkMatch = responseText.match(/"PrimaryKey":\s*"([^"]+)"/);
  if (pkMatch && pkMatch[1]) {
    createdRecordIds.push(pkMatch[1]);
    console.log("\nCreated record ID:", pkMatch[1]);
  }
}

async function experiment8_TrueError() {
  console.log("\n" + "=".repeat(60));
  console.log("EXPERIMENT 8: Raw Response - Query Non-Existent Table");
  console.log("=".repeat(60));

  const boundary = "batch_error_test";
  const baseUrl = `${serverUrl}/fmi/odata/v4/${database}`;
  const batchUrl = `${baseUrl}/$batch`;

  // Build: GET (valid), GET (non-existent table), GET (valid)
  const batchBody = [
    `--${boundary}`,
    "Content-Type: application/http",
    "Content-Transfer-Encoding: binary",
    "",
    `GET ${baseUrl}/contacts?$top=1 HTTP/1.1`,
    "",
    "",
    `--${boundary}`,
    "Content-Type: application/http",
    "Content-Transfer-Encoding: binary",
    "",
    `GET ${baseUrl}/THIS_TABLE_DOES_NOT_EXIST?$top=1 HTTP/1.1`,
    "",
    "",
    `--${boundary}`,
    "Content-Type: application/http",
    "Content-Transfer-Encoding: binary",
    "",
    `GET ${baseUrl}/contacts?$top=2 HTTP/1.1`,
    "",
    "",
    `--${boundary}--`,
  ].join("\r\n");

  console.log("\n--- Sending Request with Non-Existent Table ---");

  const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

  const response = await fetch(batchUrl, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": `multipart/mixed; boundary=${boundary}`,
      "OData-Version": "4.0",
    },
    body: batchBody,
  });

  console.log("\n--- Response Info ---");
  console.log("Status:", response.status, response.statusText);

  const responseText = await response.text();
  console.log("\n--- Raw Response Body ---");
  console.log(responseText);
  console.log("--- End Raw Response ---");
}

async function experiment9_RawResponseWithFailure() {
  console.log("\n" + "=".repeat(60));
  console.log("EXPERIMENT 9: Raw Response - Mixed with Failure");
  console.log("=".repeat(60));

  const timestamp = Date.now();
  const boundary = "batch_fail_test";
  const cs1 = "changeset_1";
  const cs2 = "changeset_2";
  
  const baseUrl = `${serverUrl}/fmi/odata/v4/${database}`;
  const batchUrl = `${baseUrl}/$batch`;
  
  const insertBody1 = JSON.stringify({ name: `Before Fail - ${timestamp}`, hobby: "Test" });
  const updateBody = JSON.stringify({ hobby: "Should fail" });
  const insertBody2 = JSON.stringify({ name: `After Fail - ${timestamp}`, hobby: "Test" });

  // Build: INSERT (valid), UPDATE (invalid ID), INSERT (valid)
  const batchBody = [
    // First changeset: valid insert
    `--${boundary}`,
    `Content-Type: multipart/mixed; boundary=${cs1}`,
    "",
    `--${cs1}`,
    "Content-Type: application/http",
    "Content-Transfer-Encoding: binary",
    "",
    `POST ${baseUrl}/contacts HTTP/1.1`,
    "Content-Type: application/json",
    "Prefer: return=representation",
    `Content-Length: ${insertBody1.length}`,
    "",
    insertBody1,
    `--${cs1}--`,
    // Second changeset: invalid update
    `--${boundary}`,
    `Content-Type: multipart/mixed; boundary=${cs2}`,
    "",
    `--${cs2}`,
    "Content-Type: application/http",
    "Content-Transfer-Encoding: binary",
    "",
    `PATCH ${baseUrl}/contacts('00000000-0000-0000-0000-000000000000') HTTP/1.1`,
    "Content-Type: application/json",
    `Content-Length: ${updateBody.length}`,
    "",
    updateBody,
    `--${cs2}--`,
    // Third changeset: valid insert
    `--${boundary}`,
    `Content-Type: multipart/mixed; boundary=changeset_3`,
    "",
    `--changeset_3`,
    "Content-Type: application/http",
    "Content-Transfer-Encoding: binary",
    "",
    `POST ${baseUrl}/contacts HTTP/1.1`,
    "Content-Type: application/json", 
    "Prefer: return=representation",
    `Content-Length: ${insertBody2.length}`,
    "",
    insertBody2,
    `--changeset_3--`,
    `--${boundary}--`,
  ].join("\r\n");

  console.log("\n--- Sending Mixed Request with Invalid Update ---");

  const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

  const response = await fetch(batchUrl, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": `multipart/mixed; boundary=${boundary}`,
      "OData-Version": "4.0",
    },
    body: batchBody,
  });

  console.log("\n--- Response Info ---");
  console.log("Status:", response.status, response.statusText);

  const responseText = await response.text();
  console.log("\n--- Raw Response Body ---");
  console.log(responseText);
  console.log("--- End Raw Response ---");
  
  // Extract created record IDs for cleanup
  const pkMatches = responseText.matchAll(/"PrimaryKey":\s*"([^"]+)"/g);
  for (const match of pkMatches) {
    if (match[1]) {
      createdRecordIds.push(match[1]);
      console.log("Created record ID:", match[1]);
    }
  }
}

async function main() {
  console.log("🔬 Batch Operations Experiment");
  console.log("================================");
  console.log(`Server: ${serverUrl}`);
  console.log(`Database: ${database}`);
  console.log("");

  try {
    // Run experiments
    await experiment1_MultipleInserts();
    await experiment2_MixedOperations();
    await experiment3_FailingOperation();
    await experiment4_FailingDelete();
    await experiment5_AllGetWithOneFailure();
    await experiment6_RawResponseInspection();
    await experiment7_RawResponseWithInsert();
    await experiment8_TrueError();
    await experiment9_RawResponseWithFailure();

    console.log("\n" + "=".repeat(60));
    console.log("ALL EXPERIMENTS COMPLETE");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Experiment failed with error:", error);
  } finally {
    await cleanup();
  }
}

main().catch(console.error);

