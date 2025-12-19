/**
 * Response Capture Script
 *
 * This script executes real queries against a live FileMaker OData server
 * and captures the responses for use in mock tests.
 *
 * This script uses ffetch directly (not our library) to ensure raw API
 * responses are captured without any transformations or processing.
 *
 * Setup:
 * - Ensure you have a `.env.local` file with:
 *   - FMODATA_SERVER_URL
 *   - FMODATA_API_KEY
 *   - FMODATA_DATABASE
 *
 * Usage:
 *   pnpm capture
 *
 * How to add new queries to capture:
 * 1. Add a new entry to the `queriesToCapture` array below
 * 2. Each entry should have:
 *    - name: A descriptive name (used as the key in the fixtures file)
 *    - execute: A function that calls the client with a relative path (e.g., "/contacts?$top=5")
 * 3. Run `pnpm capture`
 * 4. The captured response will be automatically added to tests/fixtures/responses.ts
 *
 * Query names should be descriptive and follow a pattern like:
 * - "list-basic" - Basic list query
 * - "list-with-select" - List with $select
 * - "filter-by-status" - List with $filter
 * - "single-by-id" - Single record query
 */

import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { writeFileSync } from "fs";
import createClient from "@fetchkit/ffetch";
import { MOCK_SERVER_URL } from "../tests/utils/mock-server-url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, "../.env.local") });

const serverUrl = process.env.FMODATA_SERVER_URL;
const apiKey = process.env.FMODATA_API_KEY;
const database = process.env.FMODATA_DATABASE;

if (!serverUrl) {
  throw new Error("FMODATA_SERVER_URL environment variable is required");
}

if (!apiKey) {
  throw new Error("FMODATA_API_KEY environment variable is required");
}

if (!database) {
  throw new Error("FMODATA_DATABASE environment variable is required");
}

// Type for captured response
type CapturedResponse = {
  url: string;
  method: string;
  status: number;
  headers?: {
    "content-type"?: string;
    location?: string;
  };
  response: any;
};

// Storage for captured responses - maps query name to response
const capturedResponses: Record<string, CapturedResponse> = {};

/**
 * Sanitizes URLs by replacing the actual server domain with the mock server URL
 * This ensures we don't store actual test server names in fixtures
 */
