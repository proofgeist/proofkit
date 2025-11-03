import type { QueryOptions } from "./client-types.js";

/**
 * Encode OData filter expression for FileMaker
 * FileMaker OData expects filter expressions to be minimally encoded.
 * Per FileMaker documentation examples, most characters remain literal.
 */
function encodeODataFilter(filter: string): string {
  // FileMaker OData examples show filters with spaces, commas, quotes as literal characters
  // Only encode characters that absolutely break URL syntax: & # % (for query param safety)
  return filter
    .replace(/%/g, "%25") // Encode % first
    .replace(/&/g, "%26") // Ampersand
    .replace(/#/g, "%23"); // Hash
  // Everything else stays literal: spaces, commas, quotes, parentheses, etc.
}

/**
 * Build OData query string from query options
 * Note: URLSearchParams doesn't properly handle parameter names starting with $,
 * so we manually build the query string and return it as a string.
 * We encode values but not the entire query string since url.search will handle that.
 */
export function buildQueryString(options: QueryOptions): string {
  const parts: string[] = [];

  if (options.$filter) {
    // Use custom encoding for filters to work around FileMaker OData parser issues
    const encodedFilter = encodeODataFilter(options.$filter);
    parts.push(`$filter=${encodedFilter}`);
  }
  if (options.$select) {
    parts.push(`$select=${encodeURIComponent(options.$select)}`);
  }
  if (options.$expand) {
    parts.push(`$expand=${encodeURIComponent(options.$expand)}`);
  }
  if (options.$orderby) {
    parts.push(`$orderby=${encodeURIComponent(options.$orderby)}`);
  }
  if (options.$top !== undefined) {
    parts.push(`$top=${options.$top}`);
  }
  if (options.$skip !== undefined) {
    parts.push(`$skip=${options.$skip}`);
  }
  if (options.$count) {
    parts.push("$count=true");
  }
  if (options.$format) {
    parts.push(`$format=${encodeURIComponent(options.$format)}`);
  }
  if (options.IEEE754Compatible) {
    parts.push("IEEE754Compatible=true");
  }

  return parts.join("&");
}

/**
 * Build OData URL path for a table
 */
export function buildTablePath(databaseName: string, table: string): string {
  return `/fmi/odata/v4/${databaseName}/${table}`;
}

/**
 * Build OData URL path for FileMaker_Tables system table (for schema operations)
 */
export function buildFileMakerTablesPath(
  databaseName: string,
  table?: string,
): string {
  const base = `/fmi/odata/v4/${databaseName}/FileMaker_Tables`;
  return table ? `${base}/${table}` : base;
}

/**
 * Build OData URL path for a specific record
 */
export function buildRecordPath(
  databaseName: string,
  table: string,
  key: string | number,
): string {
  const encodedKey = encodeURIComponent(key);
  return `/fmi/odata/v4/${databaseName}/${table}(${encodedKey})`;
}

/**
 * Build OData URL path for a field value
 */
export function buildFieldValuePath(
  databaseName: string,
  table: string,
  key: string | number,
  field: string,
): string {
  const recordPath = buildRecordPath(databaseName, table, key);
  return `${recordPath}/${field}/$value`;
}

/**
 * Build OData URL path for metadata
 */
export function buildMetadataPath(databaseName: string): string {
  return `/fmi/odata/v4/${databaseName}/$metadata`;
}

/**
 * Build OData URL path for tables list
 */
export function buildTablesPath(databaseName: string): string {
  return `/fmi/odata/v4/${databaseName}`;
}

/**
 * Build OData URL path for navigation property
 */
export function buildNavigationPath(
  databaseName: string,
  table: string,
  key: string | number,
  navigation: string,
): string {
  const recordPath = buildRecordPath(databaseName, table, key);
  return `${recordPath}/${navigation}`;
}

/**
 * Build OData URL path for cross-join
 */
export function buildCrossJoinPath(
  databaseName: string,
  tables: string[],
): string {
  const tablesList = tables.map((t) => t).join(",");
  return `/fmi/odata/v4/${databaseName}/CrossJoin(${tablesList})`;
}

/**
 * Build OData URL path for batch operations
 */
export function buildBatchPath(databaseName: string): string {
  return `/fmi/odata/v4/${databaseName}/$batch`;
}

/**
 * Build Accept header value based on format options
 */
export function buildAcceptHeader(options?: {
  $format?: "json" | "atom" | "xml";
  IEEE754Compatible?: boolean;
}): string {
  const format = options?.$format ?? "json";
  const parts: string[] = [];

  if (format === "json") {
    let jsonPart = "application/json";
    if (options?.IEEE754Compatible) {
      jsonPart += ";IEEE754Compatible=true";
    }
    parts.push(jsonPart);
  } else if (format === "atom" || format === "xml") {
    parts.push("application/atom+xml");
    parts.push("application/xml");
  }

  return parts.join(", ");
}

/**
 * Build Content-Type header value
 */
export function buildContentTypeHeader(
  format?: "json" | "atom" | "xml",
): string {
  switch (format) {
    case "atom":
    case "xml":
      return "application/atom+xml";
    case "json":
    default:
      return "application/json";
  }
}

/**
 * Encode primary key value for URL
 */
export function encodeKey(key: string | number): string {
  if (typeof key === "number") {
    return key.toString();
  }
  // For string keys, check if it needs quoting
  if (key.includes("'") || key.includes(" ") || key.includes(",")) {
    return `'${key.replace(/'/g, "''")}'`;
  }
  return key;
}

/**
 * Parse error response and extract error information
 */
export function parseErrorResponse(
  response: Response,
  data: unknown,
): { code: string; message: string; target?: string; details?: unknown[] } {
  if (data && typeof data === "object" && "error" in data) {
    const error = (data as { error: { code: string; message: string; target?: string; details?: unknown[] } }).error;
    return {
      code: error.code ?? response.status.toString(),
      message: error.message ?? response.statusText,
      target: error.target,
      details: error.details,
    };
  }

  return {
    code: response.status.toString(),
    message: response.statusText || "Unknown error",
  };
}

