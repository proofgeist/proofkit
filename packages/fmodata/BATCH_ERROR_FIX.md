# Batch Operation Error Handling Fix

## Problem

When batch operations encountered an error (e.g., querying a non-existent table), the error message was vague and unhelpful:

```
Error [ResponseStructureError]: Invalid response structure: expected 'value' property to be an array

{
  timestamp: 2025-12-05T22:53:53.218Z,
  kind: 'ResponseStructureError',
  expected: "'value' property to be an array",
  received: undefined
}
```

This error appeared to be a validation error, but it was actually masking the real FileMaker OData error response that contained useful information like:
- Error code: `-1020`
- Error message: `Table 'Purchase_Orders' not defined in database`

## Root Cause

The `processResponse` methods in all builder classes (QueryBuilder, InsertBuilder, UpdateBuilder, DeleteBuilder, RecordBuilder) were not checking for HTTP error responses before attempting to parse the response body as data.

In batch operations, when FileMaker returns a 404 error with an error JSON body, the builders would try to validate it as a data response, leading to the vague `ResponseStructureError`.

## Solution

### 1. Created Shared Error Parser (`src/client/error-parser.ts`)

Created a new helper function `parseErrorResponse` that:
- Checks for JSON error responses from FileMaker
- Extracts the OData error structure (`{ error: { code, message } }`)
- Returns appropriate error objects:
  - `ODataError` for standard OData errors
  - `SchemaLockedError` for code 303 errors
  - `HTTPError` as fallback

### 2. Updated All Builder `processResponse` Methods

Added error checking at the start of each `processResponse` method:

```typescript
async processResponse(response: Response, options?: ExecuteOptions) {
  // Check for error responses (important for batch operations)
  if (!response.ok) {
    const error = await parseErrorResponse(
      response,
      response.url || `/${this.databaseName}/${this.tableName}`,
    );
    return { data: undefined, error };
  }
  
  // ... rest of response processing
}
```

Updated files:
- `src/client/query-builder.ts`
- `src/client/insert-builder.ts`
- `src/client/update-builder.ts`
- `src/client/delete-builder.ts`
- `src/client/record-builder.ts`

## Result

### Before
```
Error [ResponseStructureError]: Invalid response structure: expected 'value' property to be an array
kind: 'ResponseStructureError'
expected: "'value' property to be an array"
received: undefined
```

### After
```
Error [ODataError]: OData error: Table 'Purchase_Orders' not defined in database
kind: 'ODataError'
code: '-1020'
message: "OData error: Table 'Purchase_Orders' not defined in database"
details: { code: '-1020', message: "Table 'Purchase_Orders' not defined in database" }
```

## Testing

### Unit Tests
- ✅ All existing tests pass (622 tests)
- ✅ Enhanced `tests/batch.test.ts` with error detail assertions
- ✅ Added `tests/batch-error-messages.test.ts` demonstrating the fix

### Example Usage

```typescript
const result = await db
  .batch([punchlistQuery, purchaseOrdersQuery, ticketsQuery])
  .execute();

const [r1, r2, r3] = result.results;

// Check if query failed
if (r2.error) {
  if (isODataError(r2.error)) {
    console.log(`Error Code: ${r2.error.code}`);        // -1020
    console.log(`Error Message: ${r2.error.message}`);  // Table not defined
    console.log(`HTTP Status: ${r2.status}`);           // 404
  }
}
```

## Benefits

1. **Better Developer Experience**: Error messages now contain actionable information
2. **Easier Debugging**: Can identify the exact issue (table name typo, missing table, etc.)
3. **Consistent Error Handling**: Batch operations now return the same error types as single operations
4. **Type Safety**: Can use type guards (`isODataError`, `isHTTPError`) to handle specific error types

## Backward Compatibility

✅ **Fully backward compatible**
- Existing error handling code continues to work
- Added functionality doesn't break existing APIs
- All 622 existing tests pass without modification

