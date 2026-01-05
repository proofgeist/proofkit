/**
 * Tests for includeSpecialColumns feature
 *
 * These tests verify that the includeSpecialColumns option can be set at the database level
 * and overridden at the request level, and that special columns (ROWID and ROWMODID) are
 * included in responses when the header is set and no $select query is applied.
 */

import { describe, it, expect, expectTypeOf, assert } from "vitest";
import { fmTableOccurrence, textField } from "@proofkit/fmodata";
import { simpleMock } from "./utils/mock-fetch";
import { createMockClient } from "./utils/test-setup";
import { first } from "es-toolkit/compat";

// Create a simple table occurrence for testing
const contactsTO = fmTableOccurrence("contacts", {
  id: textField().primaryKey(),
  name: textField(),
});

const connection = createMockClient();

describe("includeSpecialColumns feature", () => {
  it("should include special columns header when enabled at database level", async () => {
    const db = connection.database("TestDB", {
      includeSpecialColumns: true,
    });

    let preferHeader: string | null = null;
    let reqUrl: string | null = null;
    const { data } = await db
      .from(contactsTO)
      .list()
      .execute({
        hooks: {
          before: async (req) => {
            const headers = req.headers;
            reqUrl = req.url;
            preferHeader = headers.get("Prefer");
            return;
          },
        },
        fetchHandler: simpleMock({
          body: {
            value: [{ id: "1", name: "John", ROWID: 123, ROWMODID: 456 }],
          },
          status: 200,
        }),
      });
    expect(preferHeader).toBe("fmodata.include-specialcolumns");
    const parsedUrl = new URL(reqUrl!);
    const selectParam = parsedUrl.searchParams.get("$select");
    // since we're automatically adding a $select parameter (defaultSelect: "schema"), we need to include the special columns in the select parameter
    expect(selectParam).toContain("ROWID");
    expect(selectParam).toContain("ROWMODID");

    const firstRecord = data![0]!;

    // type checks
    expectTypeOf(firstRecord).toHaveProperty("ROWID");
    expectTypeOf(firstRecord).toHaveProperty("ROWMODID");
    firstRecord.ROWID;
    firstRecord.ROWMODID;

    // runtime check
    expect(firstRecord).toHaveProperty("ROWID");
    expect(firstRecord).toHaveProperty("ROWMODID");
  });

  it("should not add $select parameter when defaultSelect is not 'schema'", async () => {
    const db = connection.database("TestDB", { includeSpecialColumns: true });

    const contactsAll = fmTableOccurrence(
      "contacts",
      {
        id: textField().primaryKey(),
        name: textField(),
      },
      { defaultSelect: "all" },
    );

    let preferHeader: string | null = null;
    let reqUrl: string | null = null;
    const { data } = await db
      .from(contactsAll)
      .list()
      .execute({
        hooks: {
          before: async (req) => {
            const headers = req.headers;
            preferHeader = headers.get("Prefer");
            reqUrl = req.url;
            return;
          },
        },
        fetchHandler: simpleMock({
          body: {
            value: [{ id: "1", name: "John", ROWID: 123, ROWMODID: 456 }],
          },
          status: 200,
        }),
      });
    const parsedUrl = new URL(reqUrl!);
    const selectParam = parsedUrl.searchParams.get("$select");
    // don't add $select parameter when defaultSelect is not 'schema'
    expect(selectParam).toBeNull();

    const firstRecord = data![0]!;

    // type checks
    expectTypeOf(firstRecord).toHaveProperty("ROWID");
    expectTypeOf(firstRecord).toHaveProperty("ROWMODID");
    firstRecord.ROWID;
    firstRecord.ROWMODID;

    // runtime check
    expect(firstRecord).toHaveProperty("ROWID");
    expect(firstRecord).toHaveProperty("ROWMODID");
  });

  it("should not include special columns header when disabled at database level", async () => {
    const db = connection.database("TestDB", {
      includeSpecialColumns: false,
    });

    let preferHeader: string | null = null;
    const { data } = await db
      .from(contactsTO)
      .list()
      .execute({
        hooks: {
          before: async (req) => {
            const headers = req.headers;
            preferHeader = headers.get("Prefer");
            return;
          },
        },
        fetchHandler: simpleMock({
          body: { value: [{ id: "1", name: "John" }] },
          status: 200,
        }),
      });
    expect(preferHeader).toBeNull();

    const firstRecord = data![0]!;

    // type checks
    expectTypeOf(firstRecord).not.toHaveProperty("ROWID");
    expectTypeOf(firstRecord).not.toHaveProperty("ROWMODID");
    // @ts-expect-error
    firstRecord.ROWID;
    // @ts-expect-error
    firstRecord.ROWMODID;

    // runtime check
    expect(firstRecord).not.toHaveProperty("ROWID");
    expect(firstRecord).not.toHaveProperty("ROWMODID");
  });

  it("should be disabled by default at database level", async () => {
    const db = connection.database("TestDB");

    let preferHeader: string | null = null;
    const { data } = await db
      .from(contactsTO)
      .list()
      .execute({
        hooks: {
          before: async (req) => {
            const headers = req.headers;
            preferHeader = headers.get("Prefer");
            return;
          },
        },
        fetchHandler: simpleMock({
          body: { value: [{ id: "1", name: "John" }] },
          status: 200,
        }),
      });
    expect(preferHeader).toBeNull();

    const firstRecord = data![0]!;

    // type checks
    expectTypeOf(firstRecord).not.toHaveProperty("ROWID");
    expectTypeOf(firstRecord).not.toHaveProperty("ROWMODID");
    // @ts-expect-error
    firstRecord.ROWID;
    // @ts-expect-error
    firstRecord.ROWMODID;

    // runtime check
    expect(firstRecord).not.toHaveProperty("ROWID");
    expect(firstRecord).not.toHaveProperty("ROWMODID");
  });

  it("should allow overriding includeSpecialColumns at request level", async () => {
    const db = connection.database("TestDB", {
      includeSpecialColumns: false,
    });

    // First request: use default (should NOT have header)
    let preferHeader1: string | null = null;
    const { data: data1 } = await db
      .from(contactsTO)
      .list()
      .execute({
        hooks: {
          before: async (req) => {
            const headers = req.headers;
            preferHeader1 = headers.get("Prefer");
            return;
          },
        },
        fetchHandler: simpleMock({
          body: { value: [{ id: "1", name: "John" }] },
          status: 200,
        }),
      });

    const firstRecord1 = data1![0]!;

    // type checks
    expectTypeOf(firstRecord1).not.toHaveProperty("ROWID");
    expectTypeOf(firstRecord1).not.toHaveProperty("ROWMODID");
    // @ts-expect-error
    firstRecord1.ROWID;
    // @ts-expect-error
    firstRecord1.ROWMODID;

    // runtime check
    expect(firstRecord1).not.toHaveProperty("ROWID");
    expect(firstRecord1).not.toHaveProperty("ROWMODID");

    // Second request: explicitly enable for this request only
    let preferHeader2: string | null = null;
    const { data: data2 } = await db
      .from(contactsTO)
      .list()
      .execute({
        includeSpecialColumns: true,
        hooks: {
          before: async (req) => {
            const headers = req.headers;
            preferHeader2 = headers.get("Prefer");
            return;
          },
        },
        fetchHandler: simpleMock({
          body: {
            value: [{ id: "1", name: "John", ROWID: 123, ROWMODID: 456 }],
          },
          status: 200,
        }),
      });

    const firstRecord2 = data2![0]!;

    // type checks
    expectTypeOf(firstRecord2).toHaveProperty("ROWID");
    expectTypeOf(firstRecord2).toHaveProperty("ROWMODID");
    firstRecord2.ROWID;
    firstRecord2.ROWMODID;

    // runtime check
    expect(firstRecord2).toHaveProperty("ROWID");
    expect(firstRecord2).toHaveProperty("ROWMODID");

    // Third request: explicitly disable for this request
    let preferHeader3: string | null = null;
    await db
      .from(contactsTO)
      .list()
      .execute({
        includeSpecialColumns: false,
        hooks: {
          before: async (req) => {
            const headers = req.headers;
            preferHeader3 = headers.get("Prefer");
            return;
          },
        },
        fetchHandler: simpleMock({ body: { value: [] }, status: 200 }),
      });

    expect(preferHeader1).toBeNull();
    expect(preferHeader2).toBe("fmodata.include-specialcolumns");
    expect(preferHeader3).toBeNull();
  });

  it("should combine includeSpecialColumns with useEntityIds in Prefer header", async () => {
    const contactsTOWithEntityIds = fmTableOccurrence(
      "contacts",
      {
        id: textField().primaryKey().entityId("FMFID:1"),
        name: textField().entityId("FMFID:2"),
      },
      {
        entityId: "FMTID:100",
      },
    );

    const db = connection.database("TestDB", {
      useEntityIds: true,
      includeSpecialColumns: true,
    });

    let preferHeader: string | null = null;
    const { data } = await db
      .from(contactsTOWithEntityIds)
      .list()
      .execute({
        hooks: {
          before: async (req) => {
            const headers = req.headers;
            preferHeader = headers.get("Prefer");
            return;
          },
        },
        fetchHandler: simpleMock({
          body: {
            value: [{ id: "1", name: "John", ROWID: 123, ROWMODID: 456 }],
          },
          status: 200,
        }),
      });
    expect(preferHeader).toContain("fmodata.entity-ids");
    expect(preferHeader).toContain("fmodata.include-specialcolumns");
    // Should be comma-separated
    expect(preferHeader).not.toBeNull();
    const preferValues = preferHeader!.split(", ");
    expect(preferValues.length).toBe(2);
    expect(preferValues).toContain("fmodata.entity-ids");
    expect(preferValues).toContain("fmodata.include-specialcolumns");

    const firstRecord = data![0]!;

    // type checks
    expectTypeOf(firstRecord).toHaveProperty("ROWID");
    expectTypeOf(firstRecord).toHaveProperty("ROWMODID");
    firstRecord.ROWID;
    firstRecord.ROWMODID;

    // runtime check
    expect(firstRecord).toHaveProperty("ROWID");
    expect(firstRecord).toHaveProperty("ROWMODID");
  });

  it("should work with get() method for single records", async () => {
    const db = connection.database("TestDB", {
      includeSpecialColumns: true,
    });

    let preferHeader: string | null = null;
    const { data } = await db
      .from(contactsTO)
      .get("123")
      .execute({
        hooks: {
          before: async (req) => {
            const headers = req.headers;
            preferHeader = headers.get("Prefer");
            return;
          },
        },
        fetchHandler: simpleMock({
          body: {
            id: "123",
            name: "John",
            ROWID: 123,
            ROWMODID: 456,
          },
          status: 200,
        }),
      });
    expect(preferHeader).toBe("fmodata.include-specialcolumns");

    assert(data, "data is undefined");

    // type checks
    expectTypeOf(data).toHaveProperty("ROWID");
    expectTypeOf(data).toHaveProperty("ROWMODID");
    data.ROWID;
    data.ROWMODID;

    // runtime check
    expect(data).toHaveProperty("ROWID");
    expect(data).toHaveProperty("ROWMODID");
  });

  it("should not include special columns when $select is applied", async () => {
    const db = connection.database("TestDB", {
      includeSpecialColumns: true,
    });

    // FileMaker OData requires ROWID/ROWMODID to be explicitly listed in $select
    // to be returned (they are only included when explicitly requested or when header is set and no $select is applied)
    let preferHeader: string | null = null;
    const { data } = await db
      .from(contactsTO)
      .list()
      .select({ name: contactsTO.name })
      .execute({
        hooks: {
          before: async (req) => {
            const headers = req.headers;
            // Header should still be sent, but server won't return special columns
            preferHeader = headers.get("Prefer");
            return;
          },
        },
        fetchHandler: simpleMock({
          body: {
            value: [{ name: "John" }], // No ROWID or ROWMODID
          },
          status: 200,
        }),
      });
    expect(preferHeader).toBe("fmodata.include-specialcolumns");

    const firstRecord = data![0]!;

    // type checks
    expectTypeOf(firstRecord).not.toHaveProperty("ROWID");
    expectTypeOf(firstRecord).not.toHaveProperty("ROWMODID");
    // @ts-expect-error
    firstRecord.ROWID;
    // @ts-expect-error
    firstRecord.ROWMODID;

    // runtime check
    expect(firstRecord).not.toHaveProperty("ROWID");
    expect(firstRecord).not.toHaveProperty("ROWMODID");
  });

  it("should not append ROWID/ROWMODID to explicit $select unless requested via systemColumns", () => {
    const db = connection.database("TestDB", {
      includeSpecialColumns: true,
    });

    // Explicit select() should remain exact (no implicit system columns)
    const queryString = db
      .from(contactsTO)
      .list()
      .select({ name: contactsTO.name })
      .getQueryString();

    expect(queryString).toContain("$select=");
    expect(queryString).toContain("name");
    expect(queryString).not.toContain("ROWID");
    expect(queryString).not.toContain("ROWMODID");

    // But system columns should still be selectable when explicitly requested
    const queryStringWithSystemCols = db
      .from(contactsTO)
      .list()
      .select({ name: contactsTO.name }, { ROWID: true, ROWMODID: true })
      .getQueryString();

    expect(queryStringWithSystemCols).toContain("ROWID");
    expect(queryStringWithSystemCols).toContain("ROWMODID");
  });

  it("should work with single() method", async () => {
    const db = connection.database("TestDB", {
      includeSpecialColumns: true,
    });

    let preferHeader: string | null = null;
    const { data } = await db
      .from(contactsTO)
      .list()
      .single()
      .execute({
        hooks: {
          before: async (req) => {
            const headers = req.headers;
            preferHeader = headers.get("Prefer");
            return;
          },
        },
        fetchHandler: simpleMock({
          body: {
            id: "123",
            name: "John",
            ROWID: 123,
            ROWMODID: 456,
          },
          status: 200,
        }),
      });
    expect(preferHeader).toBe("fmodata.include-specialcolumns");

    assert(data, "data is undefined");

    // type checks
    expectTypeOf(data).toHaveProperty("ROWID");
    expectTypeOf(data).toHaveProperty("ROWMODID");
    data.ROWID;
    data.ROWMODID;

    // runtime check
    expect(data).toHaveProperty("ROWID");
    expect(data).toHaveProperty("ROWMODID");
  });

  it("should not include special columns if getSingleField() is used", async () => {
    const db = connection.database("TestDB", {
      includeSpecialColumns: true,
    });

    let preferHeader: string | null = null;
    const { data } = await db
      .from(contactsTO)
      .get("123")
      .getSingleField(contactsTO.name)
      .execute({
        hooks: {
          before: async (req) => {
            const headers = req.headers;
            preferHeader = headers.get("Prefer");
            return;
          },
        },
        fetchHandler: simpleMock({ body: { value: "John" }, status: 200 }),
      });
    expect(preferHeader).toBe("fmodata.include-specialcolumns");

    expectTypeOf(data).not.toHaveProperty("ROWID");
    expectTypeOf(data).not.toHaveProperty("ROWMODID");
    // @ts-expect-error
    data.ROWID;
    // @ts-expect-error
    data.ROWMODID;
  });

  it("should still allow you to select ROWID or ROWMODID in select()", async () => {
    const db = connection.database("TestDB");

    const { data } = await db
      .from(contactsTO)
      .list()
      .select(
        {
          id: contactsTO.id,
        },
        { ROWID: true, ROWMODID: true },
      )
      .execute({
        fetchHandler: simpleMock({
          body: {
            value: [{ id: "1", ROWID: 123, ROWMODID: 456 }],
          },
          status: 200,
        }),
      });
    const firstRecord = data![0]!;

    expectTypeOf(firstRecord).toHaveProperty("ROWID");
    expectTypeOf(firstRecord).toHaveProperty("ROWMODID");
    firstRecord.ROWID;
    firstRecord.ROWMODID;

    // runtime check
    expect(firstRecord).toHaveProperty("ROWID");
    expect(firstRecord).toHaveProperty("ROWMODID");
  });
});
