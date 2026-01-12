/**
 * Mock Response Fixtures
 *
 * This file contains captured responses from real FileMaker Data API calls.
 * These responses are used by the mock fetch implementation to replay API responses
 * in tests without requiring a live server connection.
 *
 * Format:
 * - Each response is keyed by a descriptive query name
 * - Each response object contains:
 *   - url: The full request URL (for reference)
 *   - method: HTTP method
 *   - status: Response status code
 *   - response: The actual response data (JSON-parsed)
 *
 * To add new mock responses:
 * 1. Add a query definition to scripts/capture-responses.ts
 * 2. Run: pnpm capture
 * 3. The captured response will be added to this file automatically
 *
 * NOTE: This file contains placeholder responses. Run `pnpm capture` to populate
 * with real API responses from your FileMaker server.
 */

export interface MockResponse {
  url: string;
  method: string;
  status: number;
  headers?: {
    "content-type"?: string;
  };
  // biome-ignore lint/suspicious/noExplicitAny: FM API responses vary by endpoint
  response: any;
}

export type MockResponses = Record<string, MockResponse>;

/**
 * Helper to create FM Data API response envelope
 */
function fmResponse(data: unknown[], foundCount?: number) {
  const count = foundCount ?? data.length;
  return {
    messages: [{ code: "0", message: "OK" }],
    response: {
      data,
      dataInfo: {
        database: "test",
        layout: "layout",
        table: "layout",
        totalRecordCount: count,
        foundCount: count,
        returnedCount: data.length,
      },
    },
  };
}

/**
 * Helper to create FM record format
 */
function fmRecord(recordId: number, fieldData: Record<string, unknown>, portalData: Record<string, unknown[]> = {}) {
  return {
    recordId: String(recordId),
    modId: "1",
    fieldData,
    portalData: Object.fromEntries(
      Object.entries(portalData).map(([name, records]) => [
        name,
        records.map((r, i) => ({ ...r, recordId: String(i + 1), modId: "1" })),
      ]),
    ),
  };
}

/**
 * Captured mock responses from FileMaker Data API
 *
 * These are placeholder responses. Run `pnpm capture` to populate with real data.
 */
