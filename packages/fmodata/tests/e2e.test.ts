/**
 * End-to-End Tests
 *
 * Comprehensive E2E tests against a live FileMaker OData server.
 * Tests basic operations, entity IDs, and batch operations.
 */

import { describe, it, afterEach, expect, assert, expectTypeOf } from "vitest";
import { FMServerConnection, Metadata } from "../src/index";
import { jsonCodec } from "./utils/helpers";
import { z } from "zod/v4";
import { mockResponses } from "./fixtures/responses";
import { createMockFetch, simpleMock } from "./utils/mock-fetch";
import {
  serverUrl,
  username,
  password,
  apiKey,
  database,
  contactsTO,
  usersTO,
  contactsTOWithIds,
  usersTOWithIds,
  contactsTOForBatch,
  usersTOForBatch,
  occurrencesWithIds,
} from "./e2e/setup";

if (!serverUrl) {
  throw new Error("FMODATA_SERVER_URL environment variable is required");
}

if (!database) {
  throw new Error("FMODATA_DATABASE environment variable is required");
}

// Track records created during tests for cleanup
const createdRecordIds: string[] = [];
const createdMarkers: string[] = [];

afterEach(async () => {
  if (!apiKey) return; // Skip cleanup if not running basic operations tests

  const connection = new FMServerConnection({
    serverUrl: serverUrl!,
    auth: { apiKey },
  });
  const db = connection.database(database!, {
    occurrences: [contactsTO, usersTO] as const,
  });

  const entitySet = db.from("contacts");

  // Delete records by ID
  for (const recordId of createdRecordIds) {
    try {
      await entitySet.delete().byId(recordId).execute();
    } catch (error) {
      // Ignore errors - record may have already been deleted
      console.warn(`Failed to delete record ${recordId}:`, error);
    }
  }
  createdRecordIds.length = 0;

  // Delete records by marker/name pattern
  for (const marker of createdMarkers) {
    try {
      await entitySet
        .delete()
        .where((q) => q.filter({ name: { contains: marker } }))
        .execute();
    } catch (error) {
      // Ignore errors - records may have already been deleted
      console.warn(`Failed to delete records with marker ${marker}:`, error);
    }
  }
  createdMarkers.length = 0;
});

