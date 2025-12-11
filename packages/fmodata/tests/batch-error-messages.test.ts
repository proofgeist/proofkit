/**
 * Batch Error Messages Test
 *
 * This test demonstrates that batch operations now properly parse and return
 * FileMaker error responses instead of vague validation errors.
 *
 * BEFORE: "Invalid response structure: expected 'value' property to be an array"
 * AFTER: "OData error: Table 'Purchase_Orders' not defined in database" with code "-1020"
 */

import { describe, it, expect } from "vitest";
import { z } from "zod/v4";
import {
  defineBaseTable,
  defineTableOccurrence,
  buildOccurrences,
  isODataError,
  isResponseStructureError,
} from "../src/index";
import { createMockClient } from "./utils/test-setup";

/**
 * Creates a mock fetch handler that returns a multipart batch response
 */
function createBatchMockFetch(batchResponseBody: string): typeof fetch {
  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    // Extract boundary from the batch response body (first line starts with --)
    const firstLine =
      batchResponseBody.split("\r\n")[0] ||
      batchResponseBody.split("\n")[0] ||
      "";
    const boundary = firstLine.startsWith("--")
      ? firstLine.substring(2)
      : "batch_test";

    return new Response(batchResponseBody, {
      status: 200,
      statusText: "OK",
      headers: {
        "Content-Type": `multipart/mixed; boundary=${boundary}`,
      },
    });
  };
}

describe("Batch Error Messages - Improved Error Parsing", () => {
  const client = createMockClient();

  // Define simple schemas for batch testing
  const addressesBase = defineBaseTable({
    schema: {
      id: z.string(),
      street: z.string().nullable(),
    },
    idField: "id",
  });

  const _addressesTO = defineTableOccurrence({
    name: "addresses",
    baseTable: addressesBase,
  });

  const [addressesTO] = buildOccurrences({
    occurrences: [_addressesTO],
    navigation: {},
  });

  const db = client.database("test_db", {
    occurrences: [addressesTO],
  });

  it("should return ODataError with helpful message instead of vague ResponseStructureError", async () => {
    // This simulates the exact scenario from the user's error:
    // A batch with multiple queries where one uses a bad table name
    const mockBatchResponse = [
      "--batch_boundary",
      "Content-Type: application/http",
      "",
      "HTTP/1.1 200 Ok",
      "Content-Type: application/json;charset=utf-8",
      "",
      JSON.stringify({
        "@odata.context": "test/$metadata#addresses",
        value: [
          {
            "@odata.id": "addresses('addr-1')",
            id: "addr-1",
            street: "123 Main St",
          },
        ],
      }),
      "--batch_boundary",
      "Content-Type: application/http",
      "",
      "HTTP/1.1 404 Not Found",
      "Content-Type: application/json;charset=utf-8",
      "",
      JSON.stringify({
        error: {
          code: "-1020",
          message: "Table 'Purchase_Orders' not defined in database",
        },
      }),
      "--batch_boundary",
      "Content-Type: application/http",
      "",
      "HTTP/1.1 200 Ok",
      "Content-Type: application/json;charset=utf-8",
      "",
      JSON.stringify({
        "@odata.context": "test/$metadata#addresses",
        value: [],
      }),
      "--batch_boundary--",
    ].join("\r\n");

    // Create three queries (simulating user's punchlistQuery, purchaseOrdersQuery, ticketsQuery)
    const query1 = db.from("addresses").list();
    const query2 = db.from("addresses").list(); // Will fail with 404 in mock
    const query3 = db.from("addresses").list();

    // Execute batch with mock
    const result = await db.batch([query1, query2, query3]).execute({
      fetchHandler: createBatchMockFetch(mockBatchResponse),
    });

    // Verify we got results
    expect(result.results).toBeDefined();
    expect(result.results.length).toBe(3);

    const [r1, r2, r3] = result.results;

    // First query succeeded
    expect(r1.error).toBeUndefined();
    expect(r1.data).toBeDefined();

    // Second query failed with a HELPFUL error message
    expect(r2.error).toBeDefined();
    expect(r2.data).toBeUndefined();

    // ✅ BEFORE: This would be ResponseStructureError with vague message
    // ✅ AFTER: This is now ODataError with the actual FileMaker error
    expect(isResponseStructureError(r2.error)).toBe(false); // NOT a validation error
    expect(isODataError(r2.error)).toBe(true); // IS an OData error

    if (isODataError(r2.error)) {
      // The error now contains the actual FileMaker error details
      expect(r2.error.code).toBe("-1020");
      expect(r2.error.message).toContain("Table 'Purchase_Orders' not defined");
      expect(r2.error.kind).toBe("ODataError");

      // The error message is now helpful instead of:
      // "Invalid response structure: expected 'value' property to be an array"
      console.log("\n✅ Fixed Error Message:");
      console.log(`   Code: ${r2.error.code}`);
      console.log(`   Message: ${r2.error.message}`);
      console.log(`   Kind: ${r2.error.kind}\n`);
    }

    // Third query succeeded (not truncated in this mock)
    expect(r3.error).toBeUndefined();
    expect(r3.data).toBeDefined();
  });

  it("should handle error when table doesn't exist - the original use case", async () => {
    // This is the exact scenario from the user's error message:
    // They're querying a table that doesn't exist (Purchase_Orders with underscore instead of space)
    const mockBatchResponse = [
      "--batch_boundary",
      "Content-Type: application/http",
      "",
      "HTTP/1.1 404 Not Found",
      "Content-Type: application/json;charset=utf-8",
      "",
      JSON.stringify({
        error: {
          code: "-1020",
          message: "Table 'Purchase_Orders' not defined in database",
        },
      }),
      "--batch_boundary--",
    ].join("\r\n");

    const badQuery = db.from("addresses").list();

    const result = await db.batch([badQuery]).execute({
      fetchHandler: createBatchMockFetch(mockBatchResponse),
    });

    const [r1] = result.results;

    // Error should be an ODataError, not ResponseStructureError
    expect(r1.error).toBeDefined();
    expect(isODataError(r1.error)).toBe(true);

    if (isODataError(r1.error)) {
      // Verify we get the actual FileMaker error code and message
      expect(r1.error.code).toBe("-1020");
      expect(r1.error.message).toBe(
        "OData error: Table 'Purchase_Orders' not defined in database",
      );

      // This is much more helpful than:
      // "Invalid response structure: expected 'value' property to be an array"
    }
  });
});

