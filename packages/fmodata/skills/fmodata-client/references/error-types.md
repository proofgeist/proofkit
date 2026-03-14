# Error Types Reference

All errors and type guards are imported from `@proofkit/fmodata`.

## Result Type

Every `.execute()` call returns:

```ts
type Result<T, E = FMODataErrorType> =
  | { data: T; error: undefined }
  | { data: undefined; error: E };
```

Always check `result.error` before accessing `result.data`.

## Error Hierarchy

```
FMODataError (abstract base)
  |-- HTTPError
  |-- ODataError
  |-- SchemaLockedError
  |-- ValidationError
  |-- ResponseStructureError
  |-- RecordCountMismatchError
  |-- InvalidLocationHeaderError
  |-- ResponseParseError
  |-- BatchTruncatedError

External (from @fetchkit/ffetch):
  |-- TimeoutError
  |-- AbortError
  |-- NetworkError
  |-- RetryLimitError
  |-- CircuitOpenError
```

## FMODataError (abstract base)

All fmodata-specific errors extend this class.

| Property | Type | Description |
|----------|------|-------------|
| `kind` | `string` | Discriminant for exhaustive switch/case matching |
| `message` | `string` | Human-readable error description |
| `timestamp` | `Date` | When the error occurred |
| `name` | `string` | Constructor name |

Type guard: `isFMODataError(error)`

## HTTPError

HTTP status code errors (4xx, 5xx).

| Property | Type | Description |
|----------|------|-------------|
| `kind` | `"HTTPError"` | Discriminant |
| `url` | `string` | Request URL |
| `status` | `number` | HTTP status code |
| `statusText` | `string` | HTTP status text |
| `response` | `any` | Parsed response body (if available) |

Helper methods:
- `is4xx()` -- true if status 400-499
- `is5xx()` -- true if status 500-599
- `isNotFound()` -- true if status 404
- `isUnauthorized()` -- true if status 401
- `isForbidden()` -- true if status 403

Type guard: `isHTTPError(error)`

When it occurs: Server returns a non-2xx status without an OData error body.

## ODataError

OData protocol errors with structured error info.

| Property | Type | Description |
|----------|------|-------------|
| `kind` | `"ODataError"` | Discriminant |
| `url` | `string` | Request URL |
| `code` | `string \| undefined` | OData error code |
| `details` | `any` | Full error details object |

Type guard: `isODataError(error)`

When it occurs: Server returns an OData error response body (`{ error: { code, message } }`).

## SchemaLockedError

FileMaker schema is locked (error code 303).

| Property | Type | Description |
|----------|------|-------------|
| `kind` | `"SchemaLockedError"` | Discriminant |
| `url` | `string` | Request URL |
| `code` | `string` | Always `"303"` |
| `details` | `any` | Full error details |

Type guard: `isSchemaLockedError(error)`

When it occurs: Schema modification attempted while another user/process has the schema locked in FileMaker.

## ValidationError

Schema validation failure (Standard Schema format).

| Property | Type | Description |
|----------|------|-------------|
| `kind` | `"ValidationError"` | Discriminant |
| `field` | `string \| undefined` | Field that failed validation |
| `issues` | `readonly StandardSchemaV1.Issue[]` | Validation issues array |
| `value` | `unknown` | The value that failed validation |

Type guard: `isValidationError(error)`

When it occurs: A read/write validator on a field rejects data during query response processing or insert/update input transformation.

## ResponseStructureError

Unexpected response shape from the API.

| Property | Type | Description |
|----------|------|-------------|
| `kind` | `"ResponseStructureError"` | Discriminant |
| `expected` | `string` | Description of expected structure |
| `received` | `any` | The actual response received |

Type guard: `isResponseStructureError(error)`

When it occurs: API response doesn't match expected OData format (missing `value` array, wrong shape, etc.).

## RecordCountMismatchError

Returned when `.single()` or `.maybeSingle()` expectations are not met.

| Property | Type | Description |
|----------|------|-------------|
| `kind` | `"RecordCountMismatchError"` | Discriminant |
| `expected` | `number \| "one" \| "at-most-one"` | Expected count |
| `received` | `number` | Actual count |

