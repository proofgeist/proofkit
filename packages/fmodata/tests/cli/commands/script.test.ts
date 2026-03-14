import { describe, expect, it } from "vitest";
import { FMServerConnection } from "../../../src/client/filemaker-odata";
import { simpleMock } from "../../utils/mock-fetch";

describe("script run command (unit)", () => {
  it("runs script without param", async () => {
    const mockFetch = simpleMock({
      status: 200,
      body: { scriptResult: { code: 0, resultParameter: "done" } },
    });
    const connection = new FMServerConnection({
      serverUrl: "https://api.example.com",
      auth: { apiKey: "test-key" },
      fetchClientOptions: { fetchHandler: mockFetch },
    });
    const db = connection.database("TestDB.fmp12");

    const result = await db.runScript("MyScript");
    expect(result.resultCode).toBe(0);
    expect(result.result).toBe("done");
  });

  it("runs script with string param", async () => {
    const mockFetch = simpleMock({
      status: 200,
      body: { scriptResult: { code: 0, resultParameter: "ok" } },
    });
    const connection = new FMServerConnection({
      serverUrl: "https://api.example.com",
      auth: { apiKey: "test-key" },
      fetchClientOptions: { fetchHandler: mockFetch },
    });
    const db = connection.database("TestDB.fmp12");

    const result = await db.runScript("MyScript", { scriptParam: "hello" });
    expect(result.resultCode).toBe(0);
  });

  it("runs script with object param", async () => {
    const mockFetch = simpleMock({
      status: 200,
      body: { scriptResult: { code: 0, resultParameter: "ok" } },
    });
    const connection = new FMServerConnection({
      serverUrl: "https://api.example.com",
      auth: { apiKey: "test-key" },
      fetchClientOptions: { fetchHandler: mockFetch },
    });
    const db = connection.database("TestDB.fmp12");

    const result = await db.runScript("MyScript", { scriptParam: { key: "value" } });
    expect(result.resultCode).toBe(0);
  });
});
