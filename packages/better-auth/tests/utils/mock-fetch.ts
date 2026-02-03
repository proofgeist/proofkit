/**
 * Mock Database Utility for OData API
 *
 * Creates a mock Database object with _makeRequest that returns pre-recorded OData API responses.
 * Matches requests by URL path and returns the corresponding fixture response.
 */

import type { MockResponse } from "../fixtures/responses";

type MakeRequestResult<T> = { data: T; error: undefined } | { data: undefined; error: Error };

interface MockDatabase {
  _makeRequest<T>(path: string, options?: RequestInit): Promise<MakeRequestResult<T>>;
  // Stub properties for type compatibility
  schema: {
    createTable: () => Promise<unknown>;
    addFields: () => Promise<unknown>;
  };
  getMetadata: () => Promise<unknown>;
  _getDatabaseName: string;
}

/**
 * Creates a mock Database that returns the provided response for any _makeRequest call
 */
export function createMockDatabase(response: MockResponse): MockDatabase {
  return {
    _makeRequest: <T>(): Promise<MakeRequestResult<T>> => {
      if (response.status >= 200 && response.status < 300) {
        return Promise.resolve({ data: response.response as T, error: undefined });
      }
      return Promise.resolve({ data: undefined, error: new Error(`HTTP ${response.status}`) });
    },
    schema: {
      createTable: async () => ({}),
      addFields: async () => ({}),
    },
    getMetadata: async () => ({}),
    _getDatabaseName: "test.fmp12",
  };
}

/**
 * Creates a mock Database that returns responses in sequence
 * Useful for tests that make multiple API calls
 */
export function createMockDatabaseSequence(responses: MockResponse[]): MockDatabase {
  let callIndex = 0;

  return {
    _makeRequest: <T>(): Promise<MakeRequestResult<T>> => {
      const response = responses[callIndex];
      if (!response) {
        throw new Error(
          `Mock _makeRequest called more times than expected. Call #${callIndex + 1}, but only ${responses.length} responses provided.`,
        );
      }
      callIndex++;

      if (response.status >= 200 && response.status < 300) {
        return Promise.resolve({ data: response.response as T, error: undefined });
      }
      return Promise.resolve({ data: undefined, error: new Error(`HTTP ${response.status}`) });
    },
    schema: {
      createTable: async () => ({}),
      addFields: async () => ({}),
    },
    getMetadata: async () => ({}),
    _getDatabaseName: "test.fmp12",
  };
}

/**
 * Helper to create a mock Database with a simple OData success response
 */
export function createODataSuccessMock(value: unknown[]): MockDatabase {
  return createMockDatabase({
    url: "https://api.example.com/mock",
    method: "GET",
    status: 200,
    response: { value },
    headers: { "content-type": "application/json" },
  });
}

/**
 * Helper to create a mock Database with an OData error response
 */
export function createODataErrorMock(statusCode: number, message: string): MockDatabase {
  return createMockDatabase({
    url: "https://api.example.com/mock",
    method: "GET",
    status: statusCode,
    response: { error: { message } },
    headers: { "content-type": "application/json" },
  });
}
