# FMOData API Reference

Complete API reference for @proofkit/fmodata.

## Table of Contents

- [Connection & Database](#connection--database)
- [Field Builders](#field-builders)
- [Table Definition](#table-definition)
- [Filter Operators](#filter-operators)
- [Query Methods](#query-methods)
- [CRUD Operations](#crud-operations)
- [Batch Operations](#batch-operations)
- [Schema Management](#schema-management)
- [Error Types](#error-types)

## Connection & Database

### FMServerConnection

```typescript
import { FMServerConnection } from "@proofkit/fmodata";

const connection = new FMServerConnection({
  serverUrl: string,           // FileMaker server URL
  auth: {
    apiKey?: string,           // OttoFMS API key
    username?: string,         // FM username
    password?: string,         // FM password
  },
  fetchClientOptions?: {
    retries?: number,          // Retry count (default: 3)
    timeout?: number,          // Timeout in ms (default: 30000)
  }
});
```

### Database

```typescript
const db = connection.database("DatabaseName.fmp12", {
  useEntityIds?: boolean,         // Use FMFID/FMTID instead of names
  includeSpecialColumns?: boolean // Include ROWID/ROWMODID
});
```

## Field Builders

All field builders return chainable objects with these methods:

### Field Types

```typescript
import {
  textField,        // string | null
  numberField,      // number | null
  dateField,        // string | null (ISO date)
  timeField,        // string | null (ISO time)
  timestampField,   // string | null (ISO 8601)
  containerField,   // string | null (base64)
  calcField,        // string | null (auto read-only)
} from "@proofkit/fmodata";
```

### Field Builder Methods

```typescript
// Mark as primary key (auto read-only)
.primaryKey()

// Mark as required
.notNull()

// Mark as read-only (excluded from insert/update)
.readOnly()

// Set FileMaker field ID for schema-resilient code
.entityId("FMFID:12345")

// Add documentation
.comment("Description of this field")

// Validate/transform on read (FM → TypeScript)
.readValidator(z.coerce.boolean())

// Validate/transform on write (TypeScript → FM)
.writeValidator(z.boolean().transform(v => v ? 1 : 0))
```

### Common Validator Patterns

```typescript
// Boolean field (FM stores as 0/1)
numberField()
  .readValidator(z.coerce.boolean())
  .writeValidator(z.boolean().transform(v => v ? 1 : 0))

// Enum field
textField()
  .readValidator(z.enum(["active", "pending", "inactive"]))
  .writeValidator(z.enum(["active", "pending", "inactive"]))

// Nullable with default
textField()
  .readValidator(z.string().nullable().catch(""))

// Numeric string
textField()
  .readValidator(z.coerce.number())
```

## Table Definition

### fmTableOccurrence

```typescript
import { fmTableOccurrence } from "@proofkit/fmodata";

const Users = fmTableOccurrence(
  "TableName",           // OData entity set name
  {
    // Field definitions
    id: textField().primaryKey(),
    name: textField().notNull(),
  },
  {
    // Options
    entityId?: "FMTID:100",              // Table entity ID
    comment?: "Table description",        // Documentation
    navigationPaths?: ["Related", "Tables"], // Valid expand/navigate targets
    defaultSelect?: "schema" | "all" | ((cols) => selectObject),
  }
);
```

### Default Select Options

```typescript
// Only defined non-container fields
{ defaultSelect: "schema" }

// All available fields
{ defaultSelect: "all" }

// Custom selection function
{ defaultSelect: (cols) => ({ id: cols.id, name: cols.name }) }
```

## Filter Operators

### Comparison

```typescript
import { eq, ne, gt, gte, lt, lte } from "@proofkit/fmodata";

.where(eq(Users.status, "active"))     // =
.where(ne(Users.status, "deleted"))    // !=
.where(gt(Users.age, 18))              // >
.where(gte(Users.age, 18))             // >=
.where(lt(Users.age, 65))              // <
.where(lte(Users.age, 65))             // <=
```

### String

```typescript
import { contains, startsWith, endsWith } from "@proofkit/fmodata";

.where(contains(Users.email, "@example.com"))
.where(startsWith(Users.name, "John"))
.where(endsWith(Users.email, ".com"))
```

### Array

```typescript
import { inArray, notInArray } from "@proofkit/fmodata";

.where(inArray(Users.role, ["admin", "moderator"]))
.where(notInArray(Users.status, ["deleted", "banned"]))
```

### Null Checks

```typescript
import { isNull, isNotNull } from "@proofkit/fmodata";

.where(isNull(Users.deletedAt))
.where(isNotNull(Users.email))
```

### Logical

```typescript
import { and, or, not } from "@proofkit/fmodata";

.where(and(
  eq(Users.active, true),
  or(
    eq(Users.role, "admin"),
    gt(Users.age, 18)
  )
))

.where(not(eq(Users.status, "deleted")))
```

### Ordering

```typescript
import { asc, desc } from "@proofkit/fmodata";

.orderBy(asc(Users.name))
.orderBy(desc(Users.createdAt))
.orderBy(asc(Users.lastName), asc(Users.firstName))  // Multiple
```

## Query Methods

### List (Multiple Records)

```typescript
const result = await db.from(Users).list()
  .select({ id: Users.id, name: Users.name })  // Field selection
  .where(eq(Users.active, true))               // Filter
  .orderBy(asc(Users.name))                    // Sort
  .top(10)                                     // Limit
  .skip(20)                                    // Offset
  .execute();

// Result: { data: T[], error: undefined } | { data: undefined, error: Error }
```

### Get (Single Record)

```typescript
const result = await db.from(Users).get("record-id")
  .select({ id: Users.id, name: Users.name })
  .execute();

// Result: { data: T, error: undefined } | { data: undefined, error: Error }
```

### Expand (Related Records)

```typescript
const result = await db.from(Users).list()
  .expand(Contacts, (builder) =>
    builder
      .select({ name: Contacts.name, email: Contacts.email })
      .where(eq(Contacts.active, true))
      .top(5)
  )
  .execute();
```

### Navigate (From Record to Related)

```typescript
const result = await db.from(Contacts).get("contact-123")
  .navigate(Users)
  .select({ username: Users.username })
  .execute();
```

## CRUD Operations

### Insert

```typescript
const result = await db.from(Users)
  .insert({
    name: "John Doe",           // Required fields (notNull)
    email: "john@example.com",
    // id excluded (primaryKey)
    // createdAt excluded (readOnly)
  })
  .execute();

// Result: { data: InsertedRecord, error: undefined } | { data: undefined, error: Error }
```

### Update

```typescript
// Update by ID
const result = await db.from(Users)
  .update({ name: "Jane Doe" })
  .byId("user-123")
  .execute();

// Result: { data: UpdatedRecord, error: undefined } | { data: undefined, error: Error }
```

### Delete

```typescript
// Delete by ID
const result = await db.from(Users)
  .delete()
  .byId("user-123")
  .execute();

// Delete with filter
const result = await db.from(Users)
  .delete()
  .where(eq(Users.status, "inactive"))
  .execute();
```

## Batch Operations

Execute multiple operations atomically:

```typescript
const result = await db.batch([
  db.from(Users).list().top(10),
  db.from(Users).insert({ name: "Alice", email: "alice@example.com" }),
  db.from(Users).update({ active: true }).byId("user-456"),
  db.from(Users).delete().byId("user-789"),
]).execute();

// Access individual results
const [listResult, insertResult, updateResult, deleteResult] = result.results;

if (listResult.error) {
  console.error("List failed:", listResult.error);
} else {
  console.log("Users:", listResult.data);
}
```

## Schema Management

### Create Table

```typescript
await db.schema.createTable("NewTable", [
  { name: "id", type: "text" },
  { name: "name", type: "text" },
]);
```

### Delete Table

```typescript
await db.schema.deleteTable("OldTable");
```

### Add Field

```typescript
await db.schema.addField("TableName", {
  name: "newField",
  type: "text",
});
```

### Remove Field

```typescript
await db.schema.removeField("TableName", "fieldName");
```

## Webhooks

```typescript
// Create webhook
await db.webhook.create({
  url: "https://your-server.com/webhook",
  events: ["create", "update", "delete"],
  table: "Users",
});

// List webhooks
const webhooks = await db.webhook.list();

// Delete webhook
await db.webhook.delete(webhookId);
```

## Error Types

### HTTP Errors

```typescript
import { HTTPError, isHTTPError } from "@proofkit/fmodata";

if (isHTTPError(error)) {
  error.status;        // HTTP status code
  error.statusText;    // Status message
  error.isNotFound();  // 404
  error.is4xx();       // 400-499
  error.is5xx();       // 500-599
}
```

### Specific Error Types

```typescript
import {
  ValidationError,      // Schema validation failed
  TimeoutError,         // Request timed out
  NetworkError,         // Network connectivity issue
  ODataError,           // OData-specific error
  RecordCountMismatchError,
  BatchTruncatedError,
  SchemaLockedError,
} from "@proofkit/fmodata";

if (error instanceof ValidationError) {
  error.field;    // Field that failed
  error.issues;   // Validation issues
}

if (error instanceof TimeoutError) {
  error.timeout;  // Timeout duration
}
```

### Error Handling Pattern

```typescript
const result = await db.from(Users).list().execute();

if (result.error) {
  // Handle error
  console.error(result.error);
  return;
}

// Use typed data
const users = result.data;
```

## Run FileMaker Scripts

```typescript
const result = await db.runScript("ScriptName", {
  parameter: "optional script parameter"
});
```