describe("Basic E2E Operations", () => {
  if (!apiKey) {
    it.skip("API key required for basic operations tests", () => {});
    return;
  }

  const connection = new FMServerConnection({
    serverUrl: serverUrl!,
    auth: { apiKey },
  });
  const db = connection.database(database!, {
    occurrences: [contactsTO, usersTO] as const,
  });

  it("should connect to the server and list records", async () => {
    const entitySet = db.from("contacts");

    // Test basic list query (limit to 10 records to avoid timeout)
    const result = await entitySet.list().top(10).execute();
    if (!result.data) {
      console.log(result.error);
      throw new Error("Expected data to be defined");
    }
    assert(result.data, "Expected data to be defined");

    // Verify we got a response
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("should run a script and get back result", async () => {
    const { resultCode, result } = await db.runScript("return-input", {
      scriptParam: "hello world",
    });

    expect(resultCode).toBe(0);
    expect(result).toBe("hello world");

    const randomNumber = Math.floor(10000 + Math.random() * 90000);
    const { resultCode: resultCode2, result: result2 } = await db.runScript(
      "return-input",
      {
        scriptParam: randomNumber,
      },
    );
    expect(resultCode2).toBe(0);
    expect(result2).toBe(randomNumber.toString());
  });

  it("should transform the script result if a schema is provided", async () => {
    const { resultCode, result } = await db.runScript("return-input", {
      scriptParam: { hello: "world" },
      resultSchema: jsonCodec(
        z
          .object({ hello: z.string() })
          .transform((data) => ({ ...data, world: "world" })),
      ),
    });
    expect(resultCode).toBe(0);
    expect(result).toStrictEqual({ hello: "world", world: "world" });
  });

  it("should insert a record and verify count increased", async () => {
    const entitySet = db.from("contacts");

    // Get initial count
    const initialCountResult = await entitySet.list().count().execute();
    assert(initialCountResult.data, "Expected data to be defined");
    const initialCount = initialCountResult.data;

    // Insert a new record with unique name to avoid conflicts
    const uniqueName = `Test User ${Date.now()}`;
    const insertResult = await entitySet
      .insert({
        name: uniqueName,
      })
      .execute();

    assert(insertResult.data, "Expected data to be defined");

    const insertedRecord = insertResult.data;

    // Track record ID for cleanup (use PrimaryKey from the schema)
    const recordId = insertedRecord.PrimaryKey;
    if (recordId) {
      createdRecordIds.push(recordId);
    }

    // Verify the record was inserted with correct data
    expect(insertedRecord.name).toBe(uniqueName);

    // Get count after insert
    const newCountResult = await entitySet.list().count().execute();
    assert(newCountResult.data, "Expected data to be defined");
    const newCount = newCountResult.data;

    // Verify count increased by 1
    expect(newCount).toBe(initialCount + 1);
  });

  it("should update a record by ID and return count", async () => {
    const entitySet = db.from("contacts");

    // First, insert a record to update
    const uniqueName = `Update Test ${Date.now()}`;
    const insertResult = await entitySet
      .insert({
        name: uniqueName,
      })
      .execute();

    assert(insertResult.data, "Expected insert data to be defined");
    const primaryKey = insertResult.data.PrimaryKey;
    assert(primaryKey, "Expected PrimaryKey to be defined");

    // Track record ID for cleanup
    createdRecordIds.push(primaryKey);

    // Update the record
    const updatedName = `${uniqueName} Updated`;
    const updateResult = await entitySet
      .update({ name: updatedName })
      .byId(primaryKey)
      .execute();

    assert(updateResult.data, "Expected update data to be defined");
    expect(updateResult.error).toBeUndefined();
    expect(updateResult.data.updatedCount).toBe(1);
  });

  it("should update multiple records by filter and return count", async () => {
    const entitySet = db.from("contacts");

    // Insert multiple records with a unique marker
    const marker = `Bulk Update ${Date.now()}`;
    await entitySet.insert({ name: `${marker} - 1` }).execute();
    await entitySet.insert({ name: `${marker} - 2` }).execute();
    await entitySet.insert({ name: `${marker} - 3` }).execute();

    // Track marker for cleanup
    createdMarkers.push(marker);

    // Update all records with the marker
    const updateResult = await entitySet
      .update({ hobby: "Updated Hobby" })
      .where((q) => q.filter({ name: { contains: marker } }))
      .execute();

    assert(updateResult.data, "Expected update data to be defined");
    expect(updateResult.error).toBeUndefined();
    expect(updateResult.data.updatedCount).toBeGreaterThanOrEqual(3);
  });

  it("should delete a record by ID and return count", async () => {
    const entitySet = db.from("contacts");

    // First, insert a record to delete
    const uniqueName = `Delete Test ${Date.now()}`;
    const insertResult = await entitySet
      .insert({
        name: uniqueName,
      })
      .execute();

    assert(insertResult.data, "Expected insert data to be defined");
    const recordId = insertResult.data.PrimaryKey;
    assert(recordId, "Expected PrimaryKey to be defined");

    // Get count before delete
    const beforeCount = await entitySet.list().count().execute();
    assert(beforeCount.data, "Expected count data to be defined");

    // Delete the record
    const deleteQuery = entitySet.delete().byId(recordId);
    const deleteResult = await deleteQuery.execute();

    assert(deleteResult.data, "Expected delete data to be defined");
    expect(deleteResult.error).toBeUndefined();
    expect(deleteResult.data.deletedCount).toBe(1);

    // Verify count decreased
    const afterCount = await entitySet.list().count().execute();
    assert(afterCount.data, "Expected count data to be defined");
    expect(afterCount.data).toBe(beforeCount.data - 1);
  });

  it("should delete multiple records by filter and return count", async () => {
    const entitySet = db.from("contacts");

    // Insert multiple records with a unique marker
    const marker = `Bulk Delete ${Date.now()}`;
    await entitySet.insert({ name: `${marker} - 1` }).execute();
    await entitySet.insert({ name: `${marker} - 2` }).execute();
    await entitySet.insert({ name: `${marker} - 3` }).execute();

    // Get count before delete
    const beforeCount = await entitySet.list().count().execute();
    assert(beforeCount.data, "Expected count data to be defined");

    // Delete all records with the marker
    const deleteResult = await entitySet
      .delete()
      .where((q) => q.filter({ name: { contains: marker } }))
      .execute();

    assert(deleteResult.data, "Expected delete data to be defined");
    expect(deleteResult.error).toBeUndefined();
    expect(deleteResult.data.deletedCount).toBeGreaterThanOrEqual(3);

    // Verify count decreased
    const afterCount = await entitySet.list().count().execute();
    assert(afterCount.data, "Expected count data to be defined");
    expect(afterCount.data).toBeLessThanOrEqual(
      beforeCount.data - deleteResult.data.deletedCount,
    );
  });

  it("should properly type and validate expanded properties", async () => {
    const entitySet = db.from("contacts");

    // Test expand with type safety
    const result = await entitySet
      .list()
      .expand("users", (b) => b.select("name"))
      .execute();

    // Verify we got a response
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    if (!result.data) throw new Error("Expected result.data to be defined");
    expect(Array.isArray(result.data)).toBe(true);

    const firstRecord = result.data[0];
    assert(firstRecord, "Should have a first record");

    expect(firstRecord.users).toBeDefined();
    expect(firstRecord.users.length).toBeGreaterThan(0);
  });

  it("should validate all fields in the expand are valid", async () => {
    const result = await db
      .from("contacts")
      .list()
      .expand("users", (b) => {
        // @ts-expect-error - this field is not real
        return b.select("not_real_field");
      })
      .execute({
        fetchHandler: createMockFetch(
          mockResponses["list with invalid expand"],
        ),
      });

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("not_real_field");
  });

  describe("Metadata", () => {
    it("should retrieve database metadata in JSON format by default", async () => {
      const metadata = await db.getMetadata();

      // Type checks: default is JSON (Metadata type)
      expectTypeOf(metadata).not.toBeString();
      expectTypeOf(metadata).not.toBeUnknown();
      expectTypeOf(metadata).not.toBeAny();
      expectTypeOf(metadata).toEqualTypeOf<Metadata>();

      // Runtime checks
      expect(metadata).toBeDefined();
      expect(typeof metadata).toBe("object");
    });

    it("should retrieve database metadata in JSON format when explicitly specified", async () => {
      const metadata = await db.getMetadata({ format: "json" });

      // Type checks: explicit JSON (Metadata type)
      expectTypeOf(metadata).not.toBeString();
      expectTypeOf(metadata).not.toBeUnknown();
      expectTypeOf(metadata).not.toBeAny();
      expectTypeOf(metadata).toEqualTypeOf<Metadata>();

      // Runtime checks
      expect(metadata).toBeDefined();
      expect(typeof metadata).toBe("object");

      expect(metadata).toHaveProperty("contacts");
    });

    it("should retrieve database metadata in XML format", async () => {
      const metadata = await db.getMetadata({ format: "xml" });

      // Type checks: XML format returns string
      expectTypeOf(metadata).not.toBeUnknown();
      expectTypeOf(metadata).not.toBeAny();
      expectTypeOf(metadata).toEqualTypeOf<string>();

      // Runtime checks
      expect(metadata).toBeDefined();
      expect(typeof metadata).toBe("string");
      expect(metadata).toContain("<?xml");
      expect(metadata).toContain("edmx:Edmx");
    });
  });
});

describe("Entity IDs", () => {
  if (!username || !password) {
    it.skip("Username and password required for entity IDs tests", () => {});
    return;
  }

  const connection = new FMServerConnection({
    serverUrl: serverUrl!,
    auth: { username, password },
  });

  const db = connection.database(database!, {
    occurrences: occurrencesWithIds,
  });

  const dbWithoutIds = connection.database(database!, {
    occurrences: occurrencesWithIds,
    useEntityIds: false,
  });

  it("should not use entity IDs in the queryString if useEntityIds is false", async () => {
    const query = dbWithoutIds
      .from("contacts")
      .list()
      .select("name_renamed", "hobby")
      .expand("users")
      .filter({ hobby: "Testing" })
      .top(1);
    const queryString = query.getQueryString();
    console.log(queryString);
    expect(queryString).not.toContain("FMFID");
    expect(queryString).not.toContain("FMTID");
  });

  it("should replace field names in select statements with entity IDs", async () => {
    const query = db
      .from("contacts")
      .list()
      .select("name_renamed", "hobby")
      .top(1);

    const queryString = query.getQueryString();
    expect(queryString).toContain("25770868870");
    expect(queryString).toContain("30065836166");
    expect(queryString).not.toContain("name_renamed");
    expect(queryString).not.toContain("hobby");
  });

  it("should list records with entity IDs", async () => {
    let rawResponseData: any;

    let capturedPreferHeader: string | null = null;
    db.from("contacts")
      .list()
      .top(1)
      .execute({
        hooks: {
          before: async (req) => {
            const headers = req.headers;
            capturedPreferHeader = headers.get("Prefer");
            return;
          },
        },
        fetchHandler: simpleMock({ status: 200, body: { value: [{}] } }),
      });
    expect(capturedPreferHeader).toBe("fmodata.entity-ids");

    const result = await db
      .from("contacts")
      .list()
      .top(1)
      .execute({
        hooks: {
          after: async (req, res) => {
            // Clone the response so we can read it without consuming the original
            const clonedRes = res.clone();
            rawResponseData = await clonedRes.json();
          },
        },
      });

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    if (!result.data) throw new Error("Expected result.data to be defined");
    expect(Array.isArray(result.data)).toBe(true);

    const firstRecord = result.data[0];
    assert(firstRecord, "Should have a first record");

    // Verify the raw response contains field IDs (FMFID:xxx format)
    expect(rawResponseData).toBeDefined();
    expect(rawResponseData.value).toBeDefined();
    expect(Array.isArray(rawResponseData.value)).toBe(true);

    // Check that the raw response uses field IDs (not field names)
    const rawFirstRecord = rawResponseData.value[0];
    const rawFieldKeys = Object.keys(rawFirstRecord);

    // Assert that raw response has FMFIDs and NOT field names
    expect(rawFieldKeys).toContain("FMFID:25770868870"); // should be "name"
    expect(rawFieldKeys).not.toContain("name");
    expect(rawFieldKeys).toContain("FMFID:30065836166"); // should be "hobby"
    expect(rawFieldKeys).not.toContain("hobby");
    expect(rawFieldKeys).toContain("FMFID:38655770758"); // should be "id_user"
    expect(rawFieldKeys).not.toContain("id_user");
    expect(rawFieldKeys).toContain("FMFID:4296032390"); // should be "PrimaryKey"
    expect(rawFieldKeys).not.toContain("PrimaryKey");
    expect(rawFieldKeys).toContain("FMFID:8590999686"); // should be "CreationTimestamp"
    expect(rawFieldKeys).not.toContain("CreationTimestamp");

    // Verify that the transformed data uses field names (not IDs)
    const transformedFieldKeys = Object.keys(firstRecord);
    expect(transformedFieldKeys).toContain("name_renamed");
    expect(transformedFieldKeys).toContain("hobby");
    expect(transformedFieldKeys).toContain("id_user");
    expect(transformedFieldKeys).toContain("PrimaryKey");
    expect(transformedFieldKeys).toContain("CreationTimestamp");
    expect(transformedFieldKeys).not.toContain("FMFID:25770868870");
  });

  it("should not transform if the feature is disabled (even if ids are provided)", async () => {
    let rawResponseData: any;

    const query = dbWithoutIds.from("contacts").list().select("hobby").top(1);

    // should not use ids when useEntityIds is false
    expect(query.getQueryString()).toContain("contacts");
    expect(query.getQueryString()).not.toContain("FMFID:");
    expect(query.getQueryString()).not.toContain("FMTID:");

    const result = await query.execute({
      hooks: {
        after: async (req, res) => {
          // Clone the response so we can read it without consuming the original
          const clonedRes = res.clone();
          rawResponseData = await clonedRes.json();
        },
      },
    });

    if (result.error) {
      console.error(result.error);
    }

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    if (!result.data) throw new Error("Expected result.data to be defined");
    expect(Array.isArray(result.data)).toBe(true);

    const firstRecord = result.data[0];
    assert(firstRecord, "Should have a first record");

    // Verify the raw response contains field IDs (FMFID:xxx format)
    expect(rawResponseData).toBeDefined();
    expect(rawResponseData.value).toBeDefined();
    expect(Array.isArray(rawResponseData.value)).toBe(true);

    // Check that the raw response uses field IDs (not field names)
    const rawFirstRecord = rawResponseData.value[0];
    const rawFieldKeys = Object.keys(rawFirstRecord);

    // Assert that raw response has field names and NOT FMFIDs (since useEntityIds is false)
    expect(rawFieldKeys).not.toContain("FMFID:"); // should NOT have FMFIDs
    expect(rawFieldKeys).toContain("hobby");

    // Verify that the transformed data uses field names (not IDs)
    const transformedFieldKeys = Object.keys(firstRecord);
    expect(transformedFieldKeys).toContain("hobby");
    expect(transformedFieldKeys).not.toContain("FMFID:");
  });

  it("should properly type and validate expanded properties with entity IDs", async () => {
    // get the first record
    const result = await db
      .from("contacts")
      .list()
      .top(1)
      .select("PrimaryKey")
      .execute();

    const firstRecord = result.data?.[0];
    assert(firstRecord, "Should have a first record");

    // now expand the users property
    const expandedResult = await db
      .from("contacts")
      .get(firstRecord.PrimaryKey)
      .expand("users");

    // should use the table id in the query string
    expect(expandedResult.getQueryString()).not.toContain("/contacts(");
  });
});

describe("Batch Operations", () => {
  if (!username || !password) {
    it.skip("Username and password required for batch operations tests", () => {});
    return;
  }

  const connection = new FMServerConnection({
    serverUrl: serverUrl!,
    auth: { username, password },
  });

  const db = connection.database(database!, {
    occurrences: [contactsTOForBatch, usersTOForBatch],
  });

  const batchCreatedRecordIds: string[] = [];

  afterEach(async () => {
    const entitySet = db.from("contacts");

    // Delete records by ID
    for (const recordId of batchCreatedRecordIds) {
      try {
        await entitySet.delete().byId(recordId).execute();
      } catch (error) {
        // Ignore errors - record may have already been deleted
        console.warn(`Failed to delete record ${recordId}:`, error);
      }
    }
    batchCreatedRecordIds.length = 0;
  });

  it("should execute simple batch with two GET queries", async () => {
    // Create two different query builders
    const query1 = db.from("contacts").list().top(2);
    const query2 = db.from("users").list().top(2);

    // Execute batch
    const result = await db.batch([query1, query2]).execute();

    // Verify no error
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();

    if (!result.data) {
      throw new Error("Expected result.data to be defined");
    }

    // Verify we got a tuple with two elements
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBe(2);

    // Verify first result (contacts)
    const [contactsResult, usersResult] = result.data;

    // Contacts should be an array
    expect(Array.isArray(contactsResult)).toBe(true);
    const firstContact = contactsResult[0]!;
    expect(firstContact).toBeDefined();
    expect(firstContact).not.toHaveProperty("@odata.id");
    expect(firstContact).not.toHaveProperty("@odata.editLink");
    expect(firstContact.hobby).toBe("static-value");
  });

  it("should allow adding to a batch after it has been created", async () => {
    const batch = db.batch([]);
    batch.addRequest(db.from("contacts").list().top(2));
    const result = await batch.execute();

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
  });

  it("should execute batch with mixed operations (GET + POST)", async () => {
    // Create a GET query and a POST insert
    const listQuery = db.from("contacts").list().top(2);
    const insertQuery = db.from("contacts").insert({
      name: "Batch Test User",
      hobby: "Testing",
    });

    // Execute batch with mixed operations
    const result = await db.batch([listQuery, insertQuery]).execute();

    // Verify no error
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();

    if (!result.data) {
      throw new Error("Expected result.data to be defined");
    }

    // Verify we got a tuple with two elements
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBe(2);

    const [listResult, insertResult] = result.data;

    // Verify list result is an array
    expect(Array.isArray(listResult)).toBe(true);
    expect(listResult.length).toBeGreaterThan(0);

    // Verify insert result
    expect(insertResult).toBeDefined();
    expect(typeof insertResult).toBe("object");
  });

  it("should execute batch with multiple POST operations in a changeset", async () => {
    // Create multiple insert operations
    const insert1 = db.from("contacts").insert({
      name: "Batch User 1",
      hobby: "Reading",
    });

    const insert2 = db.from("contacts").insert({
      name: "Batch User 2",
      hobby: "Writing",
    });

    const insert3 = db.from("contacts").insert({
      name: "Batch User 3",
      hobby: "Gaming",
    });

    // Execute batch with multiple POST operations
    const result = await db.batch([insert1, insert2, insert3]).execute();

    // Verify no error
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();

    if (!result.data) {
      throw new Error("Expected result.data to be defined");
    }

    // Verify we got three results
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBe(3);

    const [result1, result2, result3] = result.data;

    // All inserts should return empty objects (204 No Content)
    expect(result1).toBeDefined();
    expect(typeof result1).toBe("object");
    expect(result2).toBeDefined();
    expect(typeof result2).toBe("object");
    expect(result3).toBeDefined();
    expect(typeof result3).toBe("object");
  });

  it("should execute complex batch with multiple operation types", async () => {
    // First, create a record we can update/delete
    const setupInsert = await db
      .from("contacts")
      .insert({
        name: "Test Record for Batch",
        hobby: "Testing",
      })
      .execute();

    expect(setupInsert.error).toBeUndefined();
    const testRecordId = setupInsert.data?.PrimaryKey;
    if (!testRecordId) {
      throw new Error("Failed to create test record");
    }
    batchCreatedRecordIds.push(testRecordId);

    // Create a complex batch with multiple operation types
    const listQuery = db.from("contacts").list().top(1);
    const insertOp = db.from("contacts").insert({
      name: "Complex Batch Insert",
      hobby: "Batch Testing",
    });
    const updateOp = db
      .from("contacts")
      .update({
        name: "Updated via Batch",
      })
      .byId(testRecordId);
    const deleteOp = db.from("contacts").delete().byId(testRecordId);

    // Execute the complex batch
    const result = await db
      .batch([listQuery, insertOp, updateOp, deleteOp])
      .execute();

    // Verify no error
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();

    if (!result.data) {
      throw new Error("Expected result.data to be defined");
    }

    // Verify we got four results
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBe(4);

    const [listResult, insertResult, updateResult, deleteResult] = result.data;

    // Verify list result
    expect(Array.isArray(listResult)).toBe(true);
    expect(listResult.length).toBe(1);

    // Verify insert result (204 No Content)
    expect(insertResult).toBeDefined();
    expect(typeof insertResult).toBe("object");

    // Verify update result
    expect(updateResult).toBeDefined();
    expect(typeof updateResult).toBe("object");
    expect(updateResult.updatedCount).toBeDefined();

    // Verify delete result
    expect(deleteResult).toBeDefined();
    expect(typeof deleteResult).toBe("object");
    expect(deleteResult.deletedCount).toBeDefined();
  });

  it("should correctly infer tuple types for batch results", async () => {
    // Create a batch with different operation types
    const query1 = db.from("contacts").list().top(1);
    const query2 = db.from("users").list().top(1);
    const insert = db.from("contacts").insert({
      name: "Type Test User",
      hobby: "Testing Types",
    });

    const result = await db.batch([query1, query2, insert]).execute();

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();

    if (!result.data) {
      throw new Error("Expected result.data to be defined");
    }

    expectTypeOf(result.data).not.toBeAny();

    const contacts = result.data[0];
    const users = result.data[1];
    const insertedContact = result.data[2];
    expectTypeOf(contacts).not.toBeAny();
    expectTypeOf(users).not.toBeAny();
    expectTypeOf(insertedContact).not.toBeAny();

    // Verify types are correctly inferred
    expect(Array.isArray(contacts)).toBe(true);
    expect(Array.isArray(users)).toBe(true);
    expect(typeof insertedContact).toBe("object");

    const firstContact = contacts[0]!;
    expect(firstContact).toBeDefined();

    const hobby: string = firstContact.hobby;
    expect(typeof hobby).toBe("string");

    const firstUser = users[0]!;
    expect(firstUser).toBeDefined();

    expectTypeOf(firstUser.name).not.toBeAny();

    // Clean up
    if (insertedContact.PrimaryKey) {
      batchCreatedRecordIds.push(insertedContact.PrimaryKey);
    }
  });
});