export const mockResponses = {
  "list-basic": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/layout/records",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: fmResponse([
      fmRecord(1, { recordId: "1", anything: "anything" }, { test: [{ "related::related_field": "value1" }] }),
      fmRecord(2, { recordId: "2", anything: "anything" }, { test: [{ "related::related_field": "value2" }] }),
      fmRecord(3, { recordId: "3", anything: "unique" }, { test: [{ "related::related_field": "value3" }] }),
    ]),
  },

  "list-with-limit": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/layout/records?_limit=1",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: fmResponse(
      [fmRecord(1, { recordId: "1", anything: "anything" }, { test: [{ "related::related_field": "value1" }] })],
      3,
    ),
  },

  "list-sorted-descend": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/layout/records",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: fmResponse([
      fmRecord(3, { recordId: "3", anything: "unique" }),
      fmRecord(2, { recordId: "2", anything: "anything" }),
      fmRecord(1, { recordId: "1", anything: "anything" }),
    ]),
  },

  "list-sorted-ascend": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/layout/records",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: fmResponse([
      fmRecord(1, { recordId: "1", anything: "anything" }),
      fmRecord(2, { recordId: "2", anything: "anything" }),
      fmRecord(3, { recordId: "3", anything: "unique" }),
    ]),
  },

  "list-with-portal-data": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/layout/records?_limit=1",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: fmResponse([
      fmRecord(
        1,
        { recordId: "1", anything: "anything" },
        {
          test: Array.from({ length: 50 }, (_, i) => ({
            "related::related_field": `value${i + 1}`,
          })),
        },
      ),
    ]),
  },

  "list-with-portal-ranges": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/layout/records?_limit=1&_limit.test=1&_offset.test=2",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: fmResponse([
      fmRecord(1, { recordId: "1", anything: "anything" }, { test: [{ "related::related_field": "value2" }] }),
    ]),
  },

  "find-basic": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/layout/_find",
    method: "POST",
    status: 200,
    headers: { "content-type": "application/json" },
    response: fmResponse([
      fmRecord(1, { recordId: "1", anything: "anything" }),
      fmRecord(2, { recordId: "2", anything: "anything" }),
    ]),
  },

  "find-unique": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/layout/_find",
    method: "POST",
    status: 200,
    headers: { "content-type": "application/json" },
    response: fmResponse([fmRecord(3, { recordId: "3", anything: "unique" })]),
  },

  "find-no-results": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/layout/_find",
    method: "POST",
    status: 400,
    headers: { "content-type": "application/json" },
    response: {
      messages: [{ code: "401", message: "No records match the request" }],
      response: {},
    },
  },

  "get-record": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/layout/records/1",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: fmResponse([fmRecord(1, { recordId: "1", anything: "anything" })]),
  },

  "layout-metadata": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/layout",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: {
      messages: [{ code: "0", message: "OK" }],
      response: {
        fieldMetaData: [
          { name: "recordId", type: "normal", displayType: "editText", result: "text" },
          { name: "anything", type: "normal", displayType: "editText", result: "text" },
        ],
        portalMetaData: {
          test: [{ name: "related::related_field", type: "normal", displayType: "editText", result: "text" }],
        },
      },
    },
  },

  "all-layouts": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: {
      messages: [{ code: "0", message: "OK" }],
      response: {
        layouts: [
          { name: "layout" },
          { name: "customer" },
          { isFolder: true, folderLayoutNames: [{ name: "nested_layout" }] },
        ],
      },
    },
  },

  "all-scripts": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/scripts",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: {
      messages: [{ code: "0", message: "OK" }],
      response: {
        scripts: [
          { name: "script" },
          { isFolder: true, folderScriptNames: [{ name: "nested_script" }] },
          { name: "script2" },
        ],
      },
    },
  },

  "execute-script": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/layout/script/script",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: {
      messages: [{ code: "0", message: "OK" }],
      response: {
        scriptResult: "result",
        scriptError: "0",
      },
    },
  },

  "error-missing-layout": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/not_a_layout/records",
    method: "GET",
    status: 500,
    headers: { "content-type": "application/json" },
    response: {
      messages: [{ code: "105", message: "Layout is missing" }],
      response: {},
    },
  },

  "update-success": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/layout/records/1",
    method: "PATCH",
    status: 200,
    headers: { "content-type": "application/json" },
    response: {
      messages: [{ code: "0", message: "OK" }],
      response: {
        modId: "2",
      },
    },
  },

  "create-success": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/layout/records",
    method: "POST",
    status: 200,
    headers: { "content-type": "application/json" },
    response: {
      messages: [{ code: "0", message: "OK" }],
      response: {
        recordId: "4",
        modId: "1",
      },
    },
  },

  "delete-success": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/layout/records/1",
    method: "DELETE",
    status: 200,
    headers: { "content-type": "application/json" },
    response: {
      messages: [{ code: "0", message: "OK" }],
      response: {},
    },
  },

  "container-upload-success": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/container/records/1/containers/myContainer",
    method: "POST",
    status: 200,
    headers: { "content-type": "application/json" },
    response: {
      messages: [{ code: "0", message: "OK" }],
      response: {
        modId: "2",
      },
    },
  },

  "customer-list": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/customer/records",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: fmResponse([
      fmRecord(1, { name: "John", phone: "555-1234" }, { PortalTable: [{ "related::related_field": "portal1" }] }),
      fmRecord(2, { name: "Jane", phone: "555-5678" }, { PortalTable: [{ "related::related_field": "portal2" }] }),
    ]),
  },

  "customer-find": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/customer/_find",
    method: "POST",
    status: 200,
    headers: { "content-type": "application/json" },
    response: fmResponse([
      fmRecord(1, { name: "test", phone: "555-1234" }, { PortalTable: [{ "related::related_field": "portal1" }] }),
    ]),
  },

  "customer-fields-missing": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/customer_fieldsMissing/records",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: fmResponse([fmRecord(1, { name: "John" })]), // missing phone field
  },

  "layout-transformation": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/layout/records",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: fmResponse([
      fmRecord(
        1,
        { booleanField: "1", CreationTimestamp: "01/01/2024 12:00:00" },
        {
          test: [
            { "related::related_field": "value1", "related::recordId": 100 },
            { "related::related_field": "value2", "related::recordId": 200 },
          ],
        },
      ),
    ]),
  },

  "weird-portals-list": {
    url: "https://api.example.com/otto/fmi/data/vLatest/databases/test/layouts/Weird%20Portals/records",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: fmResponse([
      fmRecord(
        1,
        { recordId: "1" },
        {
          "long_and_strange.portalName#forTesting": Array.from({ length: 60 }, (_, i) => ({
            "related::field": `value${i + 1}`,
          })),
        },
      ),
    ]),
  },
} satisfies MockResponses;
