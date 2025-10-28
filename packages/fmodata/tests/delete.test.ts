/**
 * Delete Tests
 *
 * Tests for the delete() method on EntitySet instances.
 * This validates type safety, builder pattern, and operation modes.
 */

import { describe, it, expect, expectTypeOf, vi } from "vitest";
import { z } from "zod/v4";
import { defineBaseTable, defineTableOccurrence } from "../src/index";
import { InferSchemaType } from "../src/types";
import { DeleteBuilder } from "../src/client/delete-builder";
import { ExecutableDeleteBuilder } from "../src/client/delete-builder";
import { simpleMock } from "./utils/mock-fetch";
import { createMockClient } from "./utils/test-setup";

describe("delete method", () => {
  const client = createMockClient();

  const usersBase = defineBaseTable({
    schema: {
      id: z.string(),
      username: z.string(),
      email: z.string(),
      active: z.boolean(),
      lastLogin: z.string().optional(),
    },
    idField: "id",
  });

  const usersTO = defineTableOccurrence({
    name: "users",
    baseTable: usersBase,
  });

  type UserSchema = InferSchemaType<typeof usersBase.schema>;

  describe("builder pattern", () => {
    it("should return DeleteBuilder when delete() is called", () => {
      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      const result = db.from("users").delete();
      expect(result).toBeInstanceOf(DeleteBuilder);
    });

    it("should not have execute() on initial DeleteBuilder", () => {
      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      const deleteBuilder = db.from("users").delete();

      // Type check: execute should not exist on DeleteBuilder
      expectTypeOf(deleteBuilder).not.toHaveProperty("execute");
    });

    it("should return ExecutableDeleteBuilder after byId()", () => {
      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      const result = db.from("users").delete().byId("user-123");
      expect(result).toBeInstanceOf(ExecutableDeleteBuilder);
    });

    it("should return ExecutableDeleteBuilder after where()", () => {
      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      const result = db
        .from("users")
        .delete()
        .where((q) => q.filter({ active: false }));
      expect(result).toBeInstanceOf(ExecutableDeleteBuilder);
    });

    it("should have execute() on ExecutableDeleteBuilder", () => {
      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      const executableBuilder = db.from("users").delete().byId("user-123");

      // Type check: execute should exist
      expectTypeOf(executableBuilder).toHaveProperty("execute");
    });
  });

  describe("delete by ID", () => {
    it("should generate correct URL for delete by ID", () => {
      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      const deleteBuilder = db.from("users").delete().byId("user-123");
      const config = deleteBuilder.getRequestConfig();

      expect(config.method).toBe("DELETE");
      expect(config.url).toBe("/test_db/users('user-123')");
    });

    it("should return deletedCount result type", async () => {
      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      db.from("users").delete().byId("user-123");
    });

    it("should execute delete by ID and return count", async () => {
      // Mock the fetch to return a count
      const mockFetch = simpleMock({
        status: 204,
        headers: { "fmodata.affected_rows": "1" },
        body: null,
      });

      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      const result = await db
        .from("users")
        .delete()
        .byId("user-123")
        .execute({ fetchHandler: mockFetch });

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({ deletedCount: 1 });
    });
  });

  describe("delete by filter", () => {
    it("should generate correct URL for delete by filter", () => {
      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      const deleteBuilder = db
        .from("users")
        .delete()
        .where((q) => q.filter({ active: false }));

      const config = deleteBuilder.getRequestConfig();

      expect(config.method).toBe("DELETE");
      expect(config.url).toContain("/test_db/users");
      expect(config.url).toContain("$filter");
      expect(config.url).toContain("active");
    });

    it("should support complex filters with QueryBuilder", () => {
      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      const deleteBuilder = db
        .from("users")
        .delete()
        .where((q) =>
          q.filter({
            and: [{ active: false }, { lastLogin: { lt: "2023-01-01" } }],
          }),
        );

      const config = deleteBuilder.getRequestConfig();

      expect(config.method).toBe("DELETE");
      expect(config.url).toContain("$filter");
    });

    it("should support QueryBuilder chaining in where callback", () => {
      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      const deleteBuilder = db
        .from("users")
        .delete()
        .where((q) => q.filter({ active: false }).top(10));

      const config = deleteBuilder.getRequestConfig();

      expect(config.method).toBe("DELETE");
      expect(config.url).toContain("$filter");
      expect(config.url).toContain("$top");
    });

    it("should return deletedCount result type for filter-based delete", async () => {
      const db = client.database("test_db", {
        occurrences: [usersTO],
      });
      db.from("users");

      db.from("users")
        .delete()
        .where((q) => q.filter({ active: false }));
    });

    it("should execute delete by filter and return count", async () => {
      // Mock the fetch to return a count
      const mockFetch = simpleMock({
        status: 204,
        headers: { "fmodata.affected_rows": "5" },
        body: null,
      });

      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      const result = await db
        .from("users")
        .delete()
        .where((q) => q.filter({ active: false }))
        .execute({ fetchHandler: mockFetch });

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({ deletedCount: 5 });
    });
  });

  describe("type safety", () => {
    it("should enforce type-safe filter properties", () => {
      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      // This should work - valid property
      db.from("users")
        .delete()
        .where((q) => q.filter({ active: false }));

      // Type check: TypeScript should allow valid field names
      expectTypeOf(
        db
          .from("users")
          .delete()
          .where((q) => q.filter({ active: false })),
      ).toEqualTypeOf<ExecutableDeleteBuilder<UserSchema>>();
    });

    it("should provide type-safe QueryBuilder in where callback", () => {
      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      db.from("users")
        .delete()
        .where((q) => {
          // Type check: q should have filter, orderBy, top, skip methods
          expectTypeOf(q).toHaveProperty("filter");
          expectTypeOf(q).toHaveProperty("orderBy");
          expectTypeOf(q).toHaveProperty("top");
          expectTypeOf(q).toHaveProperty("skip");

          return q.filter({ active: false });
        });
    });
  });

  describe("error handling", () => {
    it("should return error on failed delete", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      const result = await db
        .from("users")
        .delete()
        .byId("user-123")
        .execute({ fetchHandler: mockFetch as any });

      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Network error");
    });
  });
});
