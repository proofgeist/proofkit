/**
 * FileMaker OData API sometimes returns invalid JSON containing unquoted `?`
 * characters as field values (e.g., `"fieldName": ?`), which causes JSON.parse()
 * to fail. This module provides utilities to sanitize such responses before parsing.
 */

import { ResponseParseError } from "../errors";

/**
 * Sanitizes FileMaker OData JSON responses by replacing unquoted `?` values with `null`.
 *
 * FileMaker uses `?` to represent undefined/null values in its OData responses,
 * but this is not valid JSON. This function converts those to proper `null` values.
 *
 * The regex uses two patterns:
 * 1. `/:\s*\?(?=\s*[,}\]])/g` - for values in objects (after `:`)
 * 2. `/(?<=[\[,])\s*\?(?=\s*[,\]])/g` - for values in arrays (after `[` or `,`)
 *
 * @param text - The raw response text from FileMaker OData API
 * @returns Sanitized JSON string with `?` values replaced by `null`
 *
 * @example
 * sanitizeFileMakerJson('{"field1": "valid", "field2": ?, "field3": null}')
 * // Returns: '{"field1": "valid", "field2": null, "field3": null}'
 */
export function sanitizeFileMakerJson(text: string): string {
  // Replace unquoted ? values in objects (after colon)
  // Also handles arrays when the array is a value in an object
  let result = text.replace(/:\s*\?(?=\s*[,}\]])/g, ": null");

  // Replace unquoted ? values directly in arrays (not after colon)
  // e.g., [1, ?, 3] -> [1, null, 3]
  result = result.replace(/(?<=[\[,])\s*\?(?=\s*[,\]])/g, " null");

  return result;
}

/**
 * Safely parses a Response body as JSON, handling FileMaker's invalid JSON responses.
 *
 * This function reads the response as text first, sanitizes any invalid `?` values,
 * and then parses the sanitized JSON. This approach handles the case where FileMaker
 * returns a Content-Type of application/json but the body contains invalid JSON.
 *
 * @param response - The fetch Response object
 * @returns Parsed JSON data
 * @throws ResponseParseError if the JSON is still invalid after sanitization (includes sanitized text for debugging)
 */
export async function safeJsonParse<T = unknown>(
  response: Response,
): Promise<T> {
  const text = await response.text();
  const sanitized = sanitizeFileMakerJson(text);
  try {
    return JSON.parse(sanitized) as T;
  } catch (err) {
    throw new ResponseParseError(
      response.url,
      `Failed to parse response as JSON: ${err instanceof Error ? err.message : "Unknown error"}`,
      {
        rawText: sanitized,
        cause: err instanceof Error ? err : undefined,
      },
    );
  }
}
