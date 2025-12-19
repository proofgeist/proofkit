/**
 * Batch Request Utilities
 *
 * Utilities for formatting and parsing OData batch requests using multipart/mixed format.
 * OData batch requests allow bundling multiple operations into a single HTTP request,
 * with support for transactional changesets.
 */

export interface RequestConfig {
  method: string;
  url: string;
  body?: string;
  headers?: Record<string, string>;
}

export interface ParsedBatchResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
}

/**
 * Generates a random boundary string for multipart requests
 * @param prefix - Prefix for the boundary (e.g., "batch_" or "changeset_")
 * @returns A boundary string with the prefix and 32 random hex characters
 */
export function generateBoundary(prefix: string = "batch_"): string {
  const randomHex = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
  return `${prefix}${randomHex}`;
}

/**
 * Converts a native Request object to RequestConfig
 * @param request - Native Request object
 * @returns RequestConfig object
 */
async function requestToConfig(request: Request): Promise<RequestConfig> {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let body: string | undefined;
  if (request.body) {
    // Clone the request to read the body without consuming it
    const clonedRequest = request.clone();
    body = await clonedRequest.text();
  }

  return {
    method: request.method,
    url: request.url,
    body,
    headers,
  };
}

/**
 * Formats a single HTTP request for inclusion in a batch
 * @param request - The request configuration
 * @param baseUrl - The base URL to prepend to relative URLs
 * @returns Formatted request string with CRLF line endings
 *
 * Formatting rules for FileMaker OData:
 * - GET (no body): request line → blank → blank
 * - POST/PATCH (with body): request line → headers → blank → body (NO blank after!)
 */
function formatSubRequest(request: RequestConfig, baseUrl: string): string {
  const lines: string[] = [];

  // Add required headers for sub-request
  lines.push("Content-Type: application/http");
  lines.push("Content-Transfer-Encoding: binary");
  lines.push(""); // Empty line after multipart headers

  // Construct full URL (convert relative to absolute)
  const fullUrl = request.url.startsWith("http")
    ? request.url
    : `${baseUrl}${request.url}`;

  // Add HTTP request line
  lines.push(`${request.method} ${fullUrl} HTTP/1.1`);

  // For requests with body, add headers
  if (request.body) {
    // Add request headers (excluding Authorization - it's in the outer request)
    if (request.headers) {
      for (const [key, value] of Object.entries(request.headers)) {
        if (key.toLowerCase() !== "authorization") {
          lines.push(`${key}: ${value}`);
        }
      }
    }

    // Check if Content-Type is already set
    const hasContentType =
      request.headers &&
      Object.keys(request.headers).some(
        (k) => k.toLowerCase() === "content-type",
      );

    if (!hasContentType) {
      lines.push("Content-Type: application/json");
    }

    // Add Content-Length (required for FileMaker to read the body)
    const hasContentLength =
      request.headers &&
      Object.keys(request.headers).some(
        (k) => k.toLowerCase() === "content-length",
      );

    if (!hasContentLength) {
      lines.push(`Content-Length: ${request.body.length}`);
    }

    lines.push(""); // Empty line between headers and body
    lines.push(request.body);
    // NO blank line after body - the boundary comes immediately
  } else {
    // For GET requests (no body), add TWO blank lines
    lines.push(""); // First blank
    lines.push(""); // Second blank
  }

  return lines.join("\r\n");
}

/**
 * Formats a changeset containing multiple non-GET operations
 * @param requests - Array of request configurations (should be non-GET)
 * @param baseUrl - The base URL to prepend to relative URLs
 * @param changesetBoundary - Boundary string for the changeset
 * @returns Formatted changeset string with CRLF line endings
 */
function formatChangeset(
  requests: RequestConfig[],
  baseUrl: string,
  changesetBoundary: string,
): string {
  const lines: string[] = [];

  lines.push(`Content-Type: multipart/mixed; boundary=${changesetBoundary}`);
  lines.push(""); // Empty line after headers

  // Add each request in the changeset
  for (const request of requests) {
    lines.push(`--${changesetBoundary}`);
    lines.push(formatSubRequest(request, baseUrl));
  }

  // Close the changeset
  lines.push(`--${changesetBoundary}--`);

  return lines.join("\r\n");
}

