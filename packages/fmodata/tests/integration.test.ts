import { describe, it, expect, beforeAll } from "vitest";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { ODataApi, FetchAdapter, OttoAdapter, isOttoAPIKey } from "../src/index.js";

// Load .env file from workspace root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootEnvPath = resolve(__dirname, "../../..", ".env");
const rootEnvLocalPath = resolve(__dirname, "../../..", ".env.local");

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: rootEnvLocalPath });

// Helper to log requests/responses
function logRequest(method: string, url: string, options?: RequestInit) {
  console.log("\n=== REQUEST ===");
  console.log(`Method: ${method}`);
  console.log(`URL: ${url}`);
  if (options?.headers) {
    const headersObj: Record<string, string> = {};
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        // Mask sensitive headers
        if (key.toLowerCase() === "authorization") {
          headersObj[key] = value.substring(0, 20) + "...";
        } else {
          headersObj[key] = value;
        }
      });
    } else if (Array.isArray(options.headers)) {
      // Headers array format
      for (let i = 0; i < options.headers.length; i += 2) {
        const key = options.headers[i] as string;
        const value = options.headers[i + 1] as string;
        if (key.toLowerCase() === "authorization") {
          headersObj[key] = value.substring(0, 20) + "...";
        } else {
          headersObj[key] = value;
        }
      }
    } else {
      // Plain object
      Object.entries(options.headers).forEach(([key, value]) => {
        if (key.toLowerCase() === "authorization") {
          headersObj[key] = String(value).substring(0, 20) + "...";
        } else {
          headersObj[key] = String(value);
        }
      });
    }
    console.log("Headers:", JSON.stringify(headersObj, null, 2));
  }
  if (options?.body) {
    console.log("Body:", typeof options.body === "string" ? options.body : JSON.stringify(options.body, null, 2));
  }
}

function logResponse(status: number, statusText: string, headers: Headers, body: unknown) {
  console.log("\n=== RESPONSE ===");
  console.log(`Status: ${status} ${statusText}`);
  console.log("Headers:", JSON.stringify(Object.fromEntries(headers.entries()), null, 2));
  console.log("Body:", JSON.stringify(body, null, 2));
  console.log("================\n");
}

// Create a fetch wrapper with logging
function createLoggingFetch(originalFetch: typeof fetch): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || (typeof input === "object" && "method" in input ? input.method : "GET");
    
    logRequest(method, url, init);

    // Add a timeout to detect hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error("\n=== REQUEST TIMEOUT ===");
      console.error(`Request to ${url} timed out after 15 seconds`);
      console.error("==================\n");
    }, 15000);

    try {
      const response = await originalFetch(input, {
        ...init,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const clonedResponse = response.clone();
      
      let body: unknown;
      const contentType = response.headers.get("content-type") || "";
      
      if (contentType.includes("application/json")) {
        try {
          body = await clonedResponse.json();
        } catch {
          body = await clonedResponse.text();
        }
      } else if (contentType.includes("application/xml") || contentType.includes("text/xml")) {
        body = await clonedResponse.text();
      } else {
        body = await clonedResponse.text();
      }

      logResponse(response.status, response.statusText, response.headers, body);

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("\n=== FETCH ERROR ===");
      console.error("Error:", error);
      if (error instanceof Error) {
        console.error("Message:", error.message);
        console.error("Stack:", error.stack);
        if ("cause" in error && error.cause) {
          console.error("Cause:", error.cause);
        }
      }
      console.error("==================\n");
      throw error;
    }
  };
}

