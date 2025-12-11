/**
 * Expand API Specification Tests
 *
 * These tests define the expected TypeScript behavior for the expand() API.
 * They use expectTypeOf to validate strict typing at compile time.
 *
 * DO NOT RUN THESE TESTS YET - they define the API we want to build.
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import { z } from "zod/v4";
import { defineBaseTable, defineTableOccurrence, buildOccurrences } from "../src/index";
import { InferSchemaType } from "../src/types";
import { createMockFetch } from "./utils/mock-fetch";
import { mockResponses } from "./fixtures/responses";
import { createMockClient } from "./utils/test-setup";

describe("Expand API Specification", () => {
  const contactsBase = defineBaseTable({
    schema: {
      id: z.string(),
      name: z.string(),
      hobby: z.string().optional(),
      id_user: z.string(),
    },
    idField: "id",
  });

  const usersBase = defineBaseTable({
    schema: {
      id: z.string(),
      username: z.string(),
      email: z.string(),
      active: z.boolean(),
      id_customer: z.string(),
    },
    idField: "id",
  });

  const customerBase = defineBaseTable({
    schema: {
      id: z.string(),
      name: z.string(),
      address: z.string().optional(),
      tier: z.string(),
    },
    idField: "id",
  });

  // Phase 1: Define base TOs (without navigation)
  const _customerTO = defineTableOccurrence({
    name: "user_customer",
    baseTable: customerBase,
    defaultSelect: "all",
  });

  const _contactsTO = defineTableOccurrence({
    name: "contacts",
    baseTable: contactsBase,
    defaultSelect: "all",
  });

  const _usersTO = defineTableOccurrence({
    name: "users",
    baseTable: usersBase,
    defaultSelect: "all",
  });

  // Phase 2: Build final TOs with navigation
  const [customerTO, contactsTO, usersTO] = buildOccurrences({
    occurrences: [_customerTO, _contactsTO, _usersTO],
    navigation: {
      contacts: ["users"],
      users: ["user_customer", "contacts"],
    },
  });

  const client = createMockClient();

  type UserFieldNames = keyof InferSchemaType<typeof usersBase.schema>;
  type CustomerFieldNames = keyof InferSchemaType<typeof customerBase.schema>;

  const db = client.database("test_db", {
    occurrences: [contactsTO, usersTO, customerTO],
  });

  describe("Simple expand (no callback)", () => {
    it("should generate query string for simple expand", () => {
      const queryString = db
        .from("contacts")
        .list()
        .expand("users")
        .getQueryString();
      expect(queryString).toBe("/contacts?$top=1000&$expand=users");
    });

    it("should allow arbitrary string relations", () => {
      const queryString = db
        .from("contacts")
        .list()
        .expand("arbitrary_relation")
        .getQueryString();
      expect(queryString).toBe(
        "/contacts?$top=1000&$expand=arbitrary_relation",
      );
    });

    it("should provide autocomplete for known relations", () => {
      const entitySet = db.from("contacts");

      // This should show autocomplete for "users" | (string & {})
      expectTypeOf(entitySet.list().expand)
        .parameter(0)
        .not.toEqualTypeOf<string>();
    });
  });

  describe("Expand with callback - select", () => {
    it("should type callback builder to target table schema", () => {
      db.from("contacts")
        .list()
        .expand("users", (builder) => {
          // builder.select should only accept fields from users table
          expectTypeOf(builder.select).parameter(0).not.toEqualTypeOf<string>();

          return builder.select("username", "email");
        });
    });

    it("should have a properly typed response", async () => {
      async () => {
        // checking types only, don't actually make a request
        const result = await db
          .from("contacts")
          .list()
          .expand("users", (b) =>
            b.select(
              "username",
              "email",
              // "id_customer"
            ),
          )
          .execute();

        const firstRecord = result.data![0]!;

        // runtime tests to ensure the fields are not present
        // @ts-expect-error - these fields should not be present
        expect(firstRecord.ROWID).toBeUndefined();
        // @ts-expect-error - these fields should not be present
        expect(firstRecord.ROWMODID).toBeUndefined();

        // ROWID and MODID weren't selected, it's not returned by default
        expectTypeOf(firstRecord).not.toHaveProperty("ROWID");
        expectTypeOf(firstRecord).not.toHaveProperty("ROWMODID");

        // no select was called, so all fields are returned
        expectTypeOf(firstRecord).toHaveProperty("name");

        // users was expanded, so it will be an array in the response
        expectTypeOf(firstRecord).toHaveProperty("users");
        expectTypeOf(firstRecord.users).toBeArray();
        const firstUser = firstRecord.users[0]!;
      };
    });

    it("should generate query string with $select", () => {
      const queryString = db
        .from("contacts")
        .list()
        .expand("users", (b) => b.select("username", "email"))
        .getQueryString();

      expect(queryString).toBe(
        "/contacts?$top=1000&$expand=users($select=username,email)",
      );
    });

    it("should enforce callback returns builder", () => {
      db.from("contacts")
        .list()
        .expand("users", (b) => {
          // Must return the builder
          return b.select("username");
        });
    });
  });

  describe("Expand with callback - filter", () => {
    it("should generate query string with $filter", () => {
      const queryString = db
        .from("contacts")
        .list()
        .expand("users", (b) => b.filter({ active: true }))
        .getQueryString();

      expect(queryString).toContain("$expand=users($filter=active");
    });
  });

  describe("Expand with callback - orderBy", () => {
    it("should generate query string with $orderby", () => {
      const queryString = db
        .from("contacts")
        .list()
        .expand("users", (b) => b.orderBy("username"))
        .getQueryString();

      expect(queryString).toContain("$expand=users($orderby=username");
    });
  });

  describe("Expand with callback - top and skip", () => {
    it("should generate query string with $top", () => {
      const queryString = db
        .from("contacts")
        .list()
        .expand("users", (b) => b.top(5))
        .getQueryString();

      expect(queryString).toContain("$expand=users($top=5");
    });

    it("should generate query string with $skip", () => {
      const queryString = db
        .from("contacts")
        .list()
        .expand("users", (b) => b.skip(10))
        .getQueryString();

      expect(queryString).toContain("$expand=users($skip=10");
    });
  });

  describe("Multiple expands (chaining)", () => {
    it("should allow chaining multiple expand calls", () => {
      const queryString = db
        .from("contacts")
        .list()
        .expand("users", (b) => b.select("username"))
        .expand("other_users")
        .getQueryString();

      expect(queryString).toBe(
        "/contacts?$top=1000&$expand=users($select=username),other_users",
      );
    });

    it("should type each expand callback independently", () => {
      db.from("contacts")
        .list()
        .expand("users", (builder) => {
          // First callback typed to users
          expectTypeOf(builder.select).parameter(0).not.toEqualTypeOf<string>();

          return builder.select("username");
        })
        .expand("other_users", (builder) => {
          // Second callback - arbitrary relation so accepts any
          return builder.select("email");
        });
    });
  });

  describe("Nested expands", () => {
    it("should type nested expand callback to nested target schema", () => {
      db.from("contacts")
        .list()
        .expand("users", (usersBuilder) => {
          return usersBuilder
            .select("username", "email")
            .expand("user_customer", (customerBuilder) => {
              // customerBuilder should be typed to customer schema
              // Verify it accepts valid fields
              return customerBuilder.select("name", "tier");
            });
        });
    });

    it("should generate query string with nested $expand", () => {
      const queryString = db
        .from("contacts")
        .list()
        .expand("users", (b) =>
          b
            .select("username")
            .expand("user_customer", (nested) => nested.select("name")),
        )
        .getQueryString();

      expect(queryString).toBe(
        "/contacts?$top=1000&$expand=users($select=username;$expand=user_customer($select=name))",
      );
    });

    it("should support deeply nested expands (3 levels)", () => {
      const queryString = db
        .from("contacts")
        .list()
        .expand("users", (b) =>
          b.expand("user_customer", (nested) =>
            // If customer had relations, we could expand further
            nested.select("name"),
          ),
        )
        .getQueryString();

      expect(queryString).toContain("$expand=user_customer($select=name)");
    });
  });

  describe("Complex combinations", () => {
    it("should support select + filter + orderBy + nested expand", () => {
      const queryString = db
        .from("contacts")
        .list()
        .expand("users", (b) =>
          b
            .select("username", "email")
            .filter({ active: true })
            .orderBy("username")
            .top(10)
            .expand("user_customer", (nested) => nested.select("name")),
        )
        .getQueryString();

      // Should contain all query options
      expect(queryString).toContain("$select=username,email");
      expect(queryString).toContain("$filter=active");
      expect(queryString).toContain("$orderby=username");
      expect(queryString).toContain("$top=10");
      expect(queryString).toContain("$expand=user_customer($select=name)");
    });

    it("should support multiple expands with different options", () => {
      const queryString = db
        .from("contacts")
        .list()
        .expand("users", (b) => b.select("username").filter({ active: true }))
        .expand("other_users", (b) => b.select("email").top(5))
        .getQueryString();

      expect(queryString).toBe(
        "/contacts?$top=1000&$expand=users($select=username;$filter=active eq true),other_users($select=email;$top=5)",
      );
    });
  });

  describe("Arbitrary relations (string escape hatch)", () => {
    it("should allow expanding arbitrary relations not in schema", () => {
      const queryString = db
        .from("contacts")
        .list()
        .expand("unknown_relation", (b) => b.select("arbitrary_field"))
        .getQueryString();

      expect(queryString).toBe(
        "/contacts?$top=1000&$expand=unknown_relation($select=arbitrary_field)",
      );
    });

    it("should type arbitrary relation callback generically", () => {
      db.from("contacts")
        .list()
        .expand("unknown", (builder) => {
          // Should allow arbitrary field names
          return builder.select("any_field" as any);
        });
    });
  });

  describe("Integration with existing query methods", () => {
    it("should work with select on parent query", () => {
      const queryString = db
        .from("contacts")
        .list()
        .select("name", "hobby")
        .expand("users", (b) => b.select("username"))
        .getQueryString();

      expect(queryString).toContain("$select=name,hobby");
      expect(queryString).toContain("$expand=users($select=username)");
    });

    it("should work with filter on parent query", () => {
      const queryString = db
        .from("contacts")
        .list()
        .filter({ name: { eq: "Eric" } })
        .expand("users")
        .getQueryString();

      expect(queryString).toContain("$filter=name eq");
      expect(queryString).toContain("$expand=users");
    });

    it("should work with orderBy, top, skip on parent query", () => {
      const queryString = db
        .from("contacts")
        .list()
        .orderBy("name")
        .top(20)
        .skip(10)
        .expand("users", (b) => b.select("username"))
        .getQueryString();

      expect(queryString).toContain("$orderby=name");
      expect(queryString).toContain("$top=20");
      expect(queryString).toContain("$skip=10");
      expect(queryString).toContain("$expand=users($select=username)");
    });
  });
});