/**
 * Formats multiple requests into a batch request body
 * @param requests - Array of request configurations
 * @param baseUrl - The base URL to prepend to relative URLs
 * @param batchBoundary - Optional boundary string for the batch (generated if not provided)
 * @returns Object containing the formatted body and boundary
 */
export function formatBatchRequest(
  requests: RequestConfig[],
  baseUrl: string,
  batchBoundary?: string,
): { body: string; boundary: string } {
  const boundary = batchBoundary || generateBoundary("batch_");
  const lines: string[] = [];

  // Group requests: consecutive non-GET operations go into changesets
  let currentChangeset: RequestConfig[] | null = null;

  for (const request of requests) {
    if (request.method === "GET") {
      // GET operations break changesets and are added individually
      if (currentChangeset) {
        // Close and add the current changeset
        const changesetBoundary = generateBoundary("changeset_");
        lines.push(`--${boundary}`);
        lines.push(
          formatChangeset(currentChangeset, baseUrl, changesetBoundary),
        );
        currentChangeset = null;
      }

      // Add GET request
      lines.push(`--${boundary}`);
      lines.push(formatSubRequest(request, baseUrl));
    } else {
      // Non-GET operations: add to current changeset or create new one
      if (!currentChangeset) {
        currentChangeset = [];
      }
      currentChangeset.push(request);
    }
  }

  // Add any remaining changeset
  if (currentChangeset) {
    const changesetBoundary = generateBoundary("changeset_");
    lines.push(`--${boundary}`);
    lines.push(formatChangeset(currentChangeset, baseUrl, changesetBoundary));
  }

  // Close the batch
  lines.push(`--${boundary}--`);

  return {
    body: lines.join("\r\n"),
    boundary,
  };
}

/**
 * Formats multiple Request objects into a batch request body
 * Supports explicit changesets via Request arrays
 * @param requests - Array of Request objects or Request arrays (for explicit changesets)
 * @param baseUrl - The base URL to prepend to relative URLs
 * @param batchBoundary - Optional boundary string for the batch (generated if not provided)
 * @returns Promise resolving to object containing the formatted body and boundary
 */
export async function formatBatchRequestFromNative(
  requests: Array<Request | Request[]>,
  baseUrl: string,
  batchBoundary?: string,
): Promise<{ body: string; boundary: string }> {
  const boundary = batchBoundary || generateBoundary("batch_");
  const lines: string[] = [];

  for (const item of requests) {
    if (Array.isArray(item)) {
      // Explicit changeset - array of Requests
      const changesetBoundary = generateBoundary("changeset_");
      const changesetConfigs: RequestConfig[] = [];

      for (const request of item) {
        changesetConfigs.push(await requestToConfig(request));
      }

      lines.push(`--${boundary}`);
      lines.push(formatChangeset(changesetConfigs, baseUrl, changesetBoundary));
    } else {
      // Single request
      const config = await requestToConfig(item);

      if (config.method === "GET") {
        // GET requests are always individual
        lines.push(`--${boundary}`);
        lines.push(formatSubRequest(config, baseUrl));
      } else {
        // Non-GET operations wrapped in a changeset
        const changesetBoundary = generateBoundary("changeset_");
        lines.push(`--${boundary}`);
        lines.push(formatChangeset([config], baseUrl, changesetBoundary));
      }
    }
  }

  // Close the batch
  lines.push(`--${boundary}--`);

  return {
    body: lines.join("\r\n"),
    boundary,
  };
}

/**
 * Extracts the boundary from a Content-Type header
 * @param contentType - The Content-Type header value
 * @returns The boundary string, or null if not found
 */
export function extractBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=([^;]+)/);
  return match && match[1] ? match[1].trim() : null;
}

/**
 * Parses an HTTP response line (status line)
 * @param line - The HTTP status line (e.g., "HTTP/1.1 200 OK")
 * @returns Object containing status code and status text
 */
function parseStatusLine(line: string): {
  status: number;
  statusText: string;
} {
  const match = line.match(/HTTP\/\d\.\d\s+(\d+)\s*(.*)/);
  if (!match || !match[1]) {
    return { status: 0, statusText: "" };
  }
  return {
    status: parseInt(match[1], 10),
    statusText: match[2]?.trim() || "",
  };
}

/**
 * Parses headers from an array of header lines
 * @param lines - Array of header lines
 * @returns Object containing parsed headers
 */
