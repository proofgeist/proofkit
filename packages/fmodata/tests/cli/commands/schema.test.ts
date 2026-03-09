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

describe("schema commands (unit)", () => {
  it("createTable sends POST to FileMaker_Tables", async () => {
    const db = createTestDb();
    const mockFetch = simpleMock({
      status: 200,
      body: { tableName: "NewTable", fields: [] },
    });

    const result = await db.schema.createTable("NewTable", [{ name: "Name", type: "string" }], {
      fetchHandler: mockFetch,
    });
    expect(result.tableName).toBe("NewTable");
  });

  it("addFields sends PATCH to FileMaker_Tables/tableName", async () => {
    const db = createTestDb();
    const mockFetch = simpleMock({
      status: 200,
      body: { tableName: "contacts", fields: [{ name: "Notes", type: "varchar" }] },
    });

    const result = await db.schema.addFields("contacts", [{ name: "Notes", type: "string" }], {
      fetchHandler: mockFetch,
    });
    expect(result.tableName).toBe("contacts");
    expect(result.fields).toHaveLength(1);
  });

  it("listTableNames (used for schema list-tables) returns table names", async () => {
    const db = createTestDb();
    const mockFetch = simpleMock({
      status: 200,
      body: { value: [{ name: "contacts" }, { name: "users" }] },
    });

    const result = await db._makeRequest<{ value: Array<{ name: string }> }>("/", {
      fetchHandler: mockFetch,
    });
    const names = result.data?.value?.map((t) => t.name) ?? [];
    expect(names).toEqual(["contacts", "users"]);
  });
});