describe("Integration Tests", () => {
  const host = process.env.FMODATA_HOST?.trim().replace(/^["']|["']$/g, "");
  const database = process.env.FMODATA_DATABASE?.trim().replace(/^["']|["']$/g, "");
  const username = process.env.FMODATA_USERNAME?.trim().replace(/^["']|["']$/g, "");
  const password = process.env.FMODATA_PASSWORD?.trim().replace(/^["']|["']$/g, "");
  const ottoApiKey = process.env.FMODATA_OTTO_API_KEY?.trim().replace(/^["']|["']$/g, "");
  const ottoPort = process.env.FMODATA_OTTO_PORT
    ? parseInt(process.env.FMODATA_OTTO_PORT.trim(), 10)
    : undefined;

  let client: ReturnType<typeof ODataApi>;

  beforeAll(() => {
    // Disable SSL verification for localhost/development
    // This must be set before any TLS connections are made
    if (host && host.includes("localhost")) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      console.log("⚠️  SSL verification disabled for localhost (development only)");
    }

    // Replace global fetch with logging version
    if (typeof globalThis.fetch !== "undefined") {
      globalThis.fetch = createLoggingFetch(globalThis.fetch);
    }
  });

  beforeAll(() => {
    if (!host || !database) {
      throw new Error(
        "Integration tests require FMODATA_HOST and FMODATA_DATABASE environment variables",
      );
    }

    if (ottoApiKey && isOttoAPIKey(ottoApiKey)) {
      if (ottoApiKey.startsWith("KEY_")) {
        client = ODataApi({
          adapter: new OttoAdapter({
            server: host,
            database,
            auth: { apiKey: ottoApiKey as `KEY_${string}`, ottoPort },
            rejectUnauthorized: false, // SSL verification handled via env var
          }),
        });
      } else if (ottoApiKey.startsWith("dk_")) {
        client = ODataApi({
          adapter: new OttoAdapter({
            server: host,
            database,
            auth: { apiKey: ottoApiKey as `dk_${string}` },
            rejectUnauthorized: false, // SSL verification handled via env var
          }),
        });
      } else {
        throw new Error("Invalid Otto API key format");
      }
    } else if (username && password) {
      client = ODataApi({
        adapter: new FetchAdapter({
          server: host,
          database,
          auth: { username, password },
          rejectUnauthorized: false, // SSL verification handled via env var
        }),
      });
    } else {
      throw new Error(
        "Integration tests require either FMODATA_OTTO_API_KEY or both FMODATA_USERNAME and FMODATA_PASSWORD",
      );
    }
  });

  describe("getTables", () => {
    it("should retrieve list of tables", async () => {
      console.log("\n🧪 Testing getTables()");
      const result = await client.getTables();
      console.log("✅ getTables result:", JSON.stringify(result, null, 2));
      expect(result).toBeDefined();
      expect(Array.isArray(result.value)).toBe(true);
    });
  });

  describe("getMetadata", () => {
    it("should retrieve metadata", async () => {
      console.log("\n🧪 Testing getMetadata()");
      const result = await client.getMetadata();
      console.log("✅ getMetadata result (first 500 chars):", 
        typeof result === "string" ? result.substring(0, 500) : JSON.stringify(result).substring(0, 500));
      expect(result).toBeDefined();
      expect(typeof result === "string").toBe(true);
    });
  });

  describe("getRecords", () => {
    it("should query records from a table", async () => {
      console.log("\n🧪 Testing getRecords()");
      
      // First, get tables to find a table to query
      const tables = await client.getTables();
      if (tables.value.length === 0) {
        console.log("⚠️  No tables found, skipping getRecords test");
        return;
      }

      const tableName = tables.value[0]?.name;
      if (!tableName) {
        console.log("⚠️  Table name not found, skipping getRecords test");
        return;
      }
      console.log(`📋 Using table: ${tableName}`);

      const result = await client.getRecords(tableName, {
        $top: 5,
      });
      console.log("✅ getRecords result:", JSON.stringify(result, null, 2));
      expect(result).toBeDefined();
      expect(result.value).toBeDefined();
    });
  });

  describe("getRecordCount", () => {
    it("should get record count for a table", async () => {
      console.log("\n🧪 Testing getRecordCount()");
      
      // First, get tables to find a table
      const tables = await client.getTables();
      if (tables.value.length === 0) {
        console.log("⚠️  No tables found, skipping getRecordCount test");
        return;
      }

      const tableName = tables.value[0]?.name;
      if (!tableName) {
        console.log("⚠️  Table name not found, skipping getRecordCount test");
        return;
      }
      console.log(`📋 Using table: ${tableName}`);

      const result = await client.getRecordCount(tableName);
      console.log(`✅ getRecordCount result: ${result}`);
      expect(result).toBeDefined();
      expect(typeof result === "number").toBe(true);
    });
  });
});

