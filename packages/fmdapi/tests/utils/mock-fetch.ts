/**
 * Mock Fetch Utility
 *
 * This utility creates a mock fetch function that returns pre-recorded API responses.
 * It's designed to be used with vitest's vi.stubGlobal to mock the global fetch.
 *
 * Usage:
 * ```ts
 * import { vi } from 'vitest';
 * import { createMockFetch, createMockFetchSequence } from './tests/utils/mock-fetch';
 * import { mockResponses } from './tests/fixtures/responses';
 *
 * // Mock a single response
 * vi.stubGlobal('fetch', createMockFetch(mockResponses['list-basic']));
 *
 * // Mock a sequence of responses (for multi-call tests)
 * vi.stubGlobal('fetch', createMockFetchSequence([
 *   mockResponses['list-basic'],
 *   mockResponses['find-basic'],
 * ]));
 * ```
 *
 * Benefits:
 * - Each test explicitly declares which response it expects
 * - No URL matching logic needed - the response is used directly
 * - Tests are more robust and easier to understand
 * - Supports both full MockResponse objects and simple data
 */

import type { MockResponse } from "../fixtures/responses";

/**
 * Creates a mock fetch function that returns the provided response
 *
 * @param response - A MockResponse object with the response data
 * @returns A fetch-compatible function that returns the mocked response
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

    // Format response body based on content type
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
 *
 * @param responses - Array of MockResponse objects to return in order
 * @returns A fetch-compatible function that returns responses sequentially
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
 * Helper to create a simple mock response
 */
export interface SimpleMockConfig {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export function simpleMock(config: SimpleMockConfig): typeof fetch {
  return createMockFetch({
    url: "https://api.example.com/mock",
    method: "GET",
    status: config.status,
    response: config.body ?? null,
    headers: {
      "content-type": "application/json",
      ...config.headers,
    },
  });
}

/**
 * Creates a FileMaker-style error response
 */
export function createFMErrorMock(code: string, message: string): typeof fetch {
  return createMockFetch({
    url: "https://api.example.com/mock",
    method: "GET",
    status: code === "401" ? 400 : 500,
    response: {
      messages: [{ code, message }],
      response: {},
    },
    headers: {
      "content-type": "application/json",
    },
  });
}

/**
 * Creates a successful FileMaker Data API response
 */
export function createFMSuccessMock(data: unknown[]): typeof fetch {
  return createMockFetch({
    url: "https://api.example.com/mock",
    method: "GET",
    status: 200,
    response: {
      messages: [{ code: "0", message: "OK" }],
      response: {
        data,
        dataInfo: {
          database: "test",
          layout: "test",
          table: "test",
          totalRecordCount: data.length,
          foundCount: data.length,
          returnedCount: data.length,
        },
      },
    },
    headers: {
      "content-type": "application/json",
    },
  });
}
