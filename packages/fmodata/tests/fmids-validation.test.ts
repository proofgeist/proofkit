/**
 * Tests for BaseTable and TableOccurrence with entity IDs
 *
 * These tests verify:
 * 1. Successful instantiation with entity IDs using setup functions
 * 2. Entity ID functionality works correctly
 * 3. Backward compatibility of regular classes
 */

import { describe, it, expect } from "vitest";
import { z } from "zod/v4";
import {
  defineBaseTable,
  defineTableOccurrence,
  buildOccurrences,
} from "../src/index";
// Import classes directly for instanceof checks in tests
import { BaseTable } from "../src/client/base-table";
import { TableOccurrence } from "../src/client/table-occurrence";
import {
  usersBaseWithIds,
  contactsBaseWithIds,
  occurrencesWithIds,
  occurrences,
  usersBase,
  contactsBase,
  createMockClient,
} from "./utils/test-setup";

describe("BaseTable with entity IDs", () => {
  it("should create a BaseTable with fmfIds using defineBaseTable", () => {
    const schema = {
      id: z.string(),
      name: z.string(),
      email: z.string().nullable(),
    };

    const table = defineBaseTable({
      schema,
      idField: "id",
      fmfIds: {
        id: "FMFID:1",
        name: "FMFID:2",
        email: "FMFID:3",
      },
    });

    expect(table).toBeInstanceOf(BaseTable);
    expect(table.fmfIds).toBeDefined();
    expect(table.fmfIds?.id).toBe("FMFID:1");
    expect(table.fmfIds?.name).toBe("FMFID:2");
    expect(table.fmfIds?.email).toBe("FMFID:3");
    expect(table.isUsingFieldIds()).toBe(true);
  });

  it("should enforce fmfIds format with template literal type", () => {
    const schema = {
      id: z.string(),
      name: z.string(),
    };

    // This should work
    const table = defineBaseTable({
      schema,
      idField: "id",
      fmfIds: {
        id: "FMFID:123",
        name: "FMFID:abc",
      },
    });

    expect(table.fmfIds?.id).toBe("FMFID:123");
  });

  it("should inherit all BaseTable functionality", () => {
    const table = defineBaseTable({
      schema: {
        id: z.string(),
        name: z.string(),
        email: z.string().nullable(),
      },
      idField: "id",
      fmfIds: {
        id: "FMFID:1",
        name: "FMFID:2",
        email: "FMFID:3",
      },
      readOnly: ["name"],
    });

    expect(table.schema).toBeDefined();
    expect(table.idField).toBe("id");
    expect(table.readOnly).toEqual(["name"]);
  });
});

describe("TableOccurrence with entity IDs", () => {
  it("should create a TableOccurrence with fmtId using defineTableOccurrence", () => {
    const baseTable = defineBaseTable({
      schema: {
        id: z.string(),
        name: z.string(),
      },
      idField: "id",
      fmfIds: {
        id: "FMFID:1",
        name: "FMFID:2",
      },
    });

    const tableOcc = defineTableOccurrence({
      name: "test_table",
      baseTable,
      fmtId: "FMTID:100",
    });

    expect(tableOcc).toBeInstanceOf(TableOccurrence);
    expect(tableOcc.fmtId).toBe("FMTID:100");
    expect(tableOcc.name).toBe("test_table");
    expect(tableOcc.baseTable).toBe(baseTable);
    expect(tableOcc.isUsingTableId()).toBe(true);
  });

  it("should work with defineTableOccurrence helper", () => {
    const baseTable = defineBaseTable({
      schema: {
        id: z.string(),
        name: z.string(),
      },
      idField: "id",
      fmfIds: {
        id: "FMFID:1",
        name: "FMFID:2",
      },
    });

    const tableOcc = defineTableOccurrence({
      name: "test_table",
      baseTable,
      fmtId: "FMTID:100",
    });

    expect(tableOcc.fmtId).toBe("FMTID:100");
    expect(tableOcc.isUsingTableId()).toBe(true);
  });

  it("should inherit all TableOccurrence functionality", () => {
    const baseTable = defineBaseTable({
      schema: {
        id: z.string(),
        name: z.string(),
        email: z.string().nullable(),
      },
      idField: "id",
      fmfIds: {
        id: "FMFID:1",
        name: "FMFID:2",
        email: "FMFID:3",
      },
    });

    const tableOcc = defineTableOccurrence({
      name: "test_table",
      baseTable,
      fmtId: "FMTID:100",
      defaultSelect: "all",
    });

    expect(tableOcc.defaultSelect).toBe("all");
    expect(tableOcc.navigation).toBeDefined();
  });
});

