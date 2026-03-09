import { describe, expect, it } from "vitest";
import { FMServerConnection } from "../../../src/client/filemaker-odata";
import { simpleMock } from "../../utils/mock-fetch";

function createTestDb(mockFetch?: typeof fetch) {
  const connection = new FMServerConnection({
    serverUrl: "https://api.example.com",
    auth: { apiKey: "test-key" },
    ...(mockFetch ? { fetchClientOptions: { fetchHandler: mockFetch } } : {}),
  });
  return connection.database("TestDB.fmp12");
}

describe("metadata commands (unit)", () => {
  it("listTableNames method exists", () => {
    const db = createTestDb();
    expect(typeof db.listTableNames).toBe("function");
  });

  it("listTableNames parses value array correctly via raw request", async () => {
    const db = createTestDb();
    const mockFetch = simpleMock({
      status: 200,
      body: { value: [{ name: "contacts" }, { name: "users" }] },
    });

    const result = await db._makeRequest<{ value: Array<{ name: string }> }>("/", {
      fetchHandler: mockFetch,
    });
    expect(result.error).toBeUndefined();
    expect(result.data?.value).toHaveLength(2);
    expect(result.data?.value?.[0]?.name).toBe("contacts");
  });

  it("listTableNames returns string array", async () => {
    const mockFetch = simpleMock({
      status: 200,
      body: { value: [{ name: "contacts" }, { name: "users" }] },
    });
    const db = createTestDb(mockFetch);
    const tables = await db.listTableNames();
    expect(tables).toEqual(["contacts", "users"]);
  });

  it("getMetadata (json) returns metadata object via raw request", async () => {
    const db = createTestDb();
    const mockFetch = simpleMock({
      status: 200,
      body: { "TestDB.fmp12": { entityContainer: { entitySets: [] } } },
    });

    const result = await db._makeRequest<Record<string, unknown>>("/$metadata", {
      fetchHandler: mockFetch,
      headers: { Accept: "application/json" },
    });
    expect(result.error).toBeUndefined();
    expect(result.data).toHaveProperty("TestDB.fmp12");
  });
});
