/**
 * Mock Fetch Tests
 *
 * These tests use captured responses from real FileMaker OData API calls
 * to test the client without requiring a live server connection.
 *
 * The mock responses are stored in tests/fixtures/responses.ts and are
 * captured using the capture script: pnpm capture
 *
 * To add new tests:
 * 1. First, ensure you have a corresponding mock response captured
 * 2. Create a test that uses the same query pattern
 * 3. The mock fetch will automatically match the request URL to the stored response
 */

import { describe, it, expect, expectTypeOf, assert } from "vitest";
import { simpleMock } from "./utils/mock-fetch";
import {
  createMockClient,
  hobbyEnum,
  usersSimpleTO,
  occurrences,
} from "./utils/test-setup";
import { z } from "zod/v4";

describe("Validation Tests", () => {
  const client = createMockClient();
  const db = client.database("fmdapi_test.fmp12", {
    occurrences: occurrences,
  });
  const simpleDb = client.database("fmdapi_test.fmp12", {
    occurrences: [usersSimpleTO],
  });

  describe("validateRecord", () => {
    it("should validate a single record", async () => {
      const result = await db
        .from("contacts")
        .list()
        .select("hobby")
        .execute({
          fetchHandler: simpleMock({
            status: 200,
            body: {
              "@context":
                "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/$metadata#contacts",
              value: [
                {
                  hobby: "Invalid Hobby",
                },
              ],
            },
          }),
        });

      assert(result.data, "Result data should be defined");
      const firstRecord = result.data?.[0];
      assert(firstRecord, "First record should be defined");

      // should use catch block to validate the hobby
      expect(firstRecord?.hobby).toBe("Unknown");
    });

    it("should validate records within an expand expression", async () => {
      const result = await db
        .from("contacts")
        .list()
        .expand("users", (b) => b.select("name", "fake_field"))
        .execute({
          fetchHandler: simpleMock({
            status: 200,
            body: {
              "@context":
                "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/$metadata#contacts",
              value: [
                {
                  PrimaryKey: "B5BFBC89-03E0-47FC-ABB6-D51401730227",
                  CreationTimestamp: "2025-10-31T10:03:27Z",
                  CreatedBy: "admin",
                  ModificationTimestamp: "2025-10-31T15:55:53Z",
                  ModifiedBy: "admin",
                  name: "Eric",
                  hobby: "Board games",
                  id_user: "1A269FA3-82E6-465A-94FA-39EE3F2F9B5D",
                  users: [
                    {
                      name: "Test User",
                    },
                  ],
                },
              ],
            },
          }),
        });

      assert(result.data, "Result data should be defined");
      expect(result.error).toBeUndefined();
      if (!result.data) throw new Error("Expected result.data to be defined");
      const firstRecord = result.data[0]!;
      assert(firstRecord, "First record should be defined");

      // Verify the contact record is validated
      expect(firstRecord.name).toBe("Eric");
      expect(firstRecord.hobby).toBe("Board games");

      // Verify the expanded users are validated and present
      expect(firstRecord.users).toBeDefined();
      expect(Array.isArray(firstRecord.users)).toBe(true);
      expect(firstRecord.users.length).toBe(1);

      const expandedUser = firstRecord.users[0]!;

      assert(expandedUser, "Expanded user should be defined");

      // Verify the expanded user fields are validated according to schema
      expect(expandedUser.name).toBe("Test User");
      expect(expandedUser.fake_field).toBe(
        "I only exist in the schema, not the database",
      );
    });
  });
  it("should automatically select only fields in the schema", async () => {
    const query = simpleDb.from("users").list();

    expect(query.getQueryString()).toBe('/users?$select="id",name&$top=1000');
  });

  it("should skip validation if requested", async () => {
    const result = await db
      .from("contacts")
      .list()
      .execute({
        skipValidation: true,
        fetchHandler: simpleMock({
          status: 200,
          body: {
            "@context":
              "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/$metadata#contacts",
            value: [
              {
                PrimaryKey: "B5BFBC89-03E0-47FC-ABB6-D51401730227",
                hobby: "not a valid hobby",
              },
            ],
          },
        }),
      });

    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    if (!result.data) throw new Error("Expected result.data to be defined");
    expect(Array.isArray(result.data)).toBe(true);

    const firstRecord = result.data[0]!;
    // types should not change, even if skipValidation is true
    expectTypeOf(firstRecord.hobby).toEqualTypeOf<z.infer<
      typeof hobbyEnum
    > | null>();

    expect(firstRecord?.hobby).toBe("not a valid hobby");
  });

  it("should return odata annotations if requested, even if skipValidation is true", async () => {
    const result = await db
      .from("contacts")
      .list()
      .execute({
        skipValidation: true,
        includeODataAnnotations: true,
        fetchHandler: simpleMock({
          status: 200,
          body: {
            "@context":
              "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/$metadata#contacts",
            value: [
              {
                "@id":
                  "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts(B5BFBC89-03E0-47FC-ABB6-D51401730227)",
                "@editLink":
                  "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts(B5BFBC89-03E0-47FC-ABB6-D51401730227)",
                PrimaryKey: "B5BFBC89-03E0-47FC-ABB6-D51401730227",
                hobby: "not a valid hobby",
              },
            ],
          },
        }),
      });

    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    if (!result.data) throw new Error("Expected result.data to be defined");
    expect(Array.isArray(result.data)).toBe(true);

    const firstRecord = result.data[0]!;
    expect(firstRecord).toHaveProperty("@id");
    expect(firstRecord).toHaveProperty("@editLink");
  });
});
