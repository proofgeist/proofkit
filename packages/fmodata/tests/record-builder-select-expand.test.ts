/**
 * RecordBuilder Select/Expand Tests
 *
 * Tests for type-safe select() and expand() methods on the RecordBuilder (.get())
 * These tests validate:
 * - Type-safe field selection with proper return type narrowing
 * - Type-safe relation expansion with callback support
 * - Query string generation
 * - Response validation with expanded data
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import { z } from "zod/v4";
import { createMockFetch } from "./utils/mock-fetch";
import {
  createMockClient,
  occurrences,
  occurrencesWithIds,
  contactsBase,
  usersBase,
} from "./utils/test-setup";
import { defineTableOccurrence, buildOccurrences } from "../src/index";

describe("RecordBuilder Select/Expand", () => {
  const client = createMockClient();
  const db = client.database("test_db", {
    occurrences: occurrences,
  });
  const dbWithIds = client.database("test_db_with_ids", {
    occurrences: occurrencesWithIds,
  });

  // Create occurrences with different defaultSelect values for testing
  const contactsWithSchemaSelect = defineTableOccurrence({
    name: "contacts",
    baseTable: contactsBase,
    defaultSelect: "schema", // Should select all schema fields
  });

  const contactsWithArraySelect = defineTableOccurrence({
    name: "contacts",
    baseTable: contactsBase,
    defaultSelect: ["name", "hobby", "id_user"] as const, // Specific fields
  });

  const occurrencesWithSchemaSelect = buildOccurrences({
    occurrences: [contactsWithSchemaSelect],
  });

  const occurrencesWithArraySelect = buildOccurrences({
    occurrences: [contactsWithArraySelect],
  });

  const dbWithSchemaSelect = client.database("test_db_schema_select", {
    occurrences: occurrencesWithSchemaSelect,
  });

  const dbWithArraySelect = client.database("test_db_array_select", {
    occurrences: occurrencesWithArraySelect,
  });

  // Create occurrences with navigation where target has different defaultSelect values
  const contactsForExpandTest = defineTableOccurrence({
    name: "contacts",
    baseTable: contactsBase,
    defaultSelect: "all", // Parent table uses all
  });

  const usersWithSchemaSelect = defineTableOccurrence({
    name: "users",
    baseTable: usersBase,
    defaultSelect: "schema", // Target table uses schema
  });

  const usersWithArraySelect = defineTableOccurrence({
    name: "users",
    baseTable: usersBase,
    defaultSelect: ["name", "active"] as const, // Target table uses specific fields
  });

  const occurrencesWithExpandSchemaSelect = buildOccurrences({
    occurrences: [contactsForExpandTest, usersWithSchemaSelect],
    navigation: {
      contacts: ["users"],
      users: ["contacts"],
    },
  });

  const occurrencesWithExpandArraySelect = buildOccurrences({
    occurrences: [contactsForExpandTest, usersWithArraySelect],
    navigation: {
      contacts: ["users"],
      users: ["contacts"],
    },
  });

  const dbWithExpandSchemaSelect = client.database("test_db_expand_schema", {
    occurrences: occurrencesWithExpandSchemaSelect,
  });

  const dbWithExpandArraySelect = client.database("test_db_expand_array", {
    occurrences: occurrencesWithExpandArraySelect,
  });

  describe("defaultSelect on get()", () => {
    it("should apply defaultSelect: 'schema' fields to query string when no select is called", () => {
      const queryString = dbWithSchemaSelect
        .from("contacts")
        .get("test-uuid")
        .getQueryString();

      // When defaultSelect is "schema", the query should include $select with all schema fields
      expect(queryString).toContain("$select=");

      // Should contain all fields from the contacts schema
      expect(queryString).toContain("PrimaryKey");
      expect(queryString).toContain("CreationTimestamp");
      expect(queryString).toContain("CreatedBy");
      expect(queryString).toContain("ModificationTimestamp");
      expect(queryString).toContain("ModifiedBy");
      expect(queryString).toContain("name");
      expect(queryString).toContain("hobby");
      expect(queryString).toContain("id_user");
    });

    it("should apply defaultSelect: array of fields to query string when no select is called", () => {
      const queryString = dbWithArraySelect
        .from("contacts")
        .get("test-uuid")
        .getQueryString();

      // When defaultSelect is an array, the query should include $select with those specific fields
      expect(queryString).toContain("$select=");
      expect(queryString).toContain("name");
      expect(queryString).toContain("hobby");
      expect(queryString).toContain("id_user");

      // Should NOT contain fields not in the array
      expect(queryString).not.toContain("PrimaryKey");
      expect(queryString).not.toContain("CreationTimestamp");
    });

    it("should NOT apply defaultSelect when defaultSelect is 'all'", () => {
      const queryString = db.from("contacts").get("test-uuid").getQueryString();

      // When defaultSelect is "all", no $select should be added
      // (current behavior - FileMaker returns all fields)
      expect(queryString).toBe("/contacts('test-uuid')");
      expect(queryString).not.toContain("$select=");
    });

    it("should override defaultSelect when explicit select() is called", () => {
      const queryString = dbWithSchemaSelect
        .from("contacts")
        .get("test-uuid")
        .select("name") // Explicit select should override defaultSelect
        .getQueryString();

      expect(queryString).toContain("$select=name");
      // Should not contain other schema fields when explicit select is used
      expect(queryString).not.toContain("PrimaryKey");
      expect(queryString).not.toContain("hobby");
    });
  });

  describe("defaultSelect within expand()", () => {
    it("should apply target table defaultSelect: 'schema' in expand when no callback select is called", () => {
      // When expanding to 'users' which has defaultSelect: "schema",
      // the expand should automatically include $select with all user schema fields
      const queryString = dbWithExpandSchemaSelect
        .from("contacts")
        .get("test-uuid")
        .expand("users")
        .getQueryString();

      // The expand should include $select for the target table's schema fields
      expect(queryString).toContain("$expand=users");
      expect(queryString).toContain("$select=");

      // Should contain user schema fields within the expand
      expect(queryString).toContain("id");
      expect(queryString).toContain("name");
      expect(queryString).toContain("active");
    });

    it("should apply target table defaultSelect: array in expand when no callback select is called", () => {
      // When expanding to 'users' which has defaultSelect: ["name", "active"],
      // the expand should automatically include $select with those specific fields
      const queryString = dbWithExpandArraySelect
        .from("contacts")
        .get("test-uuid")
        .expand("users")
        .getQueryString();

      // The expand should include $select for the target table's default fields
      expect(queryString).toContain("$expand=users($select=");
      expect(queryString).toContain("name");
      expect(queryString).toContain("active");

      // Should NOT contain fields not in the defaultSelect array
      expect(queryString).not.toMatch(/\$expand=users\([^)]*id[^)]*\)/);
    });

    it("should override target defaultSelect when callback provides explicit select", () => {
      // Even though users has defaultSelect: ["name", "active"],
      // an explicit callback select should override it
      const queryString = dbWithExpandArraySelect
        .from("contacts")
        .get("test-uuid")
        .expand("users", (b) => b.select("id"))
        .getQueryString();

      // Should only have the explicitly selected field (quotes may vary based on odata-query library)
      expect(queryString).toContain("$expand=users($select=");
      expect(queryString).toMatch(/\$select=["']?id["']?\)/);
      // Should NOT contain the defaultSelect fields
      expect(queryString).not.toContain("active");
    });

    it("should apply defaultSelect in expand on list() queries too", () => {
      const queryString = dbWithExpandArraySelect
        .from("contacts")
        .list()
        .expand("users")
        .getQueryString();

      // The expand should include $select for the target table's default fields
      expect(queryString).toContain("$expand=users($select=");
      expect(queryString).toContain("name");
      expect(queryString).toContain("active");
    });
  });

  describe("select() method", () => {
    it("should generate query string with $select for single field", () => {
      const queryString = db
        .from("contacts")
        .get("test-uuid")
        .select("name")
        .getQueryString();

      expect(queryString).toBe("/contacts('test-uuid')?$select=name");
    });

    it("should generate query string with $select for multiple fields", () => {
      const queryString = db
        .from("contacts")
        .get("test-uuid")
        .select("name", "hobby", "id_user")
        .getQueryString();

      expect(queryString).toContain("$select=");
      expect(queryString).toContain("name");
      expect(queryString).toContain("hobby");
      expect(queryString).toContain("id_user");
    });

    it("should deduplicate selected fields", () => {
      const queryString = db
        .from("contacts")
        .get("test-uuid")
        .select("name", "name", "hobby")
        .getQueryString();

      // Count occurrences of "name" - should only appear once
      const nameCount = (queryString.match(/name/g) || []).length;
      expect(nameCount).toBe(1);
    });

    it("should narrow return type to selected fields only", () => {
      const recordBuilder = db
        .from("contacts")
        .get("test-uuid")
        .select("name", "hobby");

      // Type test - the execute result should only have name and hobby
      // This is a compile-time check
      expectTypeOf(recordBuilder.execute).returns.resolves.toMatchTypeOf<{
        data:
          | {
              name: string | null;
              hobby: string | null;
            }
          | undefined;
        error: any;
      }>();
    });

    it("should provide type errors for non-existent fields", () => {
      // @ts-expect-error - "nonexistent" is not a valid field
      db.from("contacts").get("test-uuid").select("nonexistent");
    });

    it("should include selected fields in getRequestConfig URL", () => {
      const config = db
        .from("contacts")
        .get("test-uuid")
        .select("name", "hobby")
        .getRequestConfig();

      expect(config.url).toContain("$select=");
      expect(config.url).toContain("name");
      expect(config.url).toContain("hobby");
    });
  });

  describe("expand() method", () => {
    it("should generate query string with simple $expand", () => {
      const queryString = db
        .from("contacts")
        .get("test-uuid")
        .expand("users")
        .getQueryString();

      expect(queryString).toBe("/contacts('test-uuid')?$expand=users");
    });

    it("should generate query string with $expand and nested $select", () => {
      const queryString = db
        .from("contacts")
        .get("test-uuid")
        .expand("users", (b) => b.select("name", "active"))
        .getQueryString();

      expect(queryString).toBe(
        "/contacts('test-uuid')?$expand=users($select=name,active)",
      );
    });

    it("should provide autocomplete for known relations", () => {
      const recordBuilder = db.from("contacts").get("test-uuid");

      // The expand parameter should suggest "users" | (string & {})
      expectTypeOf(recordBuilder.expand)
        .parameter(0)
        .not.toEqualTypeOf<string>();
    });

    it("should type callback builder to target table schema", () => {
      db.from("contacts")
        .get("test-uuid")
        .expand("users", (builder) => {
          // builder.select should only accept fields from users table
          expectTypeOf(builder.select).parameter(0).not.toEqualTypeOf<string>();

          return builder.select("name", "active");
        });
    });

    it("should allow arbitrary string relations", () => {
      const queryString = db
        .from("contacts")
        .get("test-uuid")
        .expand("arbitrary_relation")
        .getQueryString();

      expect(queryString).toBe(
        "/contacts('test-uuid')?$expand=arbitrary_relation",
      );
    });

    it("should support $filter in expand callback", () => {
      const queryString = db
        .from("contacts")
        .get("test-uuid")
        .expand("users", (b) => b.filter({ active: true }))
        .getQueryString();

      expect(queryString).toContain("$expand=users($filter=active");
    });

    it("should support $orderby in expand callback", () => {
      const queryString = db
        .from("contacts")
        .get("test-uuid")
        .expand("users", (b) => b.orderBy("name"))
        .getQueryString();

      expect(queryString).toContain("$expand=users($orderby=name");
    });

    it("should support $top in expand callback", () => {
      const queryString = db
        .from("contacts")
        .get("test-uuid")
        .expand("users", (b) => b.top(5))
        .getQueryString();

      expect(queryString).toContain("$expand=users($top=5");
    });

    it("should support $skip in expand callback", () => {
      const queryString = db
        .from("contacts")
        .get("test-uuid")
        .expand("users", (b) => b.skip(10))
        .getQueryString();

      expect(queryString).toContain("$expand=users($skip=10");
    });

    it("should support nested expands", () => {
      // users -> contacts (circular navigation from setup)
      const queryString = db
        .from("contacts")
        .get("test-uuid")
        .expand("users", (b) =>
          b
            .select("name")
            .expand("contacts", (nested) => nested.select("name")),
        )
        .getQueryString();

      expect(queryString).toBe(
        "/contacts('test-uuid')?$expand=users($select=name;$expand=contacts($select=name))",
      );
    });

    it("should support multiple expands via chaining", () => {
      const queryString = db
        .from("contacts")
        .get("test-uuid")
        .expand("users", (b) => b.select("name"))
        .expand("another_relation")
        .getQueryString();

      expect(queryString).toBe(
        "/contacts('test-uuid')?$expand=users($select=name),another_relation",
      );
    });
  });

  describe("select() + expand() combined", () => {
    it("should generate query string with both $select and $expand", () => {
      const queryString = db
        .from("contacts")
        .get("test-uuid")
        .select("name", "hobby")
        .expand("users", (b) => b.select("name"))
        .getQueryString();

      expect(queryString).toContain("$select=name,hobby");
      expect(queryString).toContain("$expand=users($select=name)");
    });

    it("should return properly typed result with both select and expand", () => {
      const recordBuilder = db
        .from("contacts")
        .get("test-uuid")
        .select("name", "hobby")
        .expand("users", (b) => b.select("name", "active"));

      // Type test - result should have name, hobby from contact and users array
      expectTypeOf(recordBuilder.execute).returns.resolves.toMatchTypeOf<{
        data:
          | {
              name: string | null;
              hobby: string | null;
              users: { name: string | null; active: boolean }[];
            }
          | undefined;
        error: any;
      }>();
    });
  });

  describe("execute() with mocked responses", () => {
    it("should execute query with select and return narrowed fields", async () => {
      const mockResponse = {
        url: "https://example.com/test",
        method: "GET",
        status: 200,
        headers: { "content-type": "application/json;charset=utf-8" },
        response: {
          "@context": "$metadata#contacts/$entity",
          "@id": "contacts('test-uuid')",
          "@editLink": "contacts('test-uuid')",
          name: "John Doe",
          hobby: "Reading",
        },
      };

      const result = await db
        .from("contacts")
        .get("test-uuid")
        .select("name", "hobby")
        .execute({
          fetchHandler: createMockFetch(mockResponse),
        });

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe("John Doe");
      expect(result.data?.hobby).toBe("Reading");
    });

    it("should execute query with expand and include related records", async () => {
      const mockResponse = {
        url: "https://example.com/test",
        method: "GET",
        status: 200,
        headers: { "content-type": "application/json;charset=utf-8" },
        response: {
          "@context": "$metadata#contacts/$entity",
          "@id": "contacts('test-uuid')",
          "@editLink": "contacts('test-uuid')",
          PrimaryKey: "test-uuid",
          CreationTimestamp: "2025-01-01T00:00:00Z",
          CreatedBy: "admin",
          ModificationTimestamp: "2025-01-01T00:00:00Z",
          ModifiedBy: "admin",
          name: "John Doe",
          hobby: "Reading",
          id_user: "user-1",
          users: [
            {
              "@id": "users('user-1')",
              "@editLink": "users('user-1')",
              name: "johndoe",
              active: true,
            },
          ],
        },
      };

      const result = await db
        .from("contacts")
        .get("test-uuid")
        .expand("users", (b) => b.select("name", "active"))
        .execute({
          fetchHandler: createMockFetch(mockResponse),
        });

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe("John Doe");
      expect(result.data?.users).toBeDefined();
      expect(result.data?.users).toHaveLength(1);
      expect(result.data?.users[0]?.name).toBe("johndoe");
    });

    it("should strip OData annotations by default", async () => {
      const mockResponse = {
        url: "https://example.com/test",
        method: "GET",
        status: 200,
        headers: { "content-type": "application/json;charset=utf-8" },
        response: {
          "@context": "$metadata#contacts/$entity",
          "@id": "contacts('test-uuid')",
          "@editLink": "contacts('test-uuid')",
          name: "John Doe",
          hobby: "Reading",
        },
      };

      const result = await db
        .from("contacts")
        .get("test-uuid")
        .select("name", "hobby")
        .execute({
          fetchHandler: createMockFetch(mockResponse),
        });

      expect(result.data).toBeDefined();
      // OData annotations should be stripped
      expect((result.data as any)["@id"]).toBeUndefined();
      expect((result.data as any)["@editLink"]).toBeUndefined();
    });

    it("should include OData annotations when requested", async () => {
      const mockResponse = {
        url: "https://example.com/test",
        method: "GET",
        status: 200,
        headers: { "content-type": "application/json;charset=utf-8" },
        response: {
          "@context": "$metadata#contacts/$entity",
          "@id": "contacts('test-uuid')",
          "@editLink": "contacts('test-uuid')",
          name: "John Doe",
          hobby: "Reading",
        },
      };

      const result = await db
        .from("contacts")
        .get("test-uuid")
        .select("name", "hobby")
        .execute({
          fetchHandler: createMockFetch(mockResponse),
          includeODataAnnotations: true,
        });

      expect(result.data).toBeDefined();
      // OData annotations should be present
      expect((result.data as any)["@id"]).toBe("contacts('test-uuid')");
      expect((result.data as any)["@editLink"]).toBe("contacts('test-uuid')");
    });
  });

  describe("getSingleField() mutual exclusion", () => {
    it("should work independently of select/expand", () => {
      // getSingleField should work as before, returning just the field value
      const queryString = db
        .from("contacts")
        .get("test-uuid")
        .getSingleField("name")
        .getQueryString();

      // getSingleField adds /fieldName to the URL, not $select
      expect(queryString).toBe("/contacts('test-uuid')/name");
      expect(queryString).not.toContain("$select");
    });
  });

  describe("getRequestConfig()", () => {
    it("should include query params in URL", () => {
      const config = db
        .from("contacts")
        .get("test-uuid")
        .select("name")
        .expand("users")
        .getRequestConfig();

      expect(config.method).toBe("GET");
      expect(config.url).toContain("$select=name");
      expect(config.url).toContain("$expand=users");
    });
  });

  describe("Complex combinations", () => {
    it("should support select + filter + orderBy + top + nested expand", () => {
      // Using contacts -> users -> contacts (circular navigation from setup)
      const queryString = db
        .from("contacts")
        .get("test-uuid")
        .select("name", "hobby")
        .expand("users", (b) =>
          b
            .select("name", "active")
            .filter({ active: true })
            .orderBy("name")
            .top(10)
            .expand("contacts", (nested) => nested.select("name")),
        )
        .getQueryString();

      // Should contain all query options
      expect(queryString).toContain("$select=name,hobby");
      expect(queryString).toContain("$select=name,active");
      expect(queryString).toContain("$filter=active");
      expect(queryString).toContain("$orderby=name");
      expect(queryString).toContain("$top=10");
      expect(queryString).toContain("$expand=contacts($select=name)");
    });

    it("should support multiple expands with different options", () => {
      const queryString = db
        .from("contacts")
        .get("test-uuid")
        .expand("users", (b) => b.select("name").filter({ active: true }))
        .expand("another_relation", (b) => b.select("some_field" as any).top(5))
        .getQueryString();

      expect(queryString).toContain(
        "users($select=name;$filter=active eq true)",
      );
      expect(queryString).toContain(
        "another_relation($select=some_field;$top=5)",
      );
    });
  });
});
