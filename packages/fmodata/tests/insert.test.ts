/**
 * Insert and Update Tests
 *
 * Tests for the insert() and update() methods with returnFullRecord option.
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { mockResponses } from "./fixtures/responses";
import { createMockFetch } from "./utils/mock-fetch";
import { contacts, createMockClient } from "./utils/test-setup";

const UUID_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;

describe("insert and update operations with returnFullRecord", () => {
  const client = createMockClient();

  it("should insert a record and return the created record with metadata", async () => {
    const db = client.database("fmdapi_test.fmp12", {});

    const result = await db
      .from(contacts)
      .insert({
        name: "Capture test",
      })
      .execute({
        fetchHandler: createMockFetch(mockResponses.insert ?? {}),
      });

    // Verify no errors
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    // @ts-expect-error - should not return odata annotations
    result.data?.["@editLink"];
    // @ts-expect-error - should not return odata annotations
    result.data?.["@id"];

    expect(result.data).not.toHaveProperty("@editLink");
    expect(result.data).not.toHaveProperty("@id");

    // Verify the inserted record has expected structure (not specific values that change with captures)
    expect(result.data).toHaveProperty("PrimaryKey");
    expect(typeof result.data?.PrimaryKey).toBe("string");
    expect(result.data?.PrimaryKey).toMatch(UUID_REGEX);

    // Check fields that should have stable values
    expect(result.data).toMatchObject({
      name: "Capture test",
      hobby: null,
      id_user: null,
      my_calc: "you betcha",
    });
  });

  it("should allow returnFullRecord=false to get just ROWID", async () => {
    const db = client.database("fmdapi_test.fmp12");

    const result = await db
      .from(contacts)
      .insert(
        {
          name: "Capture test",
        },
        // Set returnFullRecord to false to get just the ROWID
        { returnFullRecord: false },
      )
      .execute({
        fetchHandler: createMockFetch(mockResponses["insert-return-minimal"] ?? {}),
      });

    // Type check: when returnFullRecord is false, result should only have ROWID
    expectTypeOf(result.data).toEqualTypeOf<{ ROWID: number } | undefined>();

    // Type check: when returnFullRecord is true or omitted, result should have full record
    const fullResult = await db
      .from(contacts)
      .insert(
        {
          name: "anything",
        },
        { returnFullRecord: true },
      )
      .execute({
        fetchHandler: createMockFetch(mockResponses.insert ?? {}),
      });

    expectTypeOf(fullResult.data).not.toEqualTypeOf<{ ROWID: number } | undefined>();

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();

    // when returnFullRecord=false, the library should extract the ROWID from the location header
    expect(result.data).toHaveProperty("ROWID");
    expect(typeof result.data?.ROWID).toBe("number");
    expect(result.data?.ROWID).toBeGreaterThan(0);
  });

  it("should allow returnFullRecord=true for update to get full record", async () => {
    const db = client.database("fmdapi_test.fmp12");

    // Test with returnFullRecord=true
    const result = await db
      .from(contacts)
      .update({ name: "Updated name" }, { returnFullRecord: true })
      .byId("331F5862-2ABF-4FB6-AA24-A00F7359BDDA")
      .execute({
        fetchHandler: createMockFetch(mockResponses.insert ?? {}), // Reuse insert mock, same structure
      });

    // Type check: when returnFullRecord is true, result should have full record
    expectTypeOf(result.data).not.toEqualTypeOf<{ updatedCount: number } | undefined>();

    // Test without returnFullRecord (default - returns count)
    const countResult = await db
      .from(contacts)
      .update({ name: "Updated name" })
      .byId("331F5862-2ABF-4FB6-AA24-A00F7359BDDA")
      .execute({
        fetchHandler: createMockFetch(mockResponses.insert ?? {}),
      });

    // Type check: default should return count
    expectTypeOf(countResult.data).toEqualTypeOf<{ updatedCount: number } | undefined>();

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();

    // when returnFullRecord=true, should return the full updated record
    expect(result.data).toHaveProperty("PrimaryKey");
    expect(typeof result.data?.PrimaryKey).toBe("string");
    expect(result.data?.name).toBe("Capture test"); // From mock response
  });
});
