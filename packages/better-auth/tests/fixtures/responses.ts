/**
 * Mock Response Fixtures for FileMaker OData API
 *
 * Contains captured/simulated responses from FileMaker OData API.
 * Used by mock fetch to replay API responses in tests without a live server.
 */

export interface MockResponse {
  url: string;
  method: string;
  status: number;
  headers?: {
    "content-type"?: string;
  };
  // biome-ignore lint/suspicious/noExplicitAny: API responses vary by endpoint
  response: any;
}

export type MockResponses = Record<string, MockResponse>;

/**
 * Helper to create an OData response with value array
 */
function odataResponse(value: unknown[]) {
  return { value };
}

/**
 * Helper to create a single record response (for GET by id)
 */
function singleRecord(data: Record<string, unknown>) {
  return data;
}

/**
 * Captured mock responses from FileMaker OData API
 */
export const mockResponses = {
  // ============ CREATE ============
  "create-user": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user",
    method: "POST",
    status: 200,
    headers: { "content-type": "application/json" },
    response: {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
  },

  "create-session": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/session",
    method: "POST",
    status: 200,
    headers: { "content-type": "application/json" },
    response: {
      id: "session-456",
      userId: "user-123",
      token: "abc123token",
      expiresAt: "2025-01-02T00:00:00.000Z",
    },
  },

  // ============ FIND ONE ============
  "find-one-user": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user?$top=1&$filter=email eq 'test@example.com'",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: odataResponse([
      {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    ]),
  },

  "find-one-user-not-found": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user?$top=1",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: odataResponse([]),
  },

  "find-one-session": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/session?$top=1",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: odataResponse([
      {
        id: "session-456",
        userId: "user-123",
        token: "abc123token",
        expiresAt: "2025-01-02T00:00:00.000Z",
      },
    ]),
  },

  // ============ FIND MANY ============
  "find-many-users": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: odataResponse([
      {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "user-456",
        email: "other@example.com",
        name: "Other User",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    ]),
  },

  "find-many-users-empty": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: odataResponse([]),
  },

  "find-many-with-limit": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user?$top=1",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: odataResponse([
      {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      },
    ]),
  },

  "find-many-sorted-desc": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user?$orderby=createdAt desc",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: odataResponse([
      { id: "user-456", createdAt: "2025-01-02T00:00:00.000Z" },
      { id: "user-123", createdAt: "2025-01-01T00:00:00.000Z" },
    ]),
  },

  // ============ COUNT ============
  "count-users": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user/$count",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: { value: 5 },
  },

  "count-users-with-filter": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user/$count?$filter=active eq true",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: { value: 3 },
  },

  // ============ UPDATE (find + patch + read back) ============
  "update-find-user": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: odataResponse([{ id: "user-123" }]),
  },

  "update-patch-user": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user('user-123')",
    method: "PATCH",
    status: 200,
    headers: { "content-type": "application/json" },
    response: null,
  },

  "update-read-back-user": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user('user-123')",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: singleRecord({
      id: "user-123",
      email: "updated@example.com",
      name: "Updated User",
      updatedAt: "2025-01-02T00:00:00.000Z",
    }),
  },

  // ============ DELETE (find + delete) ============
  "delete-find-user": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: odataResponse([{ id: "user-123" }]),
  },

  "delete-user": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user('user-123')",
    method: "DELETE",
    status: 200,
    headers: { "content-type": "application/json" },
    response: null,
  },

  "delete-find-not-found": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: odataResponse([]),
  },

  // ============ DELETE MANY ============
  "delete-many-find-users": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user",
    method: "GET",
    status: 200,
    headers: { "content-type": "application/json" },
    response: odataResponse([{ id: "user-123" }, { id: "user-456" }]),
  },

  "delete-user-123": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user('user-123')",
    method: "DELETE",
    status: 200,
    headers: { "content-type": "application/json" },
    response: null,
  },

  "delete-user-456": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user('user-456')",
    method: "DELETE",
    status: 200,
    headers: { "content-type": "application/json" },
    response: null,
  },

  // ============ ERROR RESPONSES ============
  "error-http-500": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user",
    method: "GET",
    status: 500,
    headers: { "content-type": "application/json" },
    response: { error: { message: "Internal server error" } },
  },

  "error-http-401": {
    url: "https://api.example.com/otto/fmi/odata/v4/test.fmp12/user",
    method: "GET",
    status: 401,
    headers: { "content-type": "application/json" },
    response: { error: { message: "Unauthorized" } },
  },
} satisfies MockResponses;
