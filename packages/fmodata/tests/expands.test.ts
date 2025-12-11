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
import {
  fmTableOccurrence,
  textField,
  numberField,
  eq,
} from "@proofkit/fmodata";
import { createMockClient, users, contacts } from "./utils/test-setup";
import { first } from "es-toolkit/compat";

describe("Expand API Specification", () => {
  const userCustomer = fmTableOccurrence(
    "user_customer",
    {
      id: textField().primaryKey(),
      name: textField().notNull(),
      address: textField(),
      tier: textField().notNull(),
    },
    {
      defaultSelect: "all",
    },
  );

  const contacts = fmTableOccurrence(
    "contacts",
    {
      id: textField().primaryKey(),
      name: textField().notNull(),
      hobby: textField(),
      id_user: textField().notNull(),
    },
    {
      defaultSelect: "all",
      navigationPaths: ["users", "other_users"],
    },
  );

  const users = fmTableOccurrence(
    "users",
    {
      id: textField().primaryKey(),
      username: textField().notNull(),
      email: textField().notNull(),
      active: numberField().readValidator(z.coerce.boolean()).notNull(),
      id_customer: textField().notNull(),
    },
    {
      defaultSelect: "all",
      navigationPaths: ["user_customer", "contacts"],
    },
  );

  const otherUsers = fmTableOccurrence(
    "other_users",
    {
      id: textField().primaryKey(),
      username: textField().notNull(),
      email: textField().notNull(),
      active: numberField().readValidator(z.coerce.boolean()).notNull(),
      id_customer: textField().notNull(),
    },
    {
      defaultSelect: "all",
    },
  );

  const client = createMockClient();

  // type UserFieldNames = keyof InferTableSchema<typeof usersTO>;
  // type CustomerFieldNames = keyof InferTableSchema<typeof customerTO>;

  const db = client.database("test_db");

  describe("Simple expand (no callback)", () => {
    it("should generate query string for simple expand", () => {
      const queryString = db
        .from(contacts)
        .list()
        .expand(users)
        .getQueryString();
      expect(queryString).toBe("/contacts?$top=1000&$expand=users");
    });

    it("should not allow arbitrary string relations", () => {
      db.from(contacts)
        .list()
        // @ts-expect-error - arbitrary string relation
        .expand("arbitrary_relation")
        .getQueryString();
    });
  });

  describe("Expand with callback - select", () => {
    it("should type callback builder to target table schema", () => {
      db.from(contacts)
        .list()
        .expand(users, (builder: any) => {
          // builder.select should only accept fields from users table
          expectTypeOf(builder.select).parameter(0).not.toEqualTypeOf<string>();

          return builder.select({
            username: users.username,
            email: users.email,
          });
        });
    });

    it("should have a properly typed response", async () => {
      async () => {
        // checking types only, don't actually make a request
        const result = await db
          .from(contacts)
          .list()
          .expand(users, (b: any) =>
            b.select({ username: users.username, email: users.email }),
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
        .from(contacts)
        .list()
        .expand(users, (b: any) =>
          b.select({ username: users.username, email: users.email }),
        )
        .getQueryString();

      expect(queryString).toBe(
        "/contacts?$top=1000&$expand=users($select=username,email)",
      );
    });

    it("should enforce callback returns builder", () => {
      db.from(contacts)
        .list()
        .expand(users, (b: any) => {
          // Must return the builder
          return b.select({ username: users.username });
        });
    });
  });

  describe("Expand with callback - filter", () => {
    it("should generate query string with $filter", () => {
      const queryString = db
        .from(contacts)
        .list()
        .expand(users, (b: any) => b.where(eq(users.active, 1)))
        .getQueryString();

      expect(queryString).toContain("$expand=users($filter=active");
    });
  });

  describe("Expand with callback - orderBy", () => {
    it("should generate query string with $orderby", () => {
      const queryString = db
        .from(contacts)
        .list()
        .expand(users, (b: any) => b.orderBy("username"))
        .getQueryString();

      expect(queryString).toContain("$expand=users($orderby=username");
    });
  });

  describe("Expand with callback - top and skip", () => {
    it("should generate query string with $top", () => {
      const queryString = db
        .from(contacts)
        .list()
        .expand(users, (b: any) => b.top(5))
        .getQueryString();

      expect(queryString).toContain("$expand=users($top=5");
    });

    it("should generate query string with $skip", () => {
      const queryString = db
        .from(contacts)
        .list()
        .expand(users, (b: any) => b.skip(10))
        .getQueryString();

      expect(queryString).toContain("$expand=users($skip=10");
    });
  });

  describe("Multiple expands (chaining)", () => {
    it("should allow chaining multiple expand calls", () => {
      const queryString = db
        .from(contacts)
        .list()
        .expand(users, (b: any) => b.select({ username: users.username }))
        .expand(otherUsers)
        .getQueryString();

      expect(queryString).toBe(
        "/contacts?$top=1000&$expand=users($select=username),other_users",
      );
    });

    it("should type each expand callback independently", () => {
      db.from(contacts)
        .list()
        .expand(users, (builder: any) => {
          // First callback typed to users
          expectTypeOf(builder.select).parameter(0).not.toEqualTypeOf<string>();

          return builder.select({ username: users.username });
        })
        .expand(otherUsers, (builder: any) => {
          // Second callback - arbitrary relation so accepts any
          return builder.select({ email: otherUsers.email });
        });
    });
  });

  describe("Nested expands", () => {
    it("should type nested expand callback to nested target schema", () => {
      const query = db
        .from(contacts)
        .list()
        .expand(users, (usersBuilder) => {
          return usersBuilder
            .select({ username: users.username, email: users.email })
            .expand(userCustomer, (customerBuilder) => {
              // customerBuilder should be typed to customer schema
              // Verify it accepts valid fields
              return customerBuilder.select({
                name: userCustomer.name,
                tier: userCustomer.tier,
              });
            });
        });

      // type tests, don't run this code
      async () => {
        const result = await query.execute();

        const firstRecord = result.data![0]!;

        const firstUser = firstRecord.users[0]!;

        // @ts-expect-error - this field was not selected, so it shouldn't be in the type
        firstUser.id_customer;
        expectTypeOf(firstUser).not.toHaveProperty("id_customer");
        expectTypeOf(firstUser).toHaveProperty("username");
      };
    });

    it("should generate query string with nested $expand", () => {
      const queryString = db
        .from(contacts)
        .list()
        .expand(users, (b: any) =>
          b
            .select({ username: users.username })
            .expand(userCustomer, (nested: any) =>
              nested.select({ name: userCustomer.name }),
            ),
        )
        .getQueryString();

      expect(queryString).toBe(
        "/contacts?$top=1000&$expand=users($select=username;$expand=user_customer($select=name))",
      );
    });

    it("should support deeply nested expands (3 levels)", () => {
      const queryString = db
        .from(contacts)
        .list()
        .expand(users, (b: any) =>
          b.expand(userCustomer, (nested: any) =>
            // If customer had relations, we could expand further
            nested.select({ name: userCustomer.name }),
          ),
        )
        .getQueryString();

      expect(queryString).toContain("$expand=user_customer($select=name)");
    });
  });

  describe("Complex combinations", () => {
    it("should support select + filter + orderBy + nested expand", () => {
      const queryString = db
        .from(contacts)
        .list()
        .expand(users, (b: any) =>
          b
            .select({ username: users.username, email: users.email })
            .where(eq(users.active, 1))
            .orderBy("username")
            .top(10)
            .expand(userCustomer, (nested: any) =>
              nested.select({ name: userCustomer.name }),
            ),
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
        .from(contacts)
        .list()
        .expand(users, (b: any) =>
          b.select({ username: users.username }).where(eq(users.active, 1)),
        )
        .expand(otherUsers, (b: any) =>
          b.select({ email: otherUsers.email }).top(5),
        )
        .getQueryString();

      expect(queryString).toBe(
        "/contacts?$top=1000&$expand=users($select=username;$filter=active eq 1),other_users($select=email;$top=5)",
      );
    });
  });

  describe("Integration with existing query methods", () => {
    it("should work with select on parent query", () => {
      const queryString = db
        .from(contacts)
        .list()
        .select({ name: contacts.name, hobby: contacts.hobby })
        .expand(users, (b: any) => b.select({ username: users.username }))
        .getQueryString();

      expect(queryString).toContain("$select=name,hobby");
      expect(queryString).toContain("$expand=users($select=username)");
    });

    it("should work with filter on parent query", () => {
      const queryString = db
        .from(contacts)
        .list()
        .where(eq(contacts.name, "Eric"))
        .expand(users)
        .getQueryString();

      expect(queryString).toContain("$filter=name eq");
      expect(queryString).toContain("$expand=users");
    });

    it("should work with orderBy, top, skip on parent query", () => {
      const queryString = db
        .from(contacts)
        .list()
        .orderBy("name")
        .top(20)
        .skip(10)
        .expand(users, (b: any) => b.select({ username: users.username }))
        .getQueryString();

      expect(queryString).toContain("$orderby=name");
      expect(queryString).toContain("$top=20");
      expect(queryString).toContain("$skip=10");
      expect(queryString).toContain("$expand=users($select=username)");
    });
  });
});