function sanitizeUrl(url: string, actualServerUrl: string): string {
  try {
    // Extract domain from serverUrl (handle both with and without protocol)
    const serverUrlObj = new URL(
      actualServerUrl.startsWith("http")
        ? actualServerUrl
        : `https://${actualServerUrl}`,
    );
    const actualDomain = serverUrlObj.hostname;

    // Replace all occurrences of the actual domain with the mock domain
    return url.replace(
      new RegExp(actualDomain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      MOCK_SERVER_URL,
    );
  } catch (e) {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Recursively sanitizes all URLs in a response object
 */
function sanitizeResponseData(data: any, actualServerUrl: string): any {
  if (typeof data === "string") {
    // Check if it's a URL and sanitize it
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
 * Extended RequestInit that allows any body type (will be JSON stringified if object)
 */
type ClientRequestInit = Omit<RequestInit, "body"> & {
  body?: any;
};

/**
 * Creates an ffetch client with Authorization header, baseUrl, and database configured
 */
function createAuthenticatedClient(
  baseUrl: string,
  database: string,
  apiKey: string,
) {
  const client = createClient();
  // Ensure baseUrl has no trailing slash
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
  // FileMaker OData API path: /otto/fmi/odata/v4/{database} when using API key auth
  const basePath = `${cleanBaseUrl}/otto/fmi/odata/v4/${encodeURIComponent(database)}`;
  return (path: string, init?: ClientRequestInit): Promise<Response> => {
    // Ensure path starts with /
    const fullPath = path.startsWith("/") ? path : `/${path}`;
    const fullUrl = `${basePath}${fullPath}`;

    // Merge headers, ensuring Authorization is always present
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      ...(init?.headers || {}),
    };

    // If body is an object, stringify it and set Content-Type
    let body: BodyInit | undefined = init?.body;
    if (body && typeof body === "object" && !(body instanceof FormData)) {
      body = JSON.stringify(body);
      if (!init?.headers || !("Content-Type" in init.headers)) {
        headers["Content-Type"] = "application/json";
      }
    }

    return client(fullUrl, {
      ...init,
      headers,
      body,
    });
  };
}

/**
 * Query definitions to capture
 *
 * Each query should:
 * - Have a descriptive name (used as the fixture key)
 * - Execute ffetch directly with the URL
 */
const queriesToCapture: {
  name: string;
  description: string;
  expectError?: boolean;
  execute: (
    client: ReturnType<typeof createAuthenticatedClient>,
  ) => Promise<{ url: string; response: Response }>;
}[] = [
  {
    name: "list-basic",
    description: "Basic list query without filters or options",
    execute: async (client) => {
      const path = "/contacts$top=10";
      const response = await client(path);
      // Get the full URL from the response
      const url = response.url;
      return { url, response };
    },
  },
  {
    name: "list-with-select",
    description: "List query with $select to limit fields",
    execute: async (client) => {
      const path = "/contacts?$select=name,PrimaryKey&$top=10";
      const response = await client(path);
      const url = response.url;
      return { url, response };
    },
  },
  {
    name: "list-with-orderby",
    description: "List query with $orderby for sorting",
    execute: async (client) => {
      const path = "/contacts?$orderby=name&$top=5";
      const response = await client(path);
      const url = response.url;
      return { url, response };
    },
  },
  {
    name: "list-with-pagination",
    description: "List query with $top and $skip for pagination",
    execute: async (client) => {
      const path = "/contacts?$top=2&$skip=2";
      const response = await client(path);
      const url = response.url;
      return { url, response };
    },
  },

  {
    name: "insert-return-minimal",
    description: "Insert query with return=minimal",
    execute: async (client) => {
      const path = "/contacts";
      const response = await client(path, {
        method: "POST",
        headers: {
          Prefer: "return=minimal",
        },
        body: {
          name: "Capture test (minimal)",
        },
      });
      const url = response.url;
      return { url, response };
    },
  },

  {
    name: "insert",
    description: "Insert query with return=representation (default)",
    execute: async (client) => {
      const path = "/contacts";
      const response = await client(path, {
        method: "POST",

        body: {
          name: "Capture test",
        },
      });

      const url = response.url;
      return { url, response };
    },
  },
  {
    name: "single-record",
    description: "Single record query using get()",
    execute: async (client) => {
      // First get a list to find an ID
      const listPath = "/contacts?$top=1";
      const listResponse = await client(listPath);

      // Check if response is JSON before parsing
      const contentType = listResponse.headers.get("content-type") || "";
      let listData: any = {};

      if (contentType.includes("application/json") && listResponse.ok) {
        try {
          listData = await listResponse.json();
        } catch (e) {
          // If JSON parsing fails, use fallback ID
        }
      }

      let recordId = "B5BFBC89-03E0-47FC-ABB6-D51401730227"; // fallback
      if (listData.value && listData.value.length > 0) {
        const firstId =
          listData.value[0].ContactID ||
          listData.value[0].id ||
          listData.value[0].PrimaryKey;
        if (firstId) {
          recordId = String(firstId);
        }
      }

      // OData requires GUIDs to be wrapped in single quotes
      const path = `/contacts('${recordId}')`;
      const response = await client(path);
      const url = response.url;
      return { url, response };
    },
  },
  // Error cases - intentionally invalid queries to capture error responses
  {
    name: "error-invalid-field-select",
    description: "Error response for invalid field in $select",
    expectError: true,
    execute: async (client) => {
      const path = "/contacts?$select=InvalidFieldName";
      const response = await client(path);
      const url = response.url;
      return { url, response };
    },
  },
  {
    name: "error-invalid-field-orderby",
    description: "Error response for invalid field in $orderby",
    expectError: true,
    execute: async (client) => {
      const path = "/contacts?$orderby=InvalidFieldName";
      const response = await client(path);
      const url = response.url;
      return { url, response };
    },
  },
  {
    name: "error-invalid-record-id",
    description: "Error response for invalid record ID in get()",
    expectError: true,
    execute: async (client) => {
      // OData requires GUIDs to be wrapped in single quotes
      const path = "/contacts('00000000-0000-0000-0000-000000000000')";
      const response = await client(path);
      const url = response.url;
      return { url, response };
    },
  },
  {
    name: "single-field",
    description: "Single field query using getSingleField()",
    execute: async (client) => {
      // OData requires GUIDs to be wrapped in single quotes
      const path = "/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')/name";
      const response = await client(path);
      const url = response.url;
      return { url, response };
    },
  },
  {
    name: "simple-navigation",
    description: "Simple navigation query",
    execute: async (client) => {
      // OData requires GUIDs to be wrapped in single quotes
      const path = "/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')/users";
      const response = await client(path);
      const url = response.url;
      return { url, response };
    },
  },
  {
    name: "list with invalid expand",
    description: "List query with expand to include related records",
    execute: async (client) => {
      const path = "/contacts?$expand=users($select=not_real_field)";
      const response = await client(path);
      const url = response.url;
      return { url, response };
    },
  },
  {
    name: "get with expand",
    description: "Get query with expand to include related records",
    execute: async (client) => {
      const path =
        "/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')?$expand=users";
      const response = await client(path);
      const url = response.url;
      return { url, response };
    },
  },
  {
    name: "deep nested expand",
    description: "Deep nested expand query",
    execute: async (client) => {
      const path =
        "/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')?$expand=users($expand=user_customer($select=name))";
      const response = await client(path);
      const url = response.url;
      return { url, response };
    },
  },
  {
    name: "list with nested expand",
    description: "List query with deeply nested expand and selected fields",
    execute: async (client) => {
      const path = `/contacts?$top=2&$expand=users($expand=user_customer($select=name))`;
      const response = await client(path);
      const url = response.url;
      return { url, response };
    },
  },
];

/**
 * Formats a JavaScript object as a TypeScript-compatible string with proper indentation
 */
function formatObject(obj: any, indent = 2): string {
  const spaces = " ".repeat(indent);
  if (obj === null) return "null";
  if (obj === undefined) return "undefined";
  if (typeof obj === "string") {
    // Escape quotes and newlines using JSON.stringify
    return JSON.stringify(obj);
  }
  if (typeof obj === "number" || typeof obj === "boolean") {
    return String(obj);
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    const items = obj
      .map((item) => `${spaces}${formatObject(item, indent + 2)},`)
      .join("\n");
    return `[\n${items}\n${" ".repeat(indent - 2)}]`;
  }
  if (typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length === 0) return "{}";
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
function generateResponsesFile(
  responses: Record<string, CapturedResponse>,
): string {
  const entries = Object.entries(responses)
    .map(([key, response]) => {
      const urlStr = JSON.stringify(response.url);
      const methodStr = JSON.stringify(response.method);
      const statusStr = response.status;
      const responseStr = formatObject(response.response);

      const headersLine = response.headers
        ? `\n    headers: ${formatObject(response.headers, 4)},`
        : "";

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
 * This file contains captured responses from real FileMaker OData API calls.
 * These responses are used by the mock fetch implementation to replay API responses
 * in tests without requiring a live server connection.
 *
 * Format:
 * - Each response is keyed by a descriptive query name
 * - Each response object contains:
 *   - url: The full request URL (for matching)
 *   - method: HTTP method (typically "GET")
 *   - status: Response status code
 *   - response: The actual response data (JSON-parsed)
 *
 * To add new mock responses:
 * 1. Add a query definition to scripts/capture-responses.ts
 * 2. Run: pnpm capture
 * 3. The captured response will be added to this file automatically
 *
 * You can manually edit responses here if you need to modify test data.
 */

export type MockResponse = {
  url: string;
  method: string;
  status: number;
  headers?: {
    "content-type"?: string;
    "location"?: string;
  };
  response: any;
};

export type MockResponses = Record<string, MockResponse>;

/**
 * Captured mock responses from FileMaker OData API
 *
 * These responses are used in tests by passing them to createMockFetch() at the
 * per-execution level. Each test explicitly declares which response it expects.
 */
export const mockResponses = {
${entries}
} satisfies MockResponses;
`;
}

async function main() {
  console.log("Starting response capture...\n");

  if (!database) {
    throw new Error("FMODATA_DATABASE environment variable is required");
  }
  if (!serverUrl) {
    throw new Error("FMODATA_SERVER_URL environment variable is required");
  }
  if (!apiKey) {
    throw new Error("FMODATA_API_KEY environment variable is required");
  }

  // Create authenticated client with baseUrl and database configured
  const client = createAuthenticatedClient(serverUrl, database, apiKey);

  // Execute each query and capture responses
  for (const queryDef of queriesToCapture) {
    try {
      console.log(`Capturing: ${queryDef.name} - ${queryDef.description}`);

      // Execute the query directly with ffetch
      const { url, response } = await queryDef.execute(client);

      // Capture the response data (even for error status codes)
      const status = response.status;
      const contentType = response.headers.get("content-type") || "";
      const location = response.headers.get("location") || undefined;
      let responseData: any;

      if (contentType.includes("application/json")) {
        try {
          // Clone response to read without consuming
          const clonedResponse = response.clone();
          responseData = await clonedResponse.json();
        } catch (e) {
          responseData = null;
        }
      } else {
        const clonedResponse = response.clone();
        responseData = await clonedResponse.text();
      }

      // Sanitize URLs before storing
      const sanitizedUrl = sanitizeUrl(url, serverUrl);
      const sanitizedResponse = sanitizeResponseData(responseData, serverUrl);

      // Store captured response (including error responses)
      capturedResponses[queryDef.name] = {
        url: sanitizedUrl,
        method: "GET",
        status,
        headers:
          contentType || location
            ? {
                ...(contentType && { "content-type": contentType }),
                ...(location && { location }),
              }
            : undefined,
        response: sanitizedResponse,
      };

      if (status >= 400 && !queryDef.expectError) {
        console.log(
          `  ⚠ Captured error response for ${queryDef.name} (status: ${status})`,
        );
      } else {
        console.log(`  ✓ Captured response for ${queryDef.name}`);
      }
    } catch (error) {
      // Only log errors if they're not expected
      if (!queryDef.expectError) {
        console.error(`  ✗ Failed to capture ${queryDef.name}:`, error);
        if (error instanceof Error) {
          console.error(`    ${error.message}`);
        }
      } else {
        // For expected errors, try to capture the error response
        // ffetch might throw, but we can check if we got a response
        if (error && typeof error === "object" && "response" in error) {
          const errorResponse = (error as any).response;
          if (errorResponse) {
            const url = errorResponse.url || "";
            const status = errorResponse.status || 500;
            const contentType =
              errorResponse.headers?.get("content-type") || "";
            const location =
              errorResponse.headers?.get("location") || undefined;
            let responseData: any;

            try {
              const clonedResponse = errorResponse.clone();
              if (contentType.includes("application/json")) {
                responseData = await clonedResponse.json();
              } else {
                responseData = await clonedResponse.text();
              }
            } catch (e) {
              responseData = null;
            }

            // Sanitize URLs before storing
            const sanitizedUrl = sanitizeUrl(url, serverUrl);
            const sanitizedResponse = sanitizeResponseData(
              responseData,
              serverUrl,
            );

            capturedResponses[queryDef.name] = {
              url: sanitizedUrl,
              method: "GET",
              status,
              headers:
                contentType || location
                  ? {
                      ...(contentType && { "content-type": contentType }),
                      ...(location && { location }),
                    }
                  : undefined,
              response: sanitizedResponse,
            };
            console.log(`  ✓ Captured error response for ${queryDef.name}`);
          } else {
            console.warn(
              `  ⚠ Expected error for ${queryDef.name} but response was not captured`,
            );
          }
        } else {
          console.warn(
            `  ⚠ Expected error for ${queryDef.name} but response was not captured`,
          );
        }
      }
    }
  }

  console.log("\nCapture complete!");
  console.log(`Captured ${Object.keys(capturedResponses).length} responses`);

  if (Object.keys(capturedResponses).length === 0) {
    console.warn(
      "Warning: No responses were captured. Check your queries and server connection.",
    );
    return;
  }

  // Generate and write the responses file
  const fixturesPath = path.resolve(
    __dirname,
    "../tests/fixtures/responses.ts",
  );
  const fileContent = generateResponsesFile(capturedResponses);
  writeFileSync(fixturesPath, fileContent, "utf-8");

  console.log(`\nResponses written to: ${fixturesPath}`);
  console.log("\nYou can now use these mocks in your tests!");
}

main().catch((error) => {
  console.error("Capture script failed:", error);
  process.exit(1);
});
