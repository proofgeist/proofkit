import { eq, fmTableOccurrence, textField } from "@proofkit/fmodata";
import { MockFMServerConnection } from "@proofkit/fmodata/testing";
import { describe, expect, it } from "vitest";

const contacts = fmTableOccurrence(
  "contacts",
  {
    id: textField().primaryKey().entityId("FMFID:1"),
    name: textField().entityId("FMFID:2"),
  },
  {
    entityId: "FMTID:100",
  },
);

describe("invalid entity-id references", () => {
  it("returns an error result when useEntityIds is enabled for a table without entity IDs", async () => {
    const fakeTable = fmTableOccurrence("NonExistent", {
      id: textField().primaryKey().entityId("FMFID:999999999"),
    });

    const mock = new MockFMServerConnection({ enableSpy: true });
    mock.addRoute({
      urlPattern: "/TestDB",
      response: { value: [] },
      status: 200,
    });

    const db = mock.database("TestDB", { useEntityIds: true });
    const result = await db.from(fakeTable).list().execute();

    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('table "NonExistent"');
    expect(mock.spy?.calls).toHaveLength(0);
  });

  it("returns an error result for unresolved field-like operands in filters", async () => {
    const looseField = textField().entityId("FMFID:000000001");

    const mock = new MockFMServerConnection({ enableSpy: true });
    mock.addRoute({
      urlPattern: "/TestDB",
      response: { value: [] },
      status: 200,
    });

    const db = mock.database("TestDB", { useEntityIds: true });
    const result = await db
      .from(contacts)
      .list()
      .where(eq(contacts.name, looseField as never))
      .execute();

    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("Unsupported filter operand");
    expect(mock.spy?.calls).toHaveLength(0);
  });
});
