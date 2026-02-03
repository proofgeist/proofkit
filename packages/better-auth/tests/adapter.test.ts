/**
 * Unit tests for FileMaker adapter operations using mocked responses.
 * These tests verify adapter behavior without requiring a live FileMaker server.
 */
import type { Database } from "@proofkit/fmodata";
import { describe, expect, it } from "vitest";
import { FileMakerAdapter } from "../src/adapter";
import { mockResponses } from "./fixtures/responses";
import { createMockDatabase, createMockDatabaseSequence } from "./utils/mock-fetch";

// Test adapter factory - creates adapter with mock database
function createTestAdapter(mockDb: unknown) {
  return FileMakerAdapter({
    database: mockDb as Database,
    debugLogs: false,
  });
}

describe("FileMakerAdapter", () => {
  describe("create", () => {
    it("should create a record and return data with id", async () => {
      const mockDb = createMockDatabase(mockResponses["create-user"]);
      const adapter = createTestAdapter(mockDb)({});

      const result = await adapter.create({
        model: "user",
        data: {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
        },
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("user-123");
    });

    it("should create a session record", async () => {
      const mockDb = createMockDatabase(mockResponses["create-session"]);
      const adapter = createTestAdapter(mockDb)({});

      const result = await adapter.create({
        model: "session",
        data: {
          id: "session-456",
          userId: "user-123",
          token: "abc123token",
        },
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("session-456");
    });
  });

  describe("findOne", () => {
    it("should find a single record", async () => {
      const mockDb = createMockDatabase(mockResponses["find-one-user"]);
      const adapter = createTestAdapter(mockDb)({});

      const result = await adapter.findOne({
        model: "user",
        where: [{ field: "email", operator: "eq", value: "test@example.com", connector: "AND" }],
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe("user-123");
      expect(result?.email).toBe("test@example.com");
    });

    it("should return null when no record found", async () => {
      const mockDb = createMockDatabase(mockResponses["find-one-user-not-found"]);
      const adapter = createTestAdapter(mockDb)({});

      const result = await adapter.findOne({
        model: "user",
        where: [{ field: "id", operator: "eq", value: "nonexistent", connector: "AND" }],
      });

      expect(result).toBeNull();
    });
  });

  describe("findMany", () => {
    it("should find multiple records", async () => {
      const mockDb = createMockDatabase(mockResponses["find-many-users"]);
      const adapter = createTestAdapter(mockDb)({});

      const result = await adapter.findMany({
        model: "user",
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it("should return empty array when no records found", async () => {
      const mockDb = createMockDatabase(mockResponses["find-many-users-empty"]);
      const adapter = createTestAdapter(mockDb)({});

      const result = await adapter.findMany({
        model: "user",
        where: [{ field: "email", operator: "eq", value: "nonexistent@example.com", connector: "AND" }],
      });

      expect(result).toEqual([]);
    });

    it("should apply limit", async () => {
      const mockDb = createMockDatabase(mockResponses["find-many-with-limit"]);
      const adapter = createTestAdapter(mockDb)({});

      const result = await adapter.findMany({
        model: "user",
        limit: 1,
      });

      expect(result.length).toBe(1);
    });

    it("should apply sort", async () => {
      const mockDb = createMockDatabase(mockResponses["find-many-sorted-desc"]);
      const adapter = createTestAdapter(mockDb)({});

      const result = await adapter.findMany({
        model: "user",
        sortBy: { field: "createdAt", direction: "desc" },
      });

      expect(result.length).toBe(2);
      // First record should be newer
      const first = result[0] as { createdAt: string };
      const second = result[1] as { createdAt: string };
      expect(new Date(first.createdAt).getTime()).toBeGreaterThan(new Date(second.createdAt).getTime());
    });
  });

  describe("count", () => {
    it("should count records", async () => {
      const mockDb = createMockDatabase(mockResponses["count-users"]);
      const adapter = createTestAdapter(mockDb)({});

      const result = await adapter.count({
        model: "user",
      });

      expect(result).toBe(5);
    });
  });

  describe("update", () => {
    it("should update a record and return updated data", async () => {
      // Update requires: find record -> patch -> read back
      const mockDb = createMockDatabaseSequence([
        mockResponses["update-find-user"],
        mockResponses["update-patch-user"],
        mockResponses["update-read-back-user"],
      ]);
      const adapter = createTestAdapter(mockDb)({});

      const result = await adapter.update({
        model: "user",
        where: [{ field: "id", operator: "eq", value: "user-123", connector: "AND" }],
        update: { email: "updated@example.com", name: "Updated User" },
      });

      expect(result).toBeDefined();
      expect(result?.email).toBe("updated@example.com");
      expect(result?.name).toBe("Updated User");
    });

    it("should return null when record to update not found", async () => {
      const mockDb = createMockDatabase(mockResponses["find-one-user-not-found"]);
      const adapter = createTestAdapter(mockDb)({});

      const result = await adapter.update({
        model: "user",
        where: [{ field: "id", operator: "eq", value: "nonexistent", connector: "AND" }],
        update: { name: "New Name" },
      });

      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("should delete a record", async () => {
      // Delete requires: find record -> delete
      const mockDb = createMockDatabaseSequence([mockResponses["delete-find-user"], mockResponses["delete-user"]]);
      const adapter = createTestAdapter(mockDb)({});

      // Should not throw
      await adapter.delete({
        model: "user",
        where: [{ field: "id", operator: "eq", value: "user-123", connector: "AND" }],
      });
    });

    it("should do nothing when record to delete not found", async () => {
      const mockDb = createMockDatabase(mockResponses["delete-find-not-found"]);
      const adapter = createTestAdapter(mockDb)({});

      // Should not throw
      await adapter.delete({
        model: "user",
        where: [{ field: "id", operator: "eq", value: "nonexistent", connector: "AND" }],
      });
    });
  });

  describe("deleteMany", () => {
    it("should delete multiple records", async () => {
      // DeleteMany requires: find all -> delete each
      const mockDb = createMockDatabaseSequence([
        mockResponses["delete-many-find-users"],
        mockResponses["delete-user-123"],
        mockResponses["delete-user-456"],
      ]);
      const adapter = createTestAdapter(mockDb)({});

      const result = await adapter.deleteMany({
        model: "user",
        where: [{ field: "email", operator: "eq", value: "test@example.com", connector: "AND" }],
      });

      expect(result).toBe(2);
    });

    it("should return 0 when no records to delete", async () => {
      const mockDb = createMockDatabase(mockResponses["delete-find-not-found"]);
      const adapter = createTestAdapter(mockDb)({});

      const result = await adapter.deleteMany({
        model: "user",
        where: [{ field: "id", operator: "eq", value: "nonexistent", connector: "AND" }],
      });

      expect(result).toBe(0);
    });
  });

  describe("updateMany", () => {
    it("should update multiple records", async () => {
      // UpdateMany requires: find all -> patch each
      const mockDb = createMockDatabaseSequence([
        mockResponses["delete-many-find-users"], // reuse the find response
        mockResponses["update-patch-user"],
        mockResponses["update-patch-user"],
      ]);
      const adapter = createTestAdapter(mockDb)({});

      const result = await adapter.updateMany({
        model: "user",
        where: [{ field: "email", operator: "eq", value: "test@example.com", connector: "AND" }],
        update: { name: "Updated Name" },
      });

      expect(result).toBe(2);
    });
  });
});

describe("FileMakerAdapter configuration", () => {
  it("should throw on missing database", () => {
    expect(() => FileMakerAdapter({} as any)).toThrow();
  });

  it("should throw on null database", () => {
    expect(() => FileMakerAdapter({ database: null } as any)).toThrow();
  });
});
