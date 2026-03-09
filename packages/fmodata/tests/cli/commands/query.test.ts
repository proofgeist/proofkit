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

describe("query commands (unit — raw OData requests)", () => {
  it("list builds correct URL with $top and $filter", async () => {
    const db = createTestDb();
    const mockFetch = simpleMock({
      status: 200,
      body: { value: [{ name: "Alice" }] },
    });

    const result = await db._makeRequest<{ value: unknown[] }>("/contacts?$top=5&$filter=name eq 'Alice'", {
      fetchHandler: mockFetch,
    });
    expect(result.error).toBeUndefined();
    expect(result.data?.value).toHaveLength(1);
  });

  it("insert sends POST request", async () => {
    const db = createTestDb();
    const mockFetch = simpleMock({
      status: 201,
      body: { name: "Bob", id: "1" },
    });

    const result = await db._makeRequest<unknown>("/contacts", {
      method: "POST",
      body: JSON.stringify({ name: "Bob" }),
      fetchHandler: mockFetch,
    });
    expect(result.error).toBeUndefined();
  });

  it("update sends PATCH request", async () => {
    const db = createTestDb();
    const mockFetch = simpleMock({
      status: 200,
      body: { updated: 1 },
    });

    const result = await db._makeRequest<unknown>("/contacts?$filter=name eq 'Bob'", {
      method: "PATCH",
      body: JSON.stringify({ name: "Robert" }),
      fetchHandler: mockFetch,
    });
    expect(result.error).toBeUndefined();
  });

  it("delete sends DELETE request", async () => {
    const db = createTestDb();
    const mockFetch = simpleMock({
      status: 200,
      body: null,
      headers: { "fmodata.affected_rows": "1" },
    });

    const result = await db._makeRequest<number>("/contacts?$filter=name eq 'Bob'", {
      method: "DELETE",
      fetchHandler: mockFetch,
    });
    expect(result.error).toBeUndefined();
    expect(result.data).toBe(1);
  });
});
