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

import { assert } from "node:console";
import { eq } from "@proofkit/fmodata";
import { describe, expect, expectTypeOf, it } from "vitest";
import { mockResponses } from "./fixtures/responses";
import { createMockFetch, simpleMock } from "./utils/mock-fetch";
import { contacts, createMockClient } from "./utils/test-setup";

describe("Mock Fetch Tests", () => {
  const client = createMockClient();
  const db = client.database("fmdapi_test.fmp12");

  describe("List queries", () => {
    it("should execute a basic list query using mocked response", async () => {
      const result = await db
        .from(contacts)
        .list()
        .execute({
          fetchHandler: createMockFetch(mockResponses["list-with-pagination"] ?? {}),
        });

      expect(result).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      if (!result.data) {
        throw new Error("Expected result.data to be defined");
      }
      expect(Array.isArray(result.data)).toBe(true);

      const firstRecord = result.data[0];
      expect(firstRecord).not.toHaveProperty("@id");
      expect(firstRecord).not.toHaveProperty("@editLink");
    });

    it("should return odata annotations if requested", async () => {
      const result = await db
        .from(contacts)
        .list()
        .execute({
          fetchHandler: createMockFetch(mockResponses["list-with-pagination"] ?? {}),
          includeODataAnnotations: true,
        });

      expect(result).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      if (!result.data) {
        throw new Error("Expected result.data to be defined");
      }
      expect(Array.isArray(result.data)).toBe(true);

      const firstRecord = result.data[0];
      expect(firstRecord).toHaveProperty("@id");
      expect(firstRecord).toHaveProperty("@editLink");
    });

    it("should execute a list query with $select using mocked response", async () => {
      const result = await db
        .from(contacts)
        .list()
        .select({ name: contacts.name, PrimaryKey: contacts.PrimaryKey })
        .execute({
          fetchHandler: createMockFetch(mockResponses["list-with-pagination"] ?? {}),
        });

      expect(result).toBeDefined();
      if (result.error) {
        console.log(result.error);
      }
      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      if (!result.data) {
        throw new Error("Expected result.data to be defined");
      }
      if (result.data.length > 0) {
        const firstRecord = result.data[0] as any;
        // Verify selected fields are present (if captured response has them)
        expect(firstRecord).toBeDefined();
      }
    });

    it("should execute a list query with $top using mocked response", async () => {
      const result = await db
        .from(contacts)
        .list()
        .top(5)
        .execute({
          fetchHandler: createMockFetch(mockResponses["list-with-orderby"] ?? {}),
        });

      expect(result).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      if (!result.data) {
        throw new Error("Expected result.data to be defined");
      }
      // If the mock response limits results, verify we got limited results
      if (result.data.length > 0) {
        expect(result.data.length).toBeLessThanOrEqual(5);
      }
    });

    it("should execute a list query with $orderby using mocked response", async () => {
      const result = await db
        .from(contacts)
        .list()
        .orderBy("name")
        .top(5)
        .execute({
          fetchHandler: createMockFetch(mockResponses["list-with-orderby"] ?? {}),
        });

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should error if more than 1 record is returned in single mode", async () => {
      const result = await db
        .from(contacts)
        .list()
        .single()
        .execute({
          fetchHandler: createMockFetch(mockResponses["list-with-orderby"] ?? {}),
        });

      expect(result).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
    });
    it("should not error if no records are returned in maybeSingle mode", async () => {
      const result = await db
        .from(contacts)
        .list()
        .maybeSingle()
        .execute({
          fetchHandler: simpleMock({ status: 200, body: { value: [] } }),
        });

      expect(result.data).toBeNull();
      expect(result.error).toBeUndefined();

      assert(!result.error, "Expected no error");
      expectTypeOf(result.data).toBeNullable();
    });
    it("should error if more than 1 record is returned in maybeSingle mode", async () => {
      const result = await db
        .from(contacts)
        .list()
        .maybeSingle()
        .execute({
          // TODO: add better mock data
          fetchHandler: simpleMock({ status: 200, body: { value: [{}, {}] } }),
        });

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it("should execute a list query with pagination using mocked response", async () => {
      const result = await db
        .from(contacts)
        .list()
        .top(2)
        .skip(2)
        .execute({
          fetchHandler: createMockFetch(mockResponses["list-with-pagination"] ?? {}),
        });

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe("Single record queries", () => {
    it("should execute a single record query using mocked response", async () => {
      const result = await db
        .from(contacts)
        .get("B5BFBC89-03E0-47FC-ABB6-D51401730227")
        .execute({
          fetchHandler: createMockFetch(mockResponses["single-record"] ?? {}),
        });

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();

      // Single record queries return the record directly, not wrapped in { value: [...] }
      expect(typeof result.data).toBe("object");
    });

    it("should execute a single field query using mocked response", async () => {
      // Note: Type errors for wrong columns are now caught at compile time
      // We can't easily test this with @ts-expect-error since we'd need a wrong table's column

      const result = await db
        .from(contacts)
        .get("B5BFBC89-03E0-47FC-ABB6-D51401730227")
        .getSingleField(contacts.name)
        .execute({
          fetchHandler: createMockFetch(mockResponses["single-field"] ?? {}),
        });

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();

      if (result.data) {
        expectTypeOf(result.data).toEqualTypeOf<string>();
      }

      // Single field queries return the field value directly
      expect(result.data).toBe("Eric");
    });
  });

  describe("Query builder methods", () => {
    it("should generate correct query strings even with mocks", () => {
      const queryString = db
        .from(contacts)
        .list()
        .select({ name: contacts.name, hobby: contacts.hobby })
        .where(eq(contacts.name, "John"))
        .orderBy("name")
        .top(10)
        .getQueryString();

      expect(queryString).toContain("$select");
      expect(queryString).toContain("name");
      expect(queryString).toContain("hobby");
      expect(queryString).toContain("$filter");
      expect(queryString).toContain("$orderby");
      expect(queryString).toContain("$top");
    });
  });
});
