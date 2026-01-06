/**
 * Mock Fetch Utility
 *
 * This utility creates a mock fetch function that returns a single pre-recorded API response.
 * It's designed to be compatible with @fetchkit/ffetch and can be passed via fetchClientOptions
 * or as a per-execution override.
 *
 * Usage:
 * ```ts
 * import { createMockFetch } from './tests/utils/mock-fetch';
 * import { mockResponses } from './tests/fixtures/responses';
 *
 * // Use a specific response for a single query execution
 * const result = await db.from('contacts').list().execute({
 *   fetchHandler: createMockFetch(mockResponses['list-basic'])
 * });
 *
 * // Or use a simple array (wraps in OData format)
 * const result = await db.from('contacts').list().execute({
 *   fetchHandler: createMockFetch([{ id: 1, name: 'John' }])
 * });
 * ```
 *
 * Benefits:
 * - Each test explicitly declares which response it expects
 * - No URL matching logic needed - the response is used directly
 * - Tests are more robust and easier to understand
 * - Supports both full MockResponse objects and simple data arrays
 */

import type { MockResponse } from "../fixtures/responses";
import { MOCK_SERVER_URL } from "./mock-server-url";

/**
 * Creates a mock fetch function that returns the provided response
 *
 * @param response - Either a full MockResponse object or a simple array/data to wrap in OData format
 * @returns A fetch-compatible function that returns the mocked response
 */
/**
 * Recursively removes @id and @editLink fields from an object or array
 */
function stripODataAnnotations(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(stripODataAnnotations);
  }
  if (data && typeof data === "object") {
    const { "@id": _id, "@editLink": _editLink, ...rest } = data as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      result[key] = stripODataAnnotations(value);
    }
    return result;
  }
  return data;
}

export function createMockFetch(response: MockResponse | unknown[]): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Extract Accept header from request - handle different formats
    let acceptHeader = "";

    if (input instanceof Request) {
      acceptHeader = input.headers.get("Accept") || "";
    } else if (init?.headers) {
      // Handle different HeadersInit formats
      if (init.headers instanceof Headers) {
        acceptHeader = init.headers.get("Accept") || "";
      } else if (Array.isArray(init.headers)) {
        const acceptEntry = init.headers.find(([key]) => key.toLowerCase() === "accept");
        acceptHeader = acceptEntry ? acceptEntry[1] : "";
      } else {
        // Record<string, string>
        acceptHeader = init.headers.Accept || init.headers.accept || "";
      }
    }

    // Determine if we should strip annotations based on Accept header
    // If Accept header contains "odata.metadata=none", strip annotations
    // Otherwise (Accept: "application/json"), include annotations
    const shouldStripAnnotations = acceptHeader.includes("odata.metadata=none");

    // Handle simple array input (legacy mockFetch behavior)
    if (Array.isArray(response)) {
      const data = shouldStripAnnotations ? stripODataAnnotations({ value: response }) : { value: response };
      return Promise.resolve(
        new Response(JSON.stringify(data), {
          status: 200,
          statusText: "OK",
          headers: {
            "content-type": "application/json",
          },
        }),
      );
    }

    // Handle full MockResponse object
    const mockResponse = response as MockResponse;
    const contentType = mockResponse.headers?.["content-type"] || "application/json;charset=utf-8";
    const isJson = contentType.includes("application/json");

    // Build headers including any custom headers from mockResponse
    const headers = new Headers({
      "content-type": contentType,
    });

    // Add any additional headers from the mock response
    if (mockResponse.headers) {
      for (const [key, value] of Object.entries(mockResponse.headers)) {
        if (key !== "content-type" && value) {
          headers.set(key, value);
        }
      }
    }

    // Status 204 (No Content) cannot have a body
    if (mockResponse.status === 204) {
      return Promise.resolve(
        new Response(null, {
          status: mockResponse.status,
          statusText: "No Content",
          headers,
        }),
      );
    }

    // Strip annotations if Accept header requests it
    const responseData = shouldStripAnnotations ? stripODataAnnotations(mockResponse.response) : mockResponse.response;

    // Format response body based on content type
    const responseBody = isJson ? JSON.stringify(responseData) : String(responseData);

    return Promise.resolve(
      new Response(responseBody, {
        status: mockResponse.status,
        statusText: mockResponse.status >= 200 && mockResponse.status < 300 ? "OK" : "Error",
        headers,
      }),
    );
  };
}

/**
 * Helper to create a mock response with standard structure
 * Useful for operations that return counts via headers (delete, bulk update)
 */
export interface SimpleMockConfig {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export function simpleMock(config: SimpleMockConfig): typeof fetch {
  return createMockFetch({
    url: MOCK_SERVER_URL,
    method: "GET",
    status: config.status,
    response: config.body ?? null,
    headers: {
      "content-type": "application/json",
      ...config.headers,
    },
  });
}
