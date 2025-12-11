/**
 * Delete Tests
 *
 * Tests for the delete() method on EntitySet instances.
 * This validates type safety, builder pattern, and operation modes.
 */

import { describe, it, expect, expectTypeOf, vi } from "vitest";
import { z } from "zod/v4";
import {
  fmTableOccurrence,
  textField,
  numberField,
  type InferTableSchema,
  eq,
  and,
  lt,
} from "@proofkit/fmodata";
import { DeleteBuilder } from "@proofkit/fmodata/client/delete-builder";
import { ExecutableDeleteBuilder } from "@proofkit/fmodata/client/delete-builder";
import { simpleMock } from "./utils/mock-fetch";
import { createMockClient } from "./utils/test-setup";

describe("delete method", () => {
  const client = createMockClient();

  const usersTO = fmTableOccurrence("users", {
    id: textField().primaryKey(),
    username: textField().notNull(),
    email: textField().notNull(),
    active: numberField().readValidator(z.coerce.boolean()).notNull(),
    lastLogin: textField(),
  });

  type UserSchema = InferTableSchema<typeof usersTO>;

  describe("builder pattern", () => {
    it("should return DeleteBuilder when delete() is called", () => {
      const db = client.database("test_db");

      const result = db.from(usersTO).delete();
      expect(result).toBeInstanceOf(DeleteBuilder);
    });

    it("should not have execute() on initial DeleteBuilder", () => {
      const db = client.database("test_db");

      const deleteBuilder = db.from(usersTO).delete();

      // Type check: execute should not exist on DeleteBuilder
      expectTypeOf(deleteBuilder).not.toHaveProperty("execute");
    });

    it("should return ExecutableDeleteBuilder after byId()", () => {
      const db = client.database("test_db");

      const result = db.from(usersTO).delete().byId("user-123");
      expect(result).toBeInstanceOf(ExecutableDeleteBuilder);
    });

    it("should return ExecutableDeleteBuilder after where()", () => {
      const db = client.database("test_db");

      const result = db
        .from(usersTO)
        .delete()
        .where((q) => q.where(eq(usersTO.active, 0)));
      expect(result).toBeInstanceOf(ExecutableDeleteBuilder);
    });

    it("should have execute() on ExecutableDeleteBuilder", () => {
      const db = client.database("test_db");

      const executableBuilder = db.from(usersTO).delete().byId("user-123");

      // Type check: execute should exist
      expectTypeOf(executableBuilder).toHaveProperty("execute");
    });
  });

  describe("delete by ID", () => {
    it("should generate correct URL for delete by ID", () => {
      const db = client.database("test_db");

      const deleteBuilder = db.from(usersTO).delete().byId("user-123");
      const config = deleteBuilder.getRequestConfig();

      expect(config.method).toBe("DELETE");
      expect(config.url).toBe("/test_db/users('user-123')");
    });

    it("should return deletedCount result type", async () => {
      const db = client.database("test_db");

      db.from(usersTO).delete().byId("user-123");
    });

    it("should execute delete by ID and return count", async () => {
      // Mock the fetch to return a count
      const mockFetch = simpleMock({
        status: 204,
        headers: { "fmodata.affected_rows": "1" },
        body: null,
      });

      const db = client.database("test_db");

      const result = await db
        .from(usersTO)
        .delete()
        .byId("user-123")
        .execute({ fetchHandler: mockFetch });

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({ deletedCount: 1 });
    });
  });

  describe("delete by filter", () => {
    it("should generate correct URL for delete by filter", () => {
      const db = client.database("test_db");

      const deleteBuilder = db
        .from(usersTO)
        .delete()
        .where((q) => q.where(eq(usersTO.active, 0)));

      const config = deleteBuilder.getRequestConfig();

      expect(config.method).toBe("DELETE");
      expect(config.url).toContain("/test_db/users");
      expect(config.url).toContain("$filter");
      expect(config.url).toContain("active");
    });

    it("should support complex filters with QueryBuilder", () => {
      const db = client.database("test_db");

      const deleteBuilder = db
        .from(usersTO)
        .delete()
        .where((q) =>
          q.where(
            and(eq(usersTO.active, 0), lt(usersTO.lastLogin, "2023-01-01")),
          ),
        );

      const config = deleteBuilder.getRequestConfig();

      expect(config.method).toBe("DELETE");
      expect(config.url).toContain("$filter");
    });

    it("should support QueryBuilder chaining in where callback", () => {
      const db = client.database("test_db");

      const deleteBuilder = db
        .from(usersTO)
        .delete()
        .where((q) => q.where(eq(usersTO.active, 0)).top(10));

      const config = deleteBuilder.getRequestConfig();

      expect(config.method).toBe("DELETE");
      expect(config.url).toContain("$filter");
      expect(config.url).toContain("$top");
    });

    it("should return deletedCount result type for filter-based delete", async () => {
      const db = client.database("test_db");
      db.from(usersTO);

      db.from(usersTO)
        .delete()
        .where((q) => q.where(eq(usersTO.active, 0)));
    });

    it("should execute delete by filter and return count", async () => {
      // Mock the fetch to return a count
      const mockFetch = simpleMock({
        status: 204,
        headers: { "fmodata.affected_rows": "5" },
        body: null,
      });

      const db = client.database("test_db");

      const result = await db
        .from(usersTO)
        .delete()
        .where((q) => q.where(eq(usersTO.active, 0)))
        .execute({ fetchHandler: mockFetch });

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({ deletedCount: 5 });
    });
  });

  describe("type safety", () => {
    it("should enforce type-safe filter properties", () => {
      const db = client.database("test_db");

      // This should work - valid property
      db.from(usersTO)
        .delete()
        .where((q) => q.where(eq(usersTO.active, 0)));
    });

    it("should provide type-safe QueryBuilder in where callback", () => {
      const db = client.database("test_db");

      db.from(usersTO)
        .delete()
        .where((q) => {
          // Type check: q should have where, orderBy, top, skip methods
          expectTypeOf(q).toHaveProperty("where");
          expectTypeOf(q).toHaveProperty("orderBy");
          expectTypeOf(q).toHaveProperty("top");
          expectTypeOf(q).toHaveProperty("skip");

          return q.where(eq(usersTO.active, 0));
        });
    });
  });

  describe("error handling", () => {
    it("should return error on failed delete", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const db = client.database("test_db");

      const result = await db
        .from(usersTO)
        .delete()
        .byId("user-123")
        .execute({ fetchHandler: mockFetch as any });

      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Network error");
    });
  });
});
