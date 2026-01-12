/**
 * Response Capture Script
 *
 * This script executes real queries against a live FileMaker Data API server
 * and captures the responses for use in mock tests.
 *
 * This script uses native fetch directly (not our library) to ensure raw API
 * responses are captured without any transformations or processing.
 *
 * Setup:
 * - Ensure you have environment variables set (via doppler or .env):
 *   - FM_SERVER
 *   - FM_DATABASE
 *   - OTTO_API_KEY (dk_* or KEY_* format)
 *
 * Usage:
 *   pnpm capture
 *
 * How to add new queries to capture:
 * 1. Add a new entry to the `queriesToCapture` array below
 * 2. Each entry should have:
 *    - name: A descriptive name (used as the key in the fixtures file)
 *    - execute: A function that makes the API call
 * 3. Run `pnpm capture`
 * 4. The captured response will be automatically added to tests/fixtures/responses.ts
 *
 * Query names should be descriptive and follow a pattern like:
 * - "list-basic" - Basic list query
 * - "list-with-limit" - List with limit param
 * - "find-basic" - Basic find query
 * - "error-missing-layout" - Error response for missing layout
 */
/** biome-ignore-all lint/suspicious/noExplicitAny: Just a dev script */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

import { MOCK_SERVER_URL } from "../tests/utils/mock-server-url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, "../.env.local") });

const server = process.env.FM_SERVER;
const database = process.env.FM_DATABASE;
const apiKey = process.env.OTTO_API_KEY;

if (!server) {
  throw new Error("FM_SERVER environment variable is required");
}

if (!database) {
  throw new Error("FM_DATABASE environment variable is required");
}

if (!apiKey) {
  throw new Error("OTTO_API_KEY environment variable is required");
}

// Type for captured response
interface CapturedResponse {
  url: string;
  method: string;
  status: number;
  headers?: {
    "content-type"?: string;
  };
  response: any;
}

// Storage for captured responses - maps query name to response
const capturedResponses: Record<string, CapturedResponse> = {};

/**
 * Build base URL for FileMaker Data API based on API key type
 */
function buildBaseUrl(serverUrl: string, db: string, key: string): string {
  // Ensure server has https
  const cleanServer = serverUrl.startsWith("http") ? serverUrl : `https://${serverUrl}`;

  if (key.startsWith("dk_")) {
    // OttoFMS uses /otto prefix
    return `${cleanServer}/otto/fmi/data/vLatest/databases/${encodeURIComponent(db)}`;
  }
  if (key.startsWith("KEY_")) {
    // Otto v3 uses port 3030
    const url = new URL(cleanServer);
    url.port = "3030";
    return `${url.origin}/fmi/data/vLatest/databases/${encodeURIComponent(db)}`;
  }
  // Default FM Data API
  return `${cleanServer}/fmi/data/vLatest/databases/${encodeURIComponent(db)}`;
}

/**
 * Sanitizes URLs by replacing the actual server domain with the mock server URL
 */
function sanitizeUrl(url: string, actualServerUrl: string): string {
  try {
    const serverUrlObj = new URL(actualServerUrl.startsWith("http") ? actualServerUrl : `https://${actualServerUrl}`);
    const actualDomain = serverUrlObj.hostname;
    return url.replace(new RegExp(actualDomain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), MOCK_SERVER_URL);
  } catch {
    return url;
  }
}

/**
 * Recursively sanitizes all URLs in a response object
 */
function sanitizeResponseData(data: any, actualServerUrl: string): any {
  if (typeof data === "string") {
    if (data.startsWith("http://") || data.startsWith("https://")) {
      return sanitizeUrl(data, actualServerUrl);
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeResponseData(item, actualServerUrl));
  }

  if (data && typeof data === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeResponseData(value, actualServerUrl);
    }
    return sanitized;
  }

  return data;
}

/**
 * Creates a fetch wrapper with authorization header
 */
