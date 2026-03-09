import { describe, expect, it } from "vitest";
import { FMServerConnection } from "../../../src/client/filemaker-odata";
import { simpleMock } from "../../utils/mock-fetch";

function createTestDb() {
  const connection = new FMServerConnection({
    serverUrl: "https://api.example.com",
    auth: { apiKey: "test-key" },
  });
  return connection.database("TestDB.fmp12");
}

describe("webhook commands (unit)", () => {
  it("list returns webhook list response", async () => {
    const db = createTestDb();
    const mockFetch = simpleMock({
      status: 200,
      body: { status: "OK", webhooks: [{ webhookID: 1, tableName: "contacts", url: "https://example.com" }] },
    });

    const result = await db.webhook.list({ fetchHandler: mockFetch });
    expect(result.status).toBe("OK");
    expect(result.webhooks).toHaveLength(1);
    expect(result.webhooks[0]?.webhookID).toBe(1);
  });

  it("get returns webhook by id", async () => {
    const db = createTestDb();
    const mockFetch = simpleMock({
      status: 200,
      body: {
        webhookID: 42,
        tableName: "contacts",
        url: "https://example.com",
        notifySchemaChanges: false,
        select: "",
        filter: "",
        pendingOperations: [],
      },
    });

    const result = await db.webhook.get(42, { fetchHandler: mockFetch });
    expect(result.webhookID).toBe(42);
  });

  it("remove calls delete endpoint", async () => {
    const db = createTestDb();
    const mockFetch = simpleMock({ status: 204 });

    await expect(db.webhook.remove(1, { fetchHandler: mockFetch })).resolves.toBeUndefined();
  });

  it("add creates webhook with string tableName via proxy", async () => {
    const db = createTestDb();
    const mockFetch = simpleMock({
      status: 200,
      body: { webhookResult: { webhookID: 99 } },
    });

    // Test the table proxy approach used in the CLI
    const tableProxy = {
      [Symbol.for("fmodata:FMTableName")]: "contacts",
    } as unknown as import("../../../src/orm/table").FMTable<Record<string, never>, string>;

    const result = await db.webhook.add(
      {
        webhook: "https://example.com/hook",
        tableName: tableProxy,
      },
      { fetchHandler: mockFetch },
    );
    expect(result.webhookResult.webhookID).toBe(99);
  });
});