function parseHeaders(lines: string[]): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      headers[key.toLowerCase()] = value;
    }
  }
  return headers;
}

/**
 * Parses a single HTTP response from a batch part
 * @param part - The raw HTTP response string
 * @returns Parsed response object
 */
function parseHttpResponse(part: string): ParsedBatchResponse {
  const lines = part.split(/\r\n/);

  // Find the HTTP status line (skip multipart headers)
  let statusLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line && line.startsWith("HTTP/")) {
      statusLineIndex = i;
      break;
    }
  }

  if (statusLineIndex === -1) {
    return {
      status: 0,
      statusText: "Invalid response",
      headers: {},
      body: null,
    };
  }

  const statusLine = lines[statusLineIndex];
  if (!statusLine) {
    return {
      status: 0,
      statusText: "Invalid response",
      headers: {},
      body: null,
    };
  }

  const { status, statusText } = parseStatusLine(statusLine);

  // Parse headers (between status line and empty line)
  const headerLines: string[] = [];
  let bodyStartIndex = lines.length; // Default to end of lines (no body)
  let foundEmptyLine = false;

  for (let i = statusLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === "") {
      bodyStartIndex = i + 1;
      foundEmptyLine = true;
      break;
    }
    // Stop at boundary markers (for responses without bodies like 204)
    if (line && line.startsWith("--")) {
      break;
    }
    if (line) {
      headerLines.push(line);
    }
  }

  const headers = parseHeaders(headerLines);

  // Parse body (everything after the empty line, if there was one)
  let bodyText = "";
  if (foundEmptyLine && bodyStartIndex < lines.length) {
    const bodyLines = lines.slice(bodyStartIndex);
    // Stop at boundary markers
    const bodyLinesFiltered: string[] = [];
    for (const line of bodyLines) {
      if (line.startsWith("--")) {
        break;
      }
      bodyLinesFiltered.push(line);
    }
    bodyText = bodyLinesFiltered.join("\r\n").trim();
  }

  let body: any = null;
  if (bodyText) {
    try {
      body = JSON.parse(bodyText);
    } catch {
      // If not JSON, return as text
      body = bodyText;
    }
  }

  return {
    status,
    statusText,
    headers,
    body,
  };
}

/**
 * Parses a batch response into individual responses
 * @param responseText - The raw batch response text
 * @param contentType - The Content-Type header from the response
 * @returns Array of parsed responses in the same order as the request
 */
export function parseBatchResponse(
  responseText: string,
  contentType: string,
): ParsedBatchResponse[] {
  const boundary = extractBoundary(contentType);
  if (!boundary) {
    throw new Error("Could not extract boundary from Content-Type header");
  }

  const results: ParsedBatchResponse[] = [];

  // Split by boundary (handle both --boundary and --boundary--)
  const boundaryPattern = `--${boundary}`;
  const parts = responseText.split(boundaryPattern);

  for (const part of parts) {
    const trimmedPart = part.trim();

    // Skip empty parts and the closing boundary marker
    if (!trimmedPart || trimmedPart === "--") {
      continue;
    }

    // Check if this part is a changeset (nested multipart)
    if (trimmedPart.includes("Content-Type: multipart/mixed")) {
      // Extract the changeset boundary
      const changesetContentTypeMatch = trimmedPart.match(
        /Content-Type: multipart\/mixed;\s*boundary=([^\r\n]+)/,
      );
      if (changesetContentTypeMatch) {
        const changesetBoundary = changesetContentTypeMatch?.[1]?.trim();
        const changesetPattern = `--${changesetBoundary}`;
        const changesetParts = trimmedPart.split(changesetPattern);

        for (const changesetPart of changesetParts) {
          const trimmedChangesetPart = changesetPart.trim();
          if (!trimmedChangesetPart || trimmedChangesetPart === "--") {
            continue;
          }

          // Skip the changeset header
          if (
            trimmedChangesetPart.startsWith("Content-Type: multipart/mixed")
          ) {
            continue;
          }

          const response = parseHttpResponse(trimmedChangesetPart);
          if (response.status > 0) {
            results.push(response);
          }
        }
      }
    } else {
      // Regular response (not a changeset)
      const response = parseHttpResponse(trimmedPart);
      if (response.status > 0) {
        results.push(response);
      }
    }
  }

  return results;
}