function createAuthenticatedFetch(baseUrl: string, key: string) {
  return async (
    path: string,
    init?: RequestInit & { body?: any },
  ): Promise<{ url: string; method: string; response: Response }> => {
    const fullPath = path.startsWith("/") ? path : `/${path}`;
    const fullUrl = `${baseUrl}${fullPath}`;

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${key}`);
    if (init?.body && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    let body: string | FormData | undefined;
    if (init?.body instanceof FormData) {
      body = init.body;
    } else if (init?.body) {
      body = JSON.stringify(init.body);
    }

    const response = await fetch(fullUrl, {
      ...init,
      headers,
      body,
    });

    return { url: fullUrl, method: init?.method ?? "GET", response };
  };
}

/**
 * Query definitions to capture
 */
const queriesToCapture: {
  name: string;
  description: string;
  expectError?: boolean;
  execute: (
    apiFetch: ReturnType<typeof createAuthenticatedFetch>,
  ) => Promise<{ url: string; method: string; response: Response }>;
}[] = [
  {
    name: "list-basic",
    description: "Basic list query without params",
    execute: (apiFetch) => apiFetch("/layouts/layout/records"),
  },
  {
    name: "list-with-limit",
    description: "List query with _limit parameter",
    execute: (apiFetch) => apiFetch("/layouts/layout/records?_limit=1"),
  },
  {
    name: "list-with-offset",
    description: "List query with _limit and _offset",
    execute: (apiFetch) => apiFetch("/layouts/layout/records?_limit=1&_offset=2"),
  },
  {
    name: "list-with-sort-descend",
    description: "List query with sort descending",
    execute: (apiFetch) => {
      const sort = JSON.stringify([{ fieldName: "recordId", sortOrder: "descend" }]);
      return apiFetch(`/layouts/layout/records?_sort=${encodeURIComponent(sort)}`);
    },
  },
  {
    name: "list-with-sort-ascend",
    description: "List query with sort ascending (default)",
    execute: (apiFetch) => {
      const sort = JSON.stringify([{ fieldName: "recordId" }]);
      return apiFetch(`/layouts/layout/records?_sort=${encodeURIComponent(sort)}`);
    },
  },
  {
    name: "list-with-portals",
    description: "List query that includes portal data",
    execute: (apiFetch) => apiFetch("/layouts/layout/records?_limit=1"),
  },
  {
    name: "list-with-portal-ranges",
    description: "List query with portal limit and offset",
    execute: (apiFetch) => apiFetch("/layouts/layout/records?_limit=1&_limit.test=1&_offset.test=2"),
  },
  {
    name: "find-basic",
    description: "Basic find query",
    execute: (apiFetch) =>
      apiFetch("/layouts/layout/_find", {
        method: "POST",
        body: { query: [{ anything: "anything" }] },
      }),
  },
  {
    name: "find-unique",
    description: "Find query returning single record",
    execute: (apiFetch) =>
      apiFetch("/layouts/layout/_find", {
        method: "POST",
        body: { query: [{ anything: "unique" }] },
      }),
  },
  {
    name: "find-with-omit",
    description: "Find query with omit",
    execute: (apiFetch) =>
      apiFetch("/layouts/layout/_find", {
        method: "POST",
        body: { query: [{ anything: "anything", omit: "true" }] },
      }),
  },
  {
    name: "find-no-results",
    description: "Find query with no results (error 401)",
    expectError: true,
    execute: (apiFetch) =>
      apiFetch("/layouts/layout/_find", {
        method: "POST",
        body: { query: [{ anything: "DOES_NOT_EXIST_12345" }] },
      }),
  },
  {
    name: "get-record",
    description: "Get single record by ID",
    execute: async (apiFetch) => {
      // First get a record ID from list
      const listResult = await apiFetch("/layouts/layout/records?_limit=1");
      const listData = await listResult.response.clone().json();
      const recordId = listData.response?.data?.[0]?.recordId ?? "1";
      return apiFetch(`/layouts/layout/records/${recordId}`);
    },
  },
  {
    name: "layout-metadata",
    description: "Get layout metadata",
    execute: (apiFetch) => apiFetch("/layouts/layout"),
  },
  {
    name: "all-layouts",
    description: "Get all layouts metadata",
    execute: (apiFetch) => apiFetch("/layouts"),
  },
  {
    name: "all-scripts",
    description: "Get all scripts metadata",
    execute: (apiFetch) => apiFetch("/scripts"),
  },
  {
    name: "execute-script",
    description: "Execute a script with parameter",
    execute: (apiFetch) => {
      const param = encodeURIComponent(JSON.stringify({ hello: "world" }));
      return apiFetch(`/layouts/layout/script/script?script.param=${param}`);
    },
  },
  {
    name: "error-missing-layout",
    description: "Error response for missing layout",
    expectError: true,
    execute: (apiFetch) => apiFetch("/layouts/not_a_layout/records"),
  },
  {
    name: "customer-list",
    description: "List from customer layout (for zod tests)",
    execute: (apiFetch) => apiFetch("/layouts/customer/records?_limit=5"),
  },
  {
    name: "customer-find",
    description: "Find from customer layout",
    execute: (apiFetch) =>
      apiFetch("/layouts/customer/_find", {
        method: "POST",
        body: { query: [{ name: "test" }] },
      }),
  },
  {
    name: "weird-portals-list",
    description: "List from Weird Portals layout",
    execute: (apiFetch) => {
      const portalName = encodeURIComponent("long_and_strange.portalName#forTesting");
      return apiFetch(`/layouts/Weird%20Portals/records?_limit=1&_limit.${portalName}=100`);
    },
  },
];

/**
 * Formats a JavaScript object as a TypeScript-compatible string with proper indentation
 */
function formatObject(obj: any, indent = 2): string {
  const spaces = " ".repeat(indent);
  if (obj === null) {
    return "null";
  }
  if (obj === undefined) {
    return "undefined";
  }
  if (typeof obj === "string") {
    return JSON.stringify(obj);
  }
  if (typeof obj === "number" || typeof obj === "boolean") {
    return String(obj);
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return "[]";
    }
    const items = obj.map((item) => `${spaces}${formatObject(item, indent + 2)},`).join("\n");
    return `[\n${items}\n${" ".repeat(indent - 2)}]`;
  }
  if (typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return "{}";
    }
    const entries = keys
      .map((key) => {
        const value = formatObject(obj[key], indent + 2);
        return `${spaces}${JSON.stringify(key)}: ${value}`;
      })
      .join(",\n");
    return `{\n${entries}\n${" ".repeat(indent - 2)}}`;
  }
  return String(obj);
}

/**
 * Generates TypeScript code for the responses file
 */
function generateResponsesFile(responses: Record<string, CapturedResponse>): string {
  const entries = Object.entries(responses)
    .map(([key, response]) => {
      const urlStr = JSON.stringify(response.url);
      const methodStr = JSON.stringify(response.method);
      const statusStr = response.status;
      const responseStr = formatObject(response.response);

      const headersLine = response.headers ? `\n    headers: ${formatObject(response.headers, 4)},` : "";

      return `  "${key}": {
    url: ${urlStr},
    method: ${methodStr},
    status: ${statusStr},${headersLine}
    response: ${responseStr},
  },`;
    })
    .join("\n\n");

  return `/**
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
 *   - response: The actual response data (JSON-parsed, unwrapped from FM envelope)
 *
 * To add new mock responses:
 * 1. Add a query definition to scripts/capture-responses.ts
 * 2. Run: pnpm capture
 * 3. The captured response will be added to this file automatically
 *
 * You MUST NOT manually edit this file. Any changes will be overwritten by the capture script.
 */

export type MockResponse = {
  url: string;
  method: string;
  status: number;
  headers?: {
    "content-type"?: string;
  };
  response: any;
};

export type MockResponses = Record<string, MockResponse>;

/**
 * Captured mock responses from FileMaker Data API
 *
 * These responses are used in tests by passing them to createMockFetch().
 * Each test explicitly declares which response it expects.
 */
export const mockResponses = {
${entries}
} satisfies MockResponses;
`;
}

async function main() {
  console.log("Starting response capture...\n");

  if (!(database && server && apiKey)) {
    throw new Error("Required environment variables not set");
  }

  const baseUrl = buildBaseUrl(server, database, apiKey);
  const apiFetch = createAuthenticatedFetch(baseUrl, apiKey);

  // Execute each query and capture responses
  for (const queryDef of queriesToCapture) {
    try {
      console.log(`Capturing: ${queryDef.name} - ${queryDef.description}`);

      const { url, method, response } = await queryDef.execute(apiFetch);

      const status = response.status;
      const contentType = response.headers.get("content-type") || "";
      let responseData: any;

      if (contentType.includes("application/json")) {
        try {
          const clonedResponse = response.clone();
          responseData = await clonedResponse.json();
        } catch {
          responseData = null;
        }
      } else {
        const clonedResponse = response.clone();
        responseData = await clonedResponse.text();
      }

      // Sanitize URLs before storing
      const sanitizedUrl = sanitizeUrl(url, server);
      const sanitizedResponse = sanitizeResponseData(responseData, server);

      capturedResponses[queryDef.name] = {
        url: sanitizedUrl,
        method,
        status,
        headers: contentType
          ? {
              "content-type": contentType,
            }
          : undefined,
        response: sanitizedResponse,
      };

      if (status >= 400 && !queryDef.expectError) {
        console.log(`  Warning: Captured error response for ${queryDef.name} (status: ${status})`);
      } else {
        console.log(`  Captured: ${queryDef.name}`);
      }
    } catch (error) {
      console.error(`  Failed: ${queryDef.name}:`, error);
      if (error instanceof Error) {
        console.error(`    ${error.message}`);
      }
    }
  }

  console.log("\nCapture complete!");
  console.log(`Captured ${Object.keys(capturedResponses).length} responses`);

  if (Object.keys(capturedResponses).length === 0) {
    console.warn("Warning: No responses were captured. Check your queries and server connection.");
    return;
  }

  // Generate and write the responses file
  const fixturesPath = path.resolve(__dirname, "../tests/fixtures/responses.ts");
  const fileContent = generateResponsesFile(capturedResponses);

  writeFileSync(fixturesPath, fileContent, "utf-8");

  console.log(`\nResponses written to: ${fixturesPath}`);
  console.log("\nYou can now use these mocks in your tests!");
}

main().catch((error) => {
  console.error("Capture script failed:", error);
  process.exit(1);
});
