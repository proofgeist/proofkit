import { describe, it, expect, vi, beforeEach } from "vitest";
import { FetchAdapter } from "../src/adapters/fetch.js";
import { FileMakerODataError } from "../src/client-types.js";
import {
  createMockResponse,
  createODataResponse,
  createODataErrorResponse,
} from "./setup.js";

describe("BaseFetchAdapter", () => {
  let adapter: FetchAdapter;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    adapter = new FetchAdapter({
      server: "https://test-server.example.com",
      database: "TestDatabase",
      auth: {
        username: "testuser",
        password: "testpass",
      },
    });

    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe("constructor", () => {
    it("should create adapter with valid options", () => {
      expect(adapter).toBeDefined();
    });

    it("should throw error if database is empty", () => {
      expect(() => {
        new FetchAdapter({
          server: "https://test-server.example.com",
          database: "",
          auth: {
            username: "testuser",
            password: "testpass",
          },
        });
      }).toThrow("Database name is required");
    });

    it("should construct correct base URL", () => {
      // Access protected property through type assertion for testing
      const baseUrl = (adapter as unknown as { baseUrl: URL }).baseUrl;
      expect(baseUrl.toString()).toBe(
        "https://test-server.example.com/fmi/odata/v4/TestDatabase",
      );
    });
  });

  describe("getTables", () => {
    it("should return list of tables", async () => {
      const mockData = createODataResponse([
        { name: "Table1", kind: "EntitySet", url: "Table1" },
        { name: "Table2", kind: "EntitySet", url: "Table2" },
      ]);

      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockData),
      );

      const result = await adapter.getTables();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(callUrl).toContain("/fmi/odata/v4/TestDatabase");
      expect(callUrl).toContain("format=json");
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1]).toMatchObject({ method: "GET" });

      expect(result.value).toHaveLength(2);
      expect(result.value[0]?.name).toBe("Table1");
      expect(result.value[1]?.name).toBe("Table2");
    });

    it("should handle errors", async () => {
      const errorResponse = createODataErrorResponse("500", "Internal Server Error");
      mockFetch.mockResolvedValueOnce(
        createMockResponse(errorResponse, 500),
      );

      await expect(adapter.getTables()).rejects.toThrow(FileMakerODataError);
    });
  });

  describe("getMetadata", () => {
    it("should return metadata", async () => {
      const mockMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="TestDatabase" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityContainer Name="Container">
        <EntitySet Name="Table1" EntityType="TestDatabase.Table1"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockMetadata, 200, {
          "Content-Type": "application/xml",
        }),
      );

      const result = await adapter.getMetadata();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("EntitySet");
    });
  });

  describe("getRecords", () => {
    it("should query records without filters", async () => {
      const mockData = createODataResponse([
        { id: "1", name: "Record 1" },
        { id: "2", name: "Record 2" },
      ]);

      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await adapter.getRecords("TestTable");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.value).toHaveLength(2);
    });

    it("should apply $filter query option", async () => {
      const mockData = createODataResponse([{ id: "1", name: "Filtered Record" }]);

      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await adapter.getRecords("TestTable", {
        $filter: "name eq 'Filtered Record'",
      });

      const callUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(callUrl).toContain("filter=name");
      // URL encoding: spaces can be + or %20, quotes are encoded
      // Check that filter parameter contains the value (encoded)
      expect(callUrl).toMatch(/Filtered[+%20]Record/);
      expect(result.value).toHaveLength(1);
    });

    it("should apply $top and $skip query options", async () => {
      const mockData = createODataResponse([{ id: "2", name: "Record 2" }]);

      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      await adapter.getRecords("TestTable", {
        $top: 10,
        $skip: 5,
      });

      const callUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(callUrl).toContain("top=10");
      expect(callUrl).toContain("skip=5");
    });

    it("should apply $select query option", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(createODataResponse([])));

      await adapter.getRecords("TestTable", {
        $select: "id,name",
      });

      const callUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(callUrl).toContain("select=");
      expect(callUrl).toContain("id");
      expect(callUrl).toContain("name");
    });

    it("should apply $orderby query option", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(createODataResponse([])));

      await adapter.getRecords("TestTable", {
        $orderby: "name desc",
      });

      const callUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(callUrl).toContain("orderby=");
      expect(callUrl).toContain("name");
      expect(callUrl).toContain("desc");
    });
  });

  describe("getRecord", () => {
    it("should get a single record by numeric key", async () => {
      const mockData = { id: "123", name: "Test Record" };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await adapter.getRecord("TestTable", 123);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/fmi/odata/v4/TestDatabase/TestTable(123)"),
        expect.any(Object),
      );
      expect(result.id).toBe("123");
      expect(result.name).toBe("Test Record");
    });

    it("should get a single record by string key", async () => {
      const mockData = { id: "abc", name: "Test Record" };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      await adapter.getRecord("TestTable", "abc");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/fmi/odata/v4/TestDatabase/TestTable(abc)"),
        expect.any(Object),
      );
    });

    it("should encode special characters in key", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ id: "test'key" }));

      await adapter.getRecord("TestTable", "test'key");

      const callUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(callUrl).toContain("test''key");
    });
  });

  describe("getRecordCount", () => {
    it("should return count of records", async () => {
      const mockData = {
        ...createODataResponse([]),
        "@odata.count": 42,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const count = await adapter.getRecordCount("TestTable");

      expect(count).toBe(42);
      const callUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(callUrl).toContain("count=true");
    });

    it("should apply filter when provided", async () => {
      const mockData = {
        ...createODataResponse([]),
        "@odata.count": 10,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      await adapter.getRecordCount("TestTable", {
        $filter: "status eq 'active'",
      });

      const callUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(callUrl).toContain("count=true");
      expect(callUrl).toContain("filter=");
    });
  });

  describe("getFieldValue", () => {
    it("should get field value from record", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse("field value", 200, {
          "Content-Type": "text/plain",
        }),
      );

      const value = await adapter.getFieldValue("TestTable", 123, "fieldName");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/fmi/odata/v4/TestDatabase/TestTable(123)/fieldName/$value"),
        expect.any(Object),
      );
      expect(value).toBe("field value");
    });
  });

  describe("createRecord", () => {
    it("should create a new record", async () => {
      const recordData = { name: "New Record", email: "test@example.com" };
      const mockResponse = { id: "999", ...recordData };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse, 201));

      const result = await adapter.createRecord("TestTable", {
        data: recordData,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/fmi/odata/v4/TestDatabase/TestTable"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(recordData),
        }),
      );
      expect((result as typeof mockResponse).id).toBe("999");
    });

    it("should include timeout in request", async () => {
      const recordData = { name: "New Record" };
      mockFetch.mockResolvedValueOnce(createMockResponse({ id: "999", ...recordData }));

      await adapter.createRecord("TestTable", {
        data: recordData,
        timeout: 5000,
      });

      const fetchCall = mockFetch.mock.calls[0];
      const requestInit = fetchCall[1] as RequestInit;
      expect(requestInit.signal).toBeDefined();
    });
  });

  describe("updateRecord", () => {
    it("should update an existing record", async () => {
      const updateData = { name: "Updated Record" };
      const mockResponse = { id: "123", ...updateData };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await adapter.updateRecord("TestTable", 123, {
        data: updateData,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/fmi/odata/v4/TestDatabase/TestTable(123)"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify(updateData),
        }),
      );
      expect(result.name).toBe("Updated Record");
    });
  });

  describe("deleteRecord", () => {
    it("should delete a record", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 204));

      await adapter.deleteRecord("TestTable", 123);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/fmi/odata/v4/TestDatabase/TestTable(123)"),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });
  });

  describe("navigateRelated", () => {
    it("should navigate to related records", async () => {
      const mockData = createODataResponse([
        { id: "1", name: "Related 1" },
        { id: "2", name: "Related 2" },
      ]);

      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await adapter.navigateRelated("TestTable", 123, "RelatedTable");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/fmi/odata/v4/TestDatabase/TestTable(123)/RelatedTable"),
        expect.any(Object),
      );
      expect(result.value).toHaveLength(2);
    });

    it("should apply query options to navigation", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(createODataResponse([])),
      );

      await adapter.navigateRelated("TestTable", 123, "RelatedTable", {
        $top: 5,
        $filter: "active eq true",
      });

      const callUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(callUrl).toContain("top=5");
      expect(callUrl).toContain("filter=");
    });
  });

  describe("crossJoin", () => {
    it("should perform cross-join query", async () => {
      const mockData = createODataResponse([
        { table1Field: "value1", table2Field: "value2" },
      ]);

      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await adapter.crossJoin(["Table1", "Table2"]);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/fmi/odata/v4/TestDatabase/CrossJoin(Table1,Table2)"),
        expect.any(Object),
      );
      expect(result.value).toBeDefined();
    });
  });

  describe("batchRequests", () => {
    it("should execute batch requests", async () => {
      const mockBatchResponse = {
        responses: [
          { id: "req-1", status: 200, body: { success: true } },
          { id: "req-2", status: 200, body: { success: true } },
        ],
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockBatchResponse));

      const results = await adapter.batchRequests({
        requests: [
          { method: "GET", url: "/Table1" },
          { method: "POST", url: "/Table2", body: { name: "test" } },
        ],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/fmi/odata/v4/TestDatabase/$batch"),
        expect.objectContaining({
          method: "POST",
        }),
      );
      expect(results).toHaveLength(2);
    });
  });

  describe("createTable", () => {
    it("should create a new table", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 201));

      await adapter.createTable({
        tableName: "NewTable",
        fields: [
          { name: "id", type: "String" },
          { name: "name", type: "String" },
        ],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/fmi/odata/v4/TestDatabase"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("NewTable"),
        }),
      );
    });
  });

  describe("addFields", () => {
    it("should add fields to existing table", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 200));

      await adapter.addFields("TestTable", {
        fields: [{ name: "newField", type: "String" }],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/fmi/odata/v4/TestDatabase/TestTable"),
        expect.objectContaining({
          method: "PATCH",
        }),
      );
    });
  });

  describe("deleteTable", () => {
    it("should delete a table", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 204));

      await adapter.deleteTable("TestTable");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/fmi/odata/v4/TestDatabase/TestTable"),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });
  });

  describe("deleteField", () => {
    it("should delete a field from table", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 204));

      await adapter.deleteField("TestTable", "fieldName");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/fmi/odata/v4/TestDatabase/TestTable/fieldName"),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });
  });

  describe("runScript", () => {
    it("should run a script", async () => {
      const mockResponse = { scriptResult: "success" };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await adapter.runScript("TestTable", {
        script: "MyScript",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/fmi/odata/v4/TestDatabase/TestTable"),
        expect.objectContaining({
          method: "POST",
        }),
      );
      const callUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(callUrl).toContain("script=MyScript");
      expect(result).toEqual(mockResponse);
    });

    it("should run a script with parameter", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ scriptResult: "success" }));

      await adapter.runScript("TestTable", {
        script: "MyScript",
        param: "paramValue",
      });

      const callUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(callUrl).toContain("script=MyScript");
      expect(callUrl).toContain("script.param=paramValue");
    });
  });

  describe("error handling", () => {
    it("should throw FileMakerODataError on API error", async () => {
      const errorResponse = createODataErrorResponse("404", "Record not found", "key");
      mockFetch.mockResolvedValueOnce(
        createMockResponse(errorResponse, 404),
      );

      await expect(adapter.getRecord("TestTable", 999)).rejects.toThrow(
        FileMakerODataError,
      );
    });

    it("should handle timeout errors", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";

      mockFetch.mockImplementationOnce(() => {
        return Promise.reject(abortError);
      });

      await expect(
        adapter.getRecords("TestTable", { timeout: 1000 }),
      ).rejects.toThrow();
    });

    it("should handle timeout correctly", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(createODataResponse([])),
      );

      await adapter.getRecords("TestTable", { timeout: 5000 });

      const fetchCall = mockFetch.mock.calls[0];
      const requestInit = fetchCall[1] as RequestInit;
      expect(requestInit.signal).toBeDefined();
    });
  });

  describe("authentication", () => {
    it("should include Basic Auth header", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(createODataResponse([])),
      );

      await adapter.getTables();

      const fetchCall = mockFetch.mock.calls[0];
      const requestInit = fetchCall[1] as RequestInit;
      const headers = requestInit.headers as Headers;
      const authHeader = headers.get("Authorization");

      expect(authHeader).toMatch(/^Basic /);
      // Basic auth is base64 of "testuser:testpass"
      expect(authHeader).toBe("Basic dGVzdHVzZXI6dGVzdHBhc3M=");
    });
  });

  describe("OData headers", () => {
    it("should include OData-Version headers", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(createODataResponse([])),
      );

      await adapter.getTables();

      const fetchCall = mockFetch.mock.calls[0];
      const requestInit = fetchCall[1] as RequestInit;
      const headers = requestInit.headers as Headers;

      expect(headers.get("OData-Version")).toBe("4.0");
      expect(headers.get("OData-MaxVersion")).toBe("4.0");
    });

    it("should include Accept header for JSON", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(createODataResponse([])),
      );

      await adapter.getRecords("TestTable");

      const fetchCall = mockFetch.mock.calls[0];
      const requestInit = fetchCall[1] as RequestInit;
      const headers = requestInit.headers as Headers;

      expect(headers.get("Accept")).toContain("application/json");
    });
  });

  describe("uploadContainer", () => {
    it("should throw error for deferred implementation", async () => {
      await expect(
        adapter.uploadContainer("TestTable", 123, "containerField", {
          data: "base64data",
        }),
      ).rejects.toThrow("Container upload not yet implemented");
    });
  });
});