describe("Type enforcement (compile-time)", () => {
  it("should allow BaseTable with and without entity IDs", () => {
    const regularBase = defineBaseTable({
      schema: {
        id: z.string(),
        name: z.string(),
      },
      idField: "id",
    });

    const baseWithIds = defineBaseTable({
      schema: {
        id: z.string(),
        name: z.string(),
      },
      idField: "id",
      fmfIds: { id: "FMFID:1", name: "FMFID:2" },
    });

    // Both should work
    const regularTableOcc = defineTableOccurrence({
      name: "test",
      baseTable: regularBase,
    });

    const withIdsTableOcc = defineTableOccurrence({
      name: "test",
      baseTable: baseWithIds,
      fmtId: "FMTID:100",
    });

    expect(regularTableOcc).toBeDefined();
    expect(withIdsTableOcc).toBeDefined();
    expect(withIdsTableOcc.baseTable.fmfIds).toBeDefined();
  });

  it("should not allow mixture of occurrences when creating a database", () => {
    const regularBase = defineBaseTable({
      schema: { id: z.string(), name: z.string() },
      idField: "id",
    });
    const baseWithIds = defineBaseTable({
      schema: { id: z.string(), name: z.string() },
      idField: "id",
      fmfIds: { id: "FMFID:1", name: "FMFID:2" },
    });

    const regularTableOcc = defineTableOccurrence({
      name: "regular",
      baseTable: regularBase,
    });

    const withIdsTableOcc = defineTableOccurrence({
      name: "withIds",
      baseTable: baseWithIds,
      fmtId: "FMTID:100",
    });

    // Should throw a runtime error when mixing regular and WithIds table occurrences
    expect(() => {
      createMockClient().database("test", {
        occurrences: [regularTableOcc, withIdsTableOcc],
      });
    }).toThrow(
      /Cannot mix TableOccurrence instances with and without entity IDs/,
    );

    // Should not throw when mixed if useEntityIds is set to false
    expect(() => {
      createMockClient().database("test", {
        occurrences: [regularTableOcc, withIdsTableOcc],
        useEntityIds: false,
      });
    }).not.toThrow();

    // Should throw if useEntityIds is set to true, and no occurences use entity IDs
    expect(() => {
      createMockClient().database("test", {
        occurrences: [regularTableOcc],
        useEntityIds: true, // but no occurences passed in use entity IDs!
      });
    }).toThrow();
  });

  it("should create TableOccurrence without entity IDs", () => {
    const regularBase = defineBaseTable({
      schema: {
        id: z.string(),
        name: z.string(),
      },
      idField: "id",
    });

    const tableOcc = defineTableOccurrence({
      name: "test",
      baseTable: regularBase,
    });

    expect(tableOcc).toBeInstanceOf(TableOccurrence);
  });
});

describe("Navigation type validation", () => {
  it("should allow navigation with any TableOccurrence", () => {
    const baseWithIds = defineBaseTable({
      schema: { id: z.string(), name: z.string() },
      idField: "id",
      fmfIds: { id: "FMFID:1", name: "FMFID:2" },
    });

    const relatedBaseWithIds = defineBaseTable({
      schema: { id: z.string() },
      idField: "id",
      fmfIds: { id: "FMFID:3" },
    });

    // Navigation can use any TableOccurrence - unified classes allow mixing
    const _relatedTO = defineTableOccurrence({
      name: "related" as const,
      baseTable: relatedBaseWithIds,
      fmtId: "FMTID:200",
    });

    const _mainTO = defineTableOccurrence({
      name: "main" as const,
      baseTable: baseWithIds,
      fmtId: "FMTID:100",
    });

    const [mainTO, relatedTO] = buildOccurrences({
      occurrences: [_mainTO, _relatedTO],
      navigation: {
        main: ["related"],
      },
    });

    expect(mainTO).toBeDefined();
    expect(mainTO.navigation.related.fmtId).toBe("FMTID:200");
  });
});

describe("Helper functions", () => {
  it("should create TableOccurrence with defineTableOccurrence helper", () => {
    const base = defineBaseTable({
      schema: { id: z.string() },
      idField: "id",
    });

    const to = defineTableOccurrence({
      name: "test",
      baseTable: base,
    });

    expect(to).toBeInstanceOf(TableOccurrence);
    expect(to.name).toBe("test");
  });

  it("should create TableOccurrence with entity IDs using defineTableOccurrence helper", () => {
    const base = defineBaseTable({
      schema: { id: z.string() },
      idField: "id",
      fmfIds: { id: "FMFID:1" },
    });

    const to = defineTableOccurrence({
      name: "test",
      baseTable: base,
      fmtId: "FMTID:100",
    });

    expect(to).toBeInstanceOf(TableOccurrence);
    expect(to.fmtId).toBe("FMTID:100");
  });
});
