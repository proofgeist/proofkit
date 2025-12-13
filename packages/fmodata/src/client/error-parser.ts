import {
  HTTPError,
  ODataError,
  SchemaLockedError,
  FMODataErrorType,
} from "../errors";
import { safeJsonParse } from "./sanitize-json";

/**
 * Parses an error response and returns an appropriate error object.
 * This helper is used by builder processResponse methods to handle error responses
 * consistently, particularly important for batch operations where errors need to be
 * properly parsed from the response body.
 *
 * @param response - The Response object (may be from batch or direct request)
 * @param url - The URL that was requested (for error context)
 * @returns An appropriate error object (ODataError, SchemaLockedError, or HTTPError)
 */
export async function parseErrorResponse(
  response: Response,
  url: string,
): Promise<FMODataErrorType> {
  // Try to parse error body if it's JSON
  let errorBody:
    | { error?: { code?: string | number; message?: string } }
    | undefined;

  try {
    if (response.headers.get("content-type")?.includes("application/json")) {
      errorBody = await safeJsonParse<typeof errorBody>(response);
    }
  } catch {
    // Ignore JSON parse errors - we'll fall back to HTTPError
  }

  // Check if it's an OData error response
  if (errorBody?.error) {
    const errorCode = errorBody.error.code;
    const errorMessage = errorBody.error.message || response.statusText;

    // Check for schema locked error (code 303)
    if (errorCode === "303" || errorCode === 303) {
      return new SchemaLockedError(url, errorMessage, errorBody.error);
    }

    return new ODataError(
      url,
      errorMessage,
      String(errorCode),
      errorBody.error,
    );
  }

  // Fall back to generic HTTPError
  return new HTTPError(url, response.status, response.statusText, errorBody);
}



