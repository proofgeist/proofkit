import { beforeEach, vi } from "vitest";

// Mock fetch globally
global.fetch = vi.fn();

export function createMockResponse(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  const responseHeaders = new Headers({
    "Content-Type": "application/json",
    ...headers,
  });

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: responseHeaders,
    json: async () => data as never,
    text: async () => (typeof data === "string" ? data : JSON.stringify(data)),
  } as Response;
}

export function createODataResponse<T>(value: T[]): {
  value: T[];
  "@odata.context"?: string;
  "@odata.count"?: number;
} {
  return {
    value,
    "@odata.context": "https://test-server.example.com/fmi/odata/v4/TestDatabase/$metadata",
    "@odata.count": value.length,
  };
}

export function createODataErrorResponse(
  code: string,
  message: string,
  target?: string,
): { error: { code: string; message: string; target?: string } } {
  return {
    error: {
      code,
      message,
      target,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

