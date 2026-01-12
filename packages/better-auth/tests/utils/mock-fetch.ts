/**
 * Mock Fetch Utility for OData API
 *
 * Creates a mock fetch function that returns pre-recorded OData API responses.
 * Designed to be used with vitest's vi.stubGlobal to mock the global fetch.
 *
 * Usage:
 * ```ts
 * import { vi } from 'vitest';
 * import { createMockFetch, createMockFetchSequence } from './tests/utils/mock-fetch';
 * import { mockResponses } from './tests/fixtures/responses';
 *
 * // Mock a single response
 * vi.stubGlobal('fetch', createMockFetch(mockResponses['find-one-user']));
 *
 * // Mock a sequence of responses (for multi-call tests)
 * vi.stubGlobal('fetch', createMockFetchSequence([
 *   mockResponses['find-one-user'],
 *   mockResponses['update-user'],
 * ]));
 * ```
 */

import type { MockResponse } from "../fixtures/responses";

/**
 * Creates a mock fetch function that returns the provided response
 */
export function createMockFetch(response: MockResponse): typeof fetch {
  return (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    const contentType = response.headers?.["content-type"] || "application/json";
    const isJson = contentType.includes("application/json");

    const headers = new Headers({
      "content-type": contentType,
    });

    if (response.headers) {
      for (const [key, value] of Object.entries(response.headers)) {
        if (key !== "content-type" && value) {
          headers.set(key, value);
        }
      }
    }

    const responseBody = isJson ? JSON.stringify(response.response) : String(response.response);

    return Promise.resolve(
      new Response(responseBody, {
        status: response.status,
        statusText: response.status >= 200 && response.status < 300 ? "OK" : "Error",
        headers,
      }),
    );
  };
}

/**
 * Creates a mock fetch function that returns responses in sequence
 * Useful for tests that make multiple API calls
 */
export function createMockFetchSequence(responses: MockResponse[]): typeof fetch {
  let callIndex = 0;

  return (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    const response = responses[callIndex];
    if (!response) {
      throw new Error(
        `Mock fetch called more times than expected. Call #${callIndex + 1}, but only ${responses.length} responses provided.`,
      );
    }
    callIndex++;

    const contentType = response.headers?.["content-type"] || "application/json";
    const isJson = contentType.includes("application/json");

    const headers = new Headers({
      "content-type": contentType,
    });

    if (response.headers) {
      for (const [key, value] of Object.entries(response.headers)) {
        if (key !== "content-type" && value) {
          headers.set(key, value);
        }
      }
    }

    const responseBody = isJson ? JSON.stringify(response.response) : String(response.response);

    return Promise.resolve(
      new Response(responseBody, {
        status: response.status,
        statusText: response.status >= 200 && response.status < 300 ? "OK" : "Error",
        headers,
      }),
    );
  };
}

/**
 * Helper to create a simple OData success response
 */
export function createODataSuccessMock(value: unknown[]): typeof fetch {
  return createMockFetch({
    url: "https://api.example.com/mock",
    method: "GET",
    status: 200,
    response: { value },
    headers: { "content-type": "application/json" },
  });
}

/**
 * Helper to create an OData error response
 */
export function createODataErrorMock(statusCode: number, message: string): typeof fetch {
  return createMockFetch({
    url: "https://api.example.com/mock",
    method: "GET",
    status: statusCode,
    response: { error: { message } },
    headers: { "content-type": "application/json" },
  });
}