Type guard: `isRecordCountMismatchError(error)`

When it occurs:
- `.single()` used but 0 or 2+ records returned
- `.maybeSingle()` used but 2+ records returned

## InvalidLocationHeaderError

Insert operation could not parse the Location header.

| Property | Type | Description |
|----------|------|-------------|
| `kind` | `"InvalidLocationHeaderError"` | Discriminant |
| `locationHeader` | `string \| undefined` | The raw Location header value |

When it occurs: Insert with `returnFullRecord: false` returns a Location header that cannot be parsed for ROWID extraction.

## ResponseParseError

Failed to parse response body as JSON.

| Property | Type | Description |
|----------|------|-------------|
| `kind` | `"ResponseParseError"` | Discriminant |
| `url` | `string` | Request URL |
| `rawText` | `string \| undefined` | Raw response text (if captured) |

Type guard: `isResponseParseError(error)`

When it occurs: Server returns invalid JSON or non-JSON response for an expected JSON endpoint.

## BatchTruncatedError

Operation in a batch was never executed because an earlier operation failed.

| Property | Type | Description |
|----------|------|-------------|
| `kind` | `"BatchTruncatedError"` | Discriminant |
| `operationIndex` | `number` | Index of this (truncated) operation |
| `failedAtIndex` | `number` | Index of the operation that caused truncation |

Type guard: `isBatchTruncatedError(error)`

When it occurs: FileMaker stops batch processing on first error. All subsequent operations get this error with `status: 0` in the `BatchItemResult`.

## External Errors (from @fetchkit/ffetch)

These are re-exported from `@proofkit/fmodata` for convenience.

| Error | When it occurs |
|-------|---------------|
| `TimeoutError` | Request exceeded timeout duration |
| `AbortError` | Request was aborted via AbortController |
| `NetworkError` | Network connectivity failure (DNS, connection refused, etc.) |
| `RetryLimitError` | Request failed after exhausting retry attempts |
| `CircuitOpenError` | Circuit breaker is open (too many recent failures) |

These do not extend `FMODataError` -- use `instanceof` checks directly.

## FMODataErrorType Union

The full union type of all possible errors:

```ts
type FMODataErrorType =
  | TimeoutError
  | AbortError
  | NetworkError
  | RetryLimitError
  | CircuitOpenError
  | HTTPError
  | ODataError
  | SchemaLockedError
  | ValidationError
  | ResponseStructureError
  | RecordCountMismatchError
  | InvalidLocationHeaderError
  | ResponseParseError
  | BatchTruncatedError;
```

## Error Handling Patterns

### Pattern 1: Type guards

```ts
if (isHTTPError(result.error)) { /* status, statusText, url */ }
if (isODataError(result.error)) { /* code, details */ }
if (isValidationError(result.error)) { /* field, issues, value */ }
if (isBatchTruncatedError(result.error)) { /* operationIndex, failedAtIndex */ }
```

### Pattern 2: kind discriminant (exhaustive switch)

```ts
switch (result.error.kind) {
  case "HTTPError": break;
  case "ODataError": break;
  case "ValidationError": break;
  case "ResponseStructureError": break;
  case "RecordCountMismatchError": break;
  case "ResponseParseError": break;
  case "BatchTruncatedError": break;
  case "SchemaLockedError": break;
  case "InvalidLocationHeaderError": break;
}
```

Note: External errors (TimeoutError, NetworkError, etc.) don't have `kind` -- use `instanceof` for those.

### Pattern 3: instanceof

```ts
if (result.error instanceof HTTPError) { /* ... */ }
if (result.error instanceof TimeoutError) { /* ... */ }
if (result.error instanceof NetworkError) { /* ... */ }
```

## BatchResult Type

```ts
interface BatchResult<T extends readonly any[]> {
  results: { [K in keyof T]: BatchItemResult<T[K]> };
  successCount: number;
  errorCount: number;
  truncated: boolean;
  firstErrorIndex: number | null;
}

interface BatchItemResult<T> {
  data: T | undefined;
  error: FMODataErrorType | undefined;
  status: number; // HTTP status code, 0 for truncated
}
```
