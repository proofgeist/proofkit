/**
 * TypeScript-only API ergonomics tests
 *
 * This test file focuses on exploring and validating the end-user API without
 * executing actual queries. These tests are designed to:
 *
 * - Verify TypeScript type correctness and API structure
 * - Explore API ergonomics and ensure methods can be chained correctly
 * - Test query builder creation without making network requests
 * - Catch breaking changes in the public API during refactoring
 *
 * These tests do NOT:
 * - Execute actual HTTP requests (.execute() is never called)
 * - Require a mock fetch implementation
 * - Test runtime behavior or network responses
 *
 * They serve as compile-time verification and API documentation examples,
 * helping ensure the API remains ergonomic and type-safe as the library evolves.
 */

import { describe, expect, it, expectTypeOf, beforeEach } from "vitest";
import { z } from "zod/v4";
import {
  defineBaseTable,
  defineTableOccurrence,
  buildOccurrences,
  FMServerConnection,
} from "../src/index";
import { createMockFetch } from "./utils/mock-fetch";
import { createMockClient } from "./utils/test-setup";

describe("fmodata", () => {
  it("should be defined", () => {
    expect(true).toBe(true);
  });

  describe("API ergonomics", () => {
    let client: FMServerConnection;
    let db: ReturnType<typeof client.database>;

    beforeEach(() => {
      client = createMockClient();
      db = client.database("Contacts");
    });

    it("should support list() with query chaining", () => {
      const table = db.from("Contacts");
      const listBuilder = table.list();

      expect(listBuilder).toBeDefined();
      expect(listBuilder.getQueryString).toBeDefined();
    });

    it("should support get() for single record retrieval", () => {
      const table = db.from("Contacts");
      const getBuilder = table.get("my-uuid");

      expect(getBuilder).toBeDefined();
      expect(getBuilder.getRequestConfig).toBeDefined();
    });

    it("should support getSingleField() API", () => {
      const table = db.from("Contacts");
      const singleFieldBuilder = table.get("my-uuid").getSingleField("address");

      expect(singleFieldBuilder).toBeDefined();
      expect(singleFieldBuilder.getRequestConfig).toBeDefined();
    });

    it("should support select() for returning arrays of records", () => {
      const table = db.from("Contacts");
      const selectBuilder = table.list().select("email", "city");

      expect(selectBuilder).toBeDefined();
      expect(selectBuilder.getQueryString).toBeDefined();
    });

    it("should support single() modifier on select()", () => {
      const table = db.from("Contacts");
      const singleSelectBuilder = table.list().select("email", "city").single();

      expect(singleSelectBuilder).toBeDefined();
      expect(singleSelectBuilder.getQueryString).toBeDefined();
    });

    it("should generate query strings correctly", () => {
      const table = db.from("Contacts");
      const queryString = table.list().select("email", "city").getQueryString();

      expect(queryString).toBeDefined();
      expect(typeof queryString).toBe("string");
    });

    it("should infer field names for select() based on schema", () => {
      const usersBase = defineBaseTable({
        schema: {
          id: z.string(),
          name: z.string(),
          email: z.string(),
          age: z.number(),
        },
        idField: "id",
      });

      const users = defineTableOccurrence({
        name: "Users",
        baseTable: usersBase,
      });

      const dbTyped = client.database("TestDB", { occurrences: [users] });
      const entitySet = dbTyped.from("Users");

      // These should have autocomplete for "id", "name", "email", "age"
      const query1 = entitySet.list().select("id", "name");
      const query2 = entitySet.list().select("email", "age");
      const query3 = entitySet.list().select("id", "name", "email", "age");

      expect(query1).toBeDefined();
      expect(query2).toBeDefined();
      expect(query3).toBeDefined();

      // These should be TypeScript errors - fields not in schema
      const _typeChecks = () => {
        // @ts-expect-error - field not in schema
        entitySet.list().select("invalidField");

        entitySet.list().select(
          "name",
          // @ts-expect-error - field not in schema
          "nonexistentField",
        );

        entitySet.list().select(
          // @ts-expect-error - field not in schema
          "foo",
          // even though these are also invalid, it's OK that they don't error because the first field is already showing the problem
          "bar",
          "baz",
        );
      };
      void _typeChecks;
    });

    it("should infer field names for select() with entity IDs", () => {
      const productsBase = defineBaseTable({
        schema: {
          productId: z.string(),
          productName: z.string(),
          price: z.number(),
          category: z.string(),
          inStock: z.boolean(),
        },
        idField: "productId",
        readOnly: ["productId"],
        fmfIds: {
          productId: "FMFID:1000001",
          productName: "FMFID:1000002",
          price: "FMFID:1000003",
          category: "FMFID:1000004",
          inStock: "FMFID:1000005",
        },
      });

      const products = defineTableOccurrence({
        name: "Products",
        baseTable: productsBase,
        fmtId: "FMTID:2000001",
      });

      const dbTyped = client.database("TestDB", {
        occurrences: [products] as const,
      });
      const entitySet = dbTyped.from("Products");

      // Type inspection to debug the issue
      type BaseTableType = typeof productsBase;
      //   ^? Should show BaseTable with schema
      type OccurrenceType = typeof products;
      //   ^? Should show TableOccurrence with BaseTable
      type EntitySetType = typeof entitySet;
      //   ^? Should show EntitySet with schema

      // These should have autocomplete for "productId", "productName", "price", "category", "inStock"
      const query1 = entitySet.list().select("productId", "productName");
      const listQuery = entitySet.list();
      type ListQueryType = typeof listQuery;
      //   ^? First param should be schema type, not never
      type Autocomplete1 = Parameters<typeof listQuery.select>[0];
      //        ^?
      const query2 = entitySet.list().select("price", "category", "inStock");
      const query3 = entitySet
        .list()
        .select("productId", "productName", "price", "category", "inStock");

      expect(query1).toBeDefined();
      expect(query2).toBeDefined();
      expect(query3).toBeDefined();

      // These should be TypeScript errors - fields not in schema (same as regular BaseTable)
      const _typeChecks = () => {
        // @ts-expect-error - field not in schema
        entitySet.list().select("invalidField");

        entitySet.list().select(
          "productName",
          // @ts-expect-error - field not in schema
          "nonexistentField",
        );

        entitySet.list().select(
          // @ts-expect-error - field not in schema
          "foo",
          // even though these are also invalid, it's OK that they don't error because the first field is already showing the problem
          "bar",
          "baz",
        );
      };
      void _typeChecks;
    });

    it("should not allow getQueryString() on EntitySet directly", () => {
      const entitySet = db.from("Users");

      // TypeScript should error if trying to call getQueryString() directly on EntitySet
      // You must first call a method like list(), select(), filter(), etc. to get a QueryBuilder
      const _typeCheck = () => {
        // @ts-expect-error - EntitySet does not have getQueryString method
        entitySet.getQueryString();
      };
      void _typeCheck;

      // Correct usage: call list() first to get a QueryBuilder
      const queryBuilder = entitySet.list();
      expect(queryBuilder.getQueryString).toBeDefined();
      expect(typeof queryBuilder.getQueryString()).toBe("string");
    });
  });

  describe("BaseTable and TableOccurrence", () => {
    const client = createMockClient();

    it("should create BaseTable and TableOccurrence", () => {
      const baseTable = defineBaseTable({
        schema: {
          id: z.number(),
          name: z.string(),
          email: z.string(),
        },
        idField: "id",
      });

      const tableOcc = defineTableOccurrence({
        name: "Users",
        baseTable,
      });

      expect(tableOcc.name).toBe("Users");
      expect(tableOcc.baseTable).toBe(baseTable);
      expect(tableOcc.baseTable.schema).toBeDefined();
      expect(tableOcc.baseTable.idField).toBe("id");
    });

    it("should use TableOccurrence with database.from()", () => {
      const baseTable = defineBaseTable({
        schema: {
          id: z.number(),
          name: z.string(),
          email: z.string(),
        },
        idField: "id",
      });

      const users = defineTableOccurrence({
        name: "Users",
        baseTable,
      });

      const db = client.database("TestDB", { occurrences: [users] });
      const entitySet = db.from("Users");

      const queryBuilder = entitySet.list().select("id", "name");
      expect(queryBuilder).toBeDefined();
      expect(queryBuilder.getQueryString()).toContain("$select");

      const recordBuilder = entitySet.get("123");
      expect(recordBuilder).toBeDefined();
      expect(recordBuilder.getRequestConfig().url).toContain("Users");
    });

    it("should allow table occurrences to be reused across different contexts", () => {
      const baseTable = defineBaseTable({
        schema: {
          id: z.number(),
          name: z.string(),
        },
        idField: "id",
      });

      const products = defineTableOccurrence({
        name: "Products",
        baseTable,
      });

      const client1 = createMockClient();
      const client2 = createMockClient();

      const db1 = client1.database("DB1", { occurrences: [products] });
      const db2 = client2.database("DB2", { occurrences: [products] });

      const entitySet1 = db1.from("Products");
      const entitySet2 = db2.from("Products");

      expect(entitySet1.get("1").getRequestConfig().url).toContain("Products");
      expect(entitySet2.get("1").getRequestConfig().url).toContain("Products");
    });

    it("should support navigation properties with buildOccurrences", () => {
      const usersBase = defineBaseTable({
        schema: {
          id: z.string(),
          name: z.string(),
          email: z.string(),
        },
        idField: "id",
      });

      const ordersBase = defineBaseTable({
        schema: {
          orderId: z.string(),
          userId: z.string(),
          total: z.number(),
        },
        idField: "orderId",
      });

      const _users = defineTableOccurrence({
        name: "Users" as const,
        baseTable: usersBase,
      });

      const _orders = defineTableOccurrence({
        name: "Orders" as const,
        baseTable: ordersBase,
      });

      const [users, orders] = buildOccurrences({
        occurrences: [_users, _orders],
        navigation: {
          Users: ["Orders"],
          Orders: ["Users"],
        },
      });

      expect(users.navigation.Orders).toBeDefined();
      expect(orders.navigation.Users).toBeDefined();
    });

    it("should support base table without idField", () => {
      const categoriesBase = defineBaseTable({
        schema: {
          categoryId: z.string(),
          name: z.string(),
          description: z.string(),
        },
        // idField is undefined - should be valid
      });

      const categories = defineTableOccurrence({
        name: "Categories",
        baseTable: categoriesBase,
      });

      expect(categories.name).toBe("Categories");
      expect(categories.baseTable.idField).toBeUndefined();
      expect(categories.baseTable.schema).toBeDefined();
    });
  });

  describe("Untyped queries", () => {
    const client = createMockClient();
    const db = client.database("TestDB");

    it("should support untyped queries without occurrences", () => {
      const entitySet = db.from("AnyTable");
      expect(entitySet).toBeDefined();

      const queryBuilder = entitySet.list().select("field1", "field2");
      expect(queryBuilder).toBeDefined();
      expect(queryBuilder.getQueryString()).toContain("$select");

      const recordBuilder = entitySet.get("123");
      expect(recordBuilder).toBeDefined();
      expect(recordBuilder.getRequestConfig().url).toContain("AnyTable");

      async () => {
        // just checking types, don't execute
        const result = await queryBuilder.execute();

        const singleResult = result.data![0]!;
        // @ts-expect-error - should not be on the object
        singleResult["@id"];
        // @ts-expect-error - should not be on the object
        singleResult["@editLink"];

        expectTypeOf(singleResult).not.toExtend<{
          "@id": string;
          "@editLink": string;
        }>();
      };

      async () => {
        // just checking types, don't execute
        const result = await queryBuilder.execute({
          includeODataAnnotations: true,
        });

        const singleResult = result.data![0]!;
        singleResult["@id"]; // @ts should not error this time
        singleResult["@editLink"]; // @ts should not error this time

        expectTypeOf(singleResult).toExtend<{
          "@id": string;
          "@editLink": string;
        }>();
      };
    });
  });

  describe("Type safety and result parsing", () => {
    it("should properly type the result of a query", async () => {
      const client = new FMServerConnection({
        serverUrl: "https://api.example.com",
        auth: { apiKey: "test-api-key" },
        fetchClientOptions: {
          fetchHandler: createMockFetch([
            {
              "@id": "1",
              "@editLink": "https://api.example.com/Users/1",
              id: 1,
              name: "John Doe",
              active: 0, // should coerce to boolean false
              activeHuman: "active",
            },
          ]),
        },
      });

      const usersTO = defineTableOccurrence({
        name: "Users",
        baseTable: defineBaseTable({
          schema: {
            id: z.number(),
            name: z.string(),
            active: z.coerce.boolean(),
            activeHuman: z.enum(["active", "inactive"]),
          },
          idField: "id",
        }),
      });

      const db = client.database("TestDB", { occurrences: [usersTO] });
      const users = db.from("Users");
      const result = await users.list().execute();

      if (!result.data || !result.data[0]) {
        console.error(result);
        throw new Error("Expected at least one result");
      }

      const firstResult = result.data[0];

      expectTypeOf(firstResult.name).toEqualTypeOf<string>();
      expectTypeOf(firstResult.active).toEqualTypeOf<boolean>();
      expect(firstResult.active).toBe(false);
      expectTypeOf(firstResult.activeHuman).toEqualTypeOf<
        "active" | "inactive"
      >();

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data?.length).toBe(1);
    });
  });
});
