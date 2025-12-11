/**
 * Insert and Update Tests
 *
 * Tests for the insert() and update() methods on EntitySet instances.
 * This validates type safety and required field constraints.
 */

import { describe, it, expect, expectTypeOf, vi } from "vitest";
import { z } from "zod/v4";
import {
  defineBaseTable,
  defineTableOccurrence,
  buildOccurrences,
} from "../src/index";
import { InsertBuilder } from "../src/client/insert-builder";
import { UpdateBuilder } from "../src/client/update-builder";
import { ExecutableUpdateBuilder } from "../src/client/update-builder";
import { InferSchemaType } from "../src/types";
import type { ODataRecordMetadata } from "../src/types";
import { simpleMock } from "./utils/mock-fetch";
import { createMockClient } from "./utils/test-setup";

describe("insert and update methods", () => {
  const client = createMockClient();

  const contactsBase = defineBaseTable({
    schema: {
      id: z.string(),
      name: z.string(),
      hobby: z.string().optional(),
    },
    idField: "id",
  });

  const usersBase = defineBaseTable({
    schema: {
      id: z.string(),
      username: z.string(),
      email: z.string().nullable(),
      count: z.number().nullable(),
      active: z.boolean().default(true),
    },
    idField: "id",
  });

  // Users with required fields for insert
  const usersWithRequiredBase = defineBaseTable({
    schema: {
      id: z.string(),
      username: z.string(),
      email: z.string(),
      createdAt: z.string().optional(),
    },
    idField: "id",
    required: ["username", "email"],
  });

  const _testTO = defineTableOccurrence({
    name: "test",
    baseTable: defineBaseTable({
      schema: {
        id: z.string(),
        name: z.string(),
      },
      idField: "id",
    }),
  });

  // Phase 1: Define base TOs (without navigation)
  const _contactsTO = defineTableOccurrence({
    name: "contacts",
    baseTable: contactsBase,
  });

  const _usersTO = defineTableOccurrence({
    name: "users",
    baseTable: usersBase,
  });

  // Phase 2: Build final TOs with navigation
  const [contactsTO, usersTO, testTO] = buildOccurrences({
    occurrences: [_contactsTO, _usersTO, _testTO],
    navigation: {
      contacts: ["users"],
      users: ["contacts", "test"],
    },
  });

  const usersWithRequiredTO = defineTableOccurrence({
    name: "usersWithRequired",
    baseTable: usersWithRequiredBase,
  });

  type UserFieldNames = keyof InferSchemaType<typeof usersBase.schema>;

  describe("insert method", () => {
    it("should return InsertBuilder when called", () => {
      const db = client.database("test_db", {
        occurrences: [contactsTO, usersTO],
      });

      const result = db
        .from("users")
        .insert({ username: "test", active: true });
      expect(result).toBeInstanceOf(InsertBuilder);
    });

    it("should accept all fields as optional when no required specified", () => {
      const db = client.database("test_db", {
        occurrences: [contactsTO, usersTO],
      });

      // @ts-expect-error - some fields are required, no empty object is allowed
      db.from("users").insert({});

      // @ts-expect-error - a required fields is
      db.from("users").insert({ username: "test" });

      // Should accept all fields
      db.from("users").insert({
        username: "test",
        email: "test@example.com",
        active: true,
      });

      // Type check: all fields should be optional
      expectTypeOf(db.from("users").insert)
        .parameter(0)
        .toMatchObjectType<Partial<z.infer<typeof usersBase.schema>>>();
    });

    it("should require specified fields when required is set", () => {
      const db = client.database("test_db", {
        occurrences: [usersWithRequiredTO],
      });

      // These should work - required fields are username and email
      db.from("usersWithRequired").insert({
        username: "test",
        email: "test@example.com",
      });

      db.from("usersWithRequired").insert({
        username: "test",
        email: "test@example.com",
      });

      // Type check: username and email should be required
      expectTypeOf(db.from("usersWithRequired").insert)
        .parameter(0)
        .toHaveProperty("username");
      expectTypeOf(db.from("usersWithRequired").insert)
        .parameter(0)
        .toHaveProperty("email");
    });

    it("should return InsertBuilder with correct types", () => {
      const db = client.database("test_db", {
        occurrences: [contactsTO, usersTO],
      });

      const builder = db
        .from("users")
        .insert({ username: "test", active: true });

      expectTypeOf(builder).toEqualTypeOf<
        InsertBuilder<InferSchemaType<typeof usersBase.schema>, typeof usersTO>
      >();
    });

    it("should have execute() that returns Result without ODataRecordMetadata by default", () => {
      const db = client.database("test_db", {
        occurrences: [contactsTO, usersTO],
      });

      const builder = db
        .from("users")
        .insert({ username: "test", active: true });

      expectTypeOf(builder.execute).returns.resolves.toMatchTypeOf<{
        data: InferSchemaType<typeof usersBase.schema> | undefined;
        error: Error | undefined;
      }>();
    });
  });

  describe("update method with builder pattern", () => {
    it("should return UpdateBuilder when update() is called", () => {
      const db = client.database("test_db", {
        occurrences: [contactsTO, usersTO],
      });

      const result = db.from("users").update({ username: "newname" });
      expect(result).toBeInstanceOf(UpdateBuilder);
    });

    it("should not have execute() on initial UpdateBuilder", () => {
      const db = client.database("test_db", {
        occurrences: [contactsTO, usersTO],
      });

      const updateBuilder = db.from("users").update({ username: "newname" });

      // Type check: execute should not exist on UpdateBuilder
      expectTypeOf(updateBuilder).not.toHaveProperty("execute");
    });

    it("should return ExecutableUpdateBuilder after byId()", () => {
      const db = client.database("test_db", {
        occurrences: [contactsTO, usersTO],
      });

      const result = db
        .from("users")
        .update({ username: "newname" })
        .byId("user-123");
      expect(result).toBeInstanceOf(ExecutableUpdateBuilder);
    });

    it("should return ExecutableUpdateBuilder after where()", () => {
      const db = client.database("test_db", {
        occurrences: [contactsTO, usersTO],
      });

      const result = db
        .from("users")
        .update({ active: false })
        .where((q) => q.filter({ active: true }));
      expect(result).toBeInstanceOf(ExecutableUpdateBuilder);
    });
  });

  describe("update by ID", () => {
    it("should generate correct URL for update by ID", () => {
      const db = client.database("test_db", {
        occurrences: [contactsTO, usersTO],
      });

      const updateBuilder = db
        .from("users")
        .update({ username: "newname" })
        .byId("user-123");
      const config = updateBuilder.getRequestConfig();

      expect(config.method).toBe("PATCH");
      expect(config.url).toBe("/test_db/users('user-123')");
      expect(config.body).toBe(JSON.stringify({ username: "newname" }));
    });

    it("should return updatedCount type for update by ID", async () => {
      const db = client.database("test_db", {
        occurrences: [contactsTO, usersTO],
      });

      const updateBuilder = db
        .from("users")
        .update({ username: "newname" })
        .byId("user-123");

      // Type check: execute should return Result<{ updatedCount: number }>
      expectTypeOf(updateBuilder.execute).returns.resolves.toMatchTypeOf<{
        data: { updatedCount: number } | undefined;
        error: Error | undefined;
      }>();
    });

    it("should execute update by ID and return count", async () => {
      const mockFetch = simpleMock({
        status: 200,
        headers: { "fmodata.affected_rows": "1" },
        body: null,
      });

      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      const result = await db
        .from("users")
        .update({ username: "newname" })
        .byId("user-123")
        .execute({ fetchHandler: mockFetch });

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.updatedCount).toBe(1);
    });
  });

  describe("update by filter", () => {
    it("should generate correct URL for update by filter", () => {
      const db = client.database("test_db", {
        occurrences: [contactsTO, usersTO],
      });

      const updateBuilder = db
        .from("users")
        .update({ active: false })
        .where((q) => q.filter({ active: true }));

      const config = updateBuilder.getRequestConfig();

      expect(config.method).toBe("PATCH");
      expect(config.url).toContain("/test_db/users");
      expect(config.url).toContain("$filter");
      expect(config.body).toBe(JSON.stringify({ active: false }));
    });

    it("should support complex filters with QueryBuilder", () => {
      const db = client.database("test_db", {
        occurrences: [contactsTO, usersTO],
      });

      const updateBuilder = db
        .from("users")
        .update({ active: false })
        .where((q) =>
          q.filter({
            and: [{ active: true }, { count: { lt: 5 } }],
          }),
        );

      const config = updateBuilder.getRequestConfig();

      expect(config.method).toBe("PATCH");
      expect(config.url).toContain("$filter");
    });

    it("should support QueryBuilder chaining in where callback", () => {
      const db = client.database("test_db", {
        occurrences: [contactsTO, usersTO],
      });

      const updateBuilder = db
        .from("users")
        .update({ active: false })
        .where((q) => q.filter({ active: true }).top(10));

      const config = updateBuilder.getRequestConfig();

      expect(config.method).toBe("PATCH");
      expect(config.url).toContain("$filter");
      expect(config.url).toContain("$top");
    });

    it("should return updatedCount result type for filter-based update", async () => {
      const db = client.database("test_db", {
        occurrences: [contactsTO, usersTO],
      });

      const updateBuilder = db
        .from("users")
        .update({ active: false })
        .where((q) => q.filter({ active: true }));

      // Type check: execute should return Result<{ updatedCount: number }>
      expectTypeOf(updateBuilder.execute).returns.resolves.toMatchTypeOf<{
        data: { updatedCount: number } | undefined;
        error: Error | undefined;
      }>();
    });

    it("should execute update by filter and return count", async () => {
      const mockFetch = simpleMock({
        status: 204,
        headers: { "fmodata.affected_rows": "3" },
        body: null,
      });

      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      const result = await db
        .from("users")
        .update({ active: false })
        .where((q) => q.filter({ active: true }))
        .execute({ fetchHandler: mockFetch });

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({ updatedCount: 3 });
    });
  });

  describe("update with optional fields", () => {
    it("should allow all fields to be optional for updates", () => {
      const db = client.database("test_db", {
        occurrences: [usersWithRequiredTO],
      });

      // All fields should be optional for updates (updateRequired removed)
      db.from("usersWithRequired").update({
        username: "test",
      });

      db.from("usersWithRequired").update({
        email: "test@example.com",
      });

      // Can update with empty object
      db.from("usersWithRequired").update({});
    });

    it("should keep all fields optional regardless of insert requirements", () => {
      const usersForUpdate = defineBaseTable({
        schema: {
          id: z.string(),
          username: z.string(),
          email: z.string(),
          status: z.string(),
        },
        idField: "id",
        required: ["username", "email"] as const, // Required for insert, but not for update
      });

      const usersForUpdateTO = defineTableOccurrence({
        name: "usersForUpdate",
        baseTable: usersForUpdate,
      });

      const db = client.database("test_db", {
        occurrences: [usersForUpdateTO],
      });

      // All fields are optional for update, even those required for insert
      db.from("usersForUpdate").update({
        status: "active",
      });

      db.from("usersForUpdate").update({
        username: "newname",
      });

      db.from("usersForUpdate").update({});
    });
  });

  describe("readOnly fields", () => {
    it("should exclude id field from insert automatically", () => {
      const usersWithReadOnly = defineBaseTable({
        schema: {
          id: z.string(),
          createdAt: z.string(),
          modifiedAt: z.string(),
          username: z.string(),
          email: z.string(),
        },
        idField: "id",
        readOnly: ["createdAt", "modifiedAt"] as const,
      });

      const usersWithReadOnlyTO = defineTableOccurrence({
        name: "usersWithReadOnly",
        baseTable: usersWithReadOnly,
      });

      const db = client.database("test_db", {
        occurrences: [usersWithReadOnlyTO],
      });

      // id, createdAt, and modifiedAt should not be available for insert
      db.from("usersWithReadOnly").insert({
        username: "john",
        email: "john@example.com",
      });

      // Type check: id, createdAt, modifiedAt should not be in insert data type
      expectTypeOf(db.from("usersWithReadOnly").insert)
        .parameter(0)
        .not.toHaveProperty("id");

      expectTypeOf(db.from("usersWithReadOnly").insert)
        .parameter(0)
        .not.toHaveProperty("createdAt");

      expectTypeOf(db.from("usersWithReadOnly").insert)
        .parameter(0)
        .not.toHaveProperty("modifiedAt");
    });

    it("should exclude id field and readOnly fields from update", () => {
      const usersWithReadOnly = defineBaseTable({
        schema: {
          id: z.string(),
          createdAt: z.string(),
          modifiedAt: z.string(),
          username: z.string(),
          email: z.string(),
        },
        idField: "id",
        readOnly: ["createdAt", "modifiedAt"] as const,
      });

      const usersWithReadOnlyTO = defineTableOccurrence({
        name: "usersWithReadOnly",
        baseTable: usersWithReadOnly,
      });

      const db = client.database("test_db", {
        occurrences: [usersWithReadOnlyTO],
      });

      // id, createdAt, and modifiedAt should not be available for update
      db.from("usersWithReadOnly").update({
        username: "newname",
      });

      db.from("usersWithReadOnly").update({
        email: "newemail@example.com",
      });

      // Type check: id, createdAt, modifiedAt should not be in update data type
      expectTypeOf(db.from("usersWithReadOnly").update)
        .parameter(0)
        .not.toHaveProperty("id");

      expectTypeOf(db.from("usersWithReadOnly").update)
        .parameter(0)
        .not.toHaveProperty("createdAt");

      expectTypeOf(db.from("usersWithReadOnly").update)
        .parameter(0)
        .not.toHaveProperty("modifiedAt");
    });

    it("should allow inserts without specifying readOnly fields", () => {
      const usersWithReadOnly = defineBaseTable({
        schema: {
          id: z.string(),
          createdAt: z.string(),
          username: z.string(),
          email: z.string().nullable(),
        },
        idField: "id",
        readOnly: ["createdAt"] as const,
      });

      const usersWithReadOnlyTO = defineTableOccurrence({
        name: "usersWithReadOnly",
        baseTable: usersWithReadOnly,
      });

      const db = client.database("test_db", {
        occurrences: [usersWithReadOnlyTO],
      });

      // Should work - id and createdAt are excluded automatically
      db.from("usersWithReadOnly").insert({
        username: "john",
        email: "john@example.com",
      });

      // Should work - email is optional (nullable)
      db.from("usersWithReadOnly").insert({
        username: "jane",
      });
    });
  });

  describe("error handling", () => {
    it("should return error on failed update by ID", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      const result = await db
        .from("users")
        .update({ username: "newname" })
        .byId("user-123")
        .execute({ fetchHandler: mockFetch as any });

      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Network error");
    });

    it("should return error on failed update by filter", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const db = client.database("test_db", {
        occurrences: [usersTO],
      });

      const result = await db
        .from("users")
        .update({ active: false })
        .where((q) => q.filter({ active: true }))
        .execute({ fetchHandler: mockFetch as any });

      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Network error");
    });
  });
});
