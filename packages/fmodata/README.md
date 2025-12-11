# @proofkit/fmodata Documentation

A strongly-typed FileMaker OData API client.

⚠️ WARNING: This library is in "alpha" status. It's still in active development and the API is subject to change. Feedback is welcome on the [community forum](https://community.ottomatic.cloud/c/proofkit/13) or on [GitHub](https://github.com/proofgeist/proofkit/issues).

Roadmap:

- [ ] Crossjoin support
- [x] Batch operations
  - [ ] Automatically chunk requests into smaller batches (e.g. max 512 inserts per batch)
- [x] Schema updates (add/update tables and fields)
- [ ] Proper docs at proofkit.dev
- [ ] @proofkit/typegen integration

## Installation

```bash
pnpm add @proofkit/fmodata@alpha
```

## Quick Start

Here's a minimal example to get you started:

```typescript
import {
  FMServerConnection,
  defineBaseTable,
  defineTableOccurrence,
} from "@proofkit/fmodata";
import { z } from "zod/v4";

// 1. Create a connection to the server
const connection = new FMServerConnection({
  serverUrl: "https://your-server.com",
  auth: {
    // OttoFMS API key
    apiKey: "your-api-key",

    // or username and password
    // username: "admin",
    // password: "password",
  },
});

// 2. Define your table schema
const usersBase = defineBaseTable({
  schema: {
    id: z.string(),
    username: z.string(),
    email: z.string(),
    active: z.boolean(),
  },
  idField: "id",
});

// 3. Create a table occurrence
const usersTO = defineTableOccurrence({
  name: "users",
  baseTable: usersBase,
});

// 4. Create a database instance
const db = connection.database("MyDatabase.fmp12", {
  occurrences: [usersTO],
});

// 5. Query your data
const { data, error } = await db.from("users").list().execute();

if (error) {
  console.error(error);
  return;
}

if (data) {
  console.log(data); // Array of users, properly typed
}
```

## Core Concepts

This library relies heavily on the builder pattern for defining your queries and operations. Most operations require a final call to `execute()` to send the request to the server. The builder pattern allows you to build complex queries and also supports batch operations, allowing you to execute multiple operations in a single request as supported by the FileMaker OData API. It's also helpful for testing the library, as you can call `getQueryString()` to get the OData query string without executing the request.

As such, there are layers to the library to help you build your queries and operations.

- `FMServerConnection` - hold server connection details and authentication
- `BaseTable` - defines the fields and validators for a base table
- `TableOccurrence` - references a base table, and other table occurrences for navigation
- `Database` - connects the table occurrences to the server connection

### FileMaker Server prerequisites

To use this library you need:

- OData service enabled on your FileMaker server
- A FileMaker account with `fmodata` privilege enabled
- (if using OttoFMS) a Data API key setup for your FileMaker account with OData enabled

A note on best practices:

OData relies entirely on the table occurances in the relationship graph for data access. Relationships between table occurrences are also used, but maybe not as you expect (in short, only the simplest relationships are supported). Given these constraints, it may be best for you to have a seperate FileMaker file for your OData connection, using external data sources to link to your actual data. We've found this especially helpful for larger projects that have very large graphs with lots of duplicated table occurances compared to actual base tables.

### Server Connection

The client can authenticate using username/password or API key:

```typescript
// Username and password authentication
const connection = new FMServerConnection({
  serverUrl: "https://api.example.com",
  auth: {
    username: "test",
    password: "test",
  },
});

// API key authentication
const connection = new FMServerConnection({
  serverUrl: "https://api.example.com",
  auth: {
    apiKey: "your-api-key",
  },
});
```

### Schema Definitions

This library relies on a schema-first approach for good type-safety and optional runtime validation. These are abstracted into BaseTable and TableOccurrence types to match FileMaker concepts.

Use **`defineBaseTable()`** and **`defineTableOccurrence()`** to create your schemas. These functions provide full TypeScript type inference for field names in queries.

A `BaseTable` defines the schema for your FileMaker table using Standard Schema. These examples show zod, but you can use any other validation library that supports Standard Schema.

```typescript
import { z } from "zod/v4";
import { defineBaseTable } from "@proofkit/fmodata";

const contactsBase = defineBaseTable({
  schema: {
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string().optional(),
    createdAt: z.string(),
  },
  idField: "id", // The primary key field (automatically read-only)
  required: ["phone"], // optional: additional required fields for insert (beyond auto-inferred)
  readOnly: ["createdAt"], // optional: fields excluded from insert/update
});
```

A `TableOccurrence` is the actual entry point for the OData service on the FileMaker server. It allows you to reference the same base table multiple times with different names.

```typescript
import { defineTableOccurrence } from "@proofkit/fmodata";

const contactsTO = defineTableOccurrence({
  name: "contacts", // The table occurrence name in FileMaker
  baseTable: contactsBase,
});
```

#### Default Field Selection

FileMaker will automatically return all non-container fields from a schema if you don't specify a $select parameter in your query. This library forces you to be a bit more explicit about what fields you want to return so that the types will more accurately reflect the full data you will get back. To modify this behavior, change the `defaultSelect` option when creating the `TableOccurrence`.

```typescript
// Option 1 (default): "schema" - Select all fields from the schema (same as "all" but more explicit)
const usersTO = defineTableOccurrence({
  name: "users",
  baseTable: usersBase,
  defaultSelect: "schema", // a $select parameter will be always be added to the query for only the fields you've defined in the BaseTable schema
});

// Option 2: "all" - Select all fields (default behavior)
const usersTO = defineTableOccurrence({
  name: "users",
  baseTable: usersBase,
  defaultSelect: "all", // Don't always a $select parameter to the query; FileMaker will return all non-container fields from the table
});

// Option 3: Array of field names - Select only specific fields by default
const usersTO = defineTableOccurrence({
  name: "users",
  baseTable: usersBase,
  defaultSelect: ["username", "email"], // Only select these fields by default
});

// When you call list(), the defaultSelect is applied automatically
const result = await db.from("users").list().execute();
// If defaultSelect is ["username", "email"], result.data will only contain those fields

// You can still override with explicit select()
const result = await db
  .from("users")
  .list()
  .select("username", "email", "age") // Always overrides at the per-request level
  .execute();
```

Lastly, you can combine all table occurrences into a database instance for the full type-safe experience. This is a method on the main `FMServerConnection` client class.

```typescript
const db = connection.database("MyDatabase.fmp12", {
  occurrences: [contactsTO, usersTO], // Register your table occurrences
});
```

## Querying Data

### Basic Queries

Use `list()` to retrieve multiple records:

```typescript
// Get all users
const result = await db.from("users").list().execute();

if (result.data) {
  result.data.forEach((user) => {
    console.log(user.username);
  });
}
```

Get a specific record by ID:

```typescript
const result = await db.from("users").get("user-123").execute();

if (result.data) {
  console.log(result.data.username);
}
```

Get a single field value:

```typescript
const result = await db
  .from("users")
  .get("user-123")
  .getSingleField("email")
  .execute();

if (result.data) {
  console.log(result.data); // "user@example.com"
}
```

### Filtering

fmodata provides type-safe filter operations that prevent common errors at compile time. The filter system supports three syntaxes: shorthand, single operator objects, and arrays for multiple operators.

#### Operator Syntax

You can use filters in three ways:

**1. Shorthand (direct value):**

```typescript
.filter({ name: "John" })
// Equivalent to: { name: [{ eq: "John" }] }
```

**2. Single operator object:**

```typescript
.filter({ age: { gt: 18 } })
```

**3. Array of operators (for multiple operators on same field):**

```typescript
.filter({ age: [{ gt: 18 }, { lt: 65 }] })
// Result: age gt 18 and age lt 65
```

The array pattern prevents duplicate operators on the same field and allows multiple conditions with implicit AND.

#### Available Operators

**String fields:**

- `eq`, `ne` - equality/inequality
- `contains`, `startswith`, `endswith` - string functions
- `gt`, `ge`, `lt`, `le` - comparison
- `in` - match any value in array

**Number fields:**

- `eq`, `ne`, `gt`, `ge`, `lt`, `le` - comparisons
- `in` - match any value in array

**Boolean fields:**

- `eq`, `ne` - equality only

**Date fields:**

- `eq`, `ne`, `gt`, `ge`, `lt`, `le` - date comparisons
- `in` - match any date in array

#### Shorthand Syntax

For simple equality checks, use the shorthand:

```typescript
const result = await db.from("users").list().filter({ name: "John" }).execute();
// Equivalent to: { name: [{ eq: "John" }] }
```

#### Examples

```typescript
// Equality filter (single operator)
const activeUsers = await db
  .from("users")
  .list()
  .filter({ active: { eq: true } })
  .execute();

// Comparison operators (single operator)
const adultUsers = await db
  .from("users")
  .list()
  .filter({ age: { gt: 18 } })
  .execute();

// String operators (single operator)
const johns = await db
  .from("users")
  .list()
  .filter({ name: { contains: "John" } })
  .execute();

// Multiple operators on same field (array syntax, implicit AND)
const rangeQuery = await db
  .from("users")
  .list()
  .filter({ age: [{ gt: 18 }, { lt: 65 }] })
  .execute();

// Combine filters with AND
const result = await db
  .from("users")
  .list()
  .filter({
    and: [{ active: [{ eq: true }] }, { age: [{ gt: 18 }] }],
  })
  .execute();

// Combine filters with OR
const result = await db
  .from("users")
  .list()
  .filter({
    or: [{ name: [{ eq: "John" }] }, { name: [{ eq: "Jane" }] }],
  })
  .execute();

// IN operator
const result = await db
  .from("users")
  .list()
  .filter({ age: [{ in: [18, 21, 25] }] })
  .execute();

// Null checks
const result = await db
  .from("users")
  .list()
  .filter({ deletedAt: [{ eq: null }] })
  .execute();
```

#### Logical Operators

Combine multiple conditions with `and`, `or`, `not`:

```typescript
const result = await db
  .from("users")
  .list()
  .filter({
    and: [{ name: [{ contains: "John" }] }, { age: [{ gt: 18 }] }],
  })
  .execute();
```

#### Escape Hatch

For unsupported edge cases, pass a raw OData filter string:

```typescript
const result = await db
  .from("users")
  .list()
  .filter("substringof('John', name)")
  .execute();
```

### Sorting

Sort results using `orderBy()`. The method is fully type-safe for typed databases, providing autocomplete for field names and sort directions.

#### Single Field

```typescript
// Sort ascending (default direction)
const result = await db.from("users").list().orderBy("name").execute();

// Explicit direction using tuple syntax
const result = await db
  .from("users")
  .list()
  .orderBy(["name", "desc"])
  .execute();
```

#### Multiple Fields

Use an array of tuples to sort by multiple fields:

```typescript
// Multiple fields with explicit directions
const result = await db
  .from("users")
  .list()
  .orderBy([
    ["lastName", "asc"],
    ["firstName", "desc"],
  ])
  .execute();
```

#### Type Safety

For typed databases, `orderBy()` provides full type safety:

```typescript
// ✅ Valid - "name" is a field in the schema
db.from("users").list().orderBy("name");

// ✅ Valid - tuple with field and direction
db.from("users").list().orderBy(["name", "asc"]);

// ❌ TypeScript Error - "invalid" is not a field
db.from("users").list().orderBy("invalid");

// ❌ TypeScript Error - "name" is not a valid direction
db.from("users").list().orderBy(["email", "name"]);

// ❌ TypeScript Error - second value must be "asc" or "desc"
db.from("users").list().orderBy(["email", "invalid"]);
```

#### Escape Hatch (Untyped Databases)

For untyped databases (no schema), raw strings are still accepted:

```typescript
const untypedDb = connection.database("MyDB"); // No occurrences
const result = await untypedDb
  .from("users")
  .list()
  .orderBy("name desc") // Raw string accepted
  .execute();
```

### Pagination

Control the number of records returned and pagination:

```typescript
// Limit results
const result = await db.from("users").list().top(10).execute();

// Skip records (pagination)
const result = await db.from("users").list().top(10).skip(20).execute();

// Count total records
const result = await db.from("users").list().count().execute();
```

### Selecting Fields

Select specific fields to return:

```typescript
const result = await db
  .from("users")
  .list()
  .select("username", "email")
  .execute();

// result.data[0] will only have username and email fields
```

### Single Records

Use `single()` to ensure exactly one record is returned (returns an error if zero or multiple records are found):

```typescript
const result = await db
  .from("users")
  .list()
  .filter({ email: { eq: "user@example.com" } })
  .single()
  .execute();

if (result.data) {
  // result.data is a single record, not an array
  console.log(result.data.username);
}
```

Use `maybeSingle()` when you want at most one record (returns `null` if no record is found, returns an error if multiple records are found):

```typescript
const result = await db
  .from("users")
  .list()
  .filter({ email: { eq: "user@example.com" } })
  .maybeSingle()
  .execute();

if (result.data) {
  // result.data is a single record or null
  console.log(result.data?.username);
} else {
  // No record found - result.data would be null
  console.log("User not found");
}
```

**Difference between `single()` and `maybeSingle()`:**

- `single()` - Requires exactly one record. Returns an error if zero or multiple records are found.
- `maybeSingle()` - Allows zero or one record. Returns `null` if no record is found, returns an error only if multiple records are found.

### Chaining Methods

All query methods can be chained together:

```typescript
const result = await db
  .from("users")
  .list()
  .select("username", "email", "age")
  .filter({ age: { gt: 18 } })
  .orderBy("username")
  .top(10)
  .skip(0)
  .execute();
```

## CRUD Operations

### Insert

Insert new records with type-safe data:

```typescript
// Insert a new user
const result = await db
  .from("users")
  .insert({
    username: "johndoe",
    email: "john@example.com",
    active: true,
  })
  .execute();

if (result.data) {
  console.log("Created user:", result.data);
}
```

Fields are automatically required for insert if their validator doesn't allow `null` or `undefined`. You can specify additional required fields:

```typescript
const usersBase = defineBaseTable({
  schema: {
    id: z.string(), // Auto-required (not nullable), but excluded from insert (idField)
    username: z.string(), // Auto-required (not nullable)
    email: z.string(), // Auto-required (not nullable)
    phone: z.string().nullable(), // Optional by default
    createdAt: z.string(), // Auto-required, but excluded (readOnly)
  },
  idField: "id", // Automatically excluded from insert/update
  required: ["phone"], // Make phone required for inserts despite being nullable
  readOnly: ["createdAt"], // Exclude from insert/update operations
});

// TypeScript enforces: username, email, and phone are required
// TypeScript excludes: id and createdAt cannot be provided
const result = await db
  .from("users")
  .insert({
    username: "johndoe",
    email: "john@example.com",
    phone: "+1234567890", // Required because specified in 'required' array
  })
  .execute();
```

### Update

Update records by ID or filter:

```typescript
// Update by ID
const result = await db
  .from("users")
  .update({ username: "newname" })
  .byId("user-123")
  .execute();

if (result.data) {
  console.log(`Updated ${result.data.updatedCount} record(s)`);
}

// Update by filter
const result = await db
  .from("users")
  .update({ active: false })
  .where((q) => q.filter({ lastLogin: { lt: "2023-01-01" } }))
  .execute();

// Complex filter example
const result = await db
  .from("users")
  .update({ active: false })
  .where((q) =>
    q.filter({
      and: [{ active: true }, { count: { lt: 5 } }],
    }),
  )
  .execute();

// Update with additional query options
const result = await db
  .from("users")
  .update({ active: false })
  .where((q) => q.filter({ active: true }).top(10))
  .execute();
```

### Delete

Delete records by ID or filter:

```typescript
// Delete by ID
const result = await db.from("users").delete().byId("user-123").execute();

if (result.data) {
  console.log(`Deleted ${result.data.deletedCount} record(s)`);
}

// Delete by filter
const result = await db
  .from("users")
  .delete()
  .where((q) => q.filter({ active: false }))
  .execute();

// Delete with complex filters
const result = await db
  .from("users")
  .delete()
  .where((q) =>
    q.filter({
      and: [{ active: false }, { lastLogin: { lt: "2023-01-01" } }],
    }),
  )
  .execute();
```

## Navigation & Relationships

### Defining Navigation

Use `buildOccurrences()` to define relationships between tables. This function takes an array of table occurrences and a configuration object that specifies navigation relationships using type-safe string references:

```typescript
import {
  defineBaseTable,
  defineTableOccurrence,
  buildOccurrences,
} from "@proofkit/fmodata";

const contactsBase = defineBaseTable({
  schema: {
    id: z.string(),
    name: z.string(),
    userId: z.string(),
  },
  idField: "id",
});

const usersBase = defineBaseTable({
  schema: {
    id: z.string(),
    username: z.string(),
    email: z.string(),
  },
  idField: "id",
});

// Step 1: Define base table occurrences (without navigation)
const _contactsTO = defineTableOccurrence({
  name: "contacts",
  baseTable: contactsBase,
});

const _usersTO = defineTableOccurrence({
  name: "users",
  baseTable: usersBase,
});

// Step 2: Build occurrences with navigation using string references
// The strings autocomplete to valid table occurrence names!
const occurrences = buildOccurrences({
  occurrences: [_contactsTO, _usersTO],
  navigation: {
    contacts: ["users"],
    users: ["contacts"],
  },
});

// Use with your database
const db = connection.database("MyDB", {
  occurrences: occurrences,
});
```

The `buildOccurrences` function accepts an object with:

- `occurrences` - Array of TableOccurrences to build
- `navigation` - Optional object mapping TO names to arrays of navigation targets

It returns a tuple in the same order as the input array, with full autocomplete for navigation target names. Self-navigation is prevented at the type level.

- Handles circular references automatically
- Returns fully typed `TableOccurrence` instances with resolved navigation

### Navigating Between Tables

Navigate to related records:

```typescript
// Navigate from a specific record
const result = await db
  .from("contacts")
  .get("contact-123")
  .navigate("users")
  .select("username", "email")
  .execute();

// Navigate without specifying a record first
const result = await db.from("contacts").navigate("users").list().execute();

// You can navigate to arbitrary tables not in your schema
const result = await db
  .from("contacts")
  .navigate("some_other_table")
  .list()
  .execute();
```

### Expanding Related Records

Use `expand()` to include related records in your query results:

```typescript
// Simple expand
const result = await db.from("contacts").list().expand("users").execute();

// Expand with field selection
const result = await db
  .from("contacts")
  .list()
  .expand("users", (b) => b.select("username", "email"))
  .execute();

// Expand with filtering
const result = await db
  .from("contacts")
  .list()
  .expand("users", (b) => b.filter({ active: true }))
  .execute();

// Multiple expands
const result = await db
  .from("contacts")
  .list()
  .expand("users", (b) => b.select("username"))
  .expand("orders", (b) => b.select("total").top(5))
  .execute();

// Nested expands
const result = await db
  .from("contacts")
  .list()
  .expand("users", (usersBuilder) =>
    usersBuilder
      .select("username", "email")
      .expand("customer", (customerBuilder) =>
        customerBuilder.select("name", "tier"),
      ),
  )
  .execute();

// Complex expand with multiple options
const result = await db
  .from("contacts")
  .list()
  .expand("users", (b) =>
    b
      .select("username", "email")
      .filter({ active: true })
      .orderBy("username")
      .top(10)
      .expand("customer", (nested) => nested.select("name")),
  )
  .execute();
```

## Running Scripts

Execute FileMaker scripts via OData:

```typescript
// Simple script execution
const result = await db.runScript("MyScriptName");

console.log(result.resultCode); // Script result code
console.log(result.result); // Optional script result string

// Pass parameters to script
const result = await db.runScript("MyScriptName", {
  scriptParam: "some value",
});

// Script parameters can be strings, numbers, or objects
const result = await db.runScript("ProcessOrder", {
  scriptParam: {
    orderId: "12345",
    action: "approve",
  }, // Will be JSON stringified
});

// Validate script result with Zod schema
// NOTE: Your validator must be able to parse a string.
// See Zod codecs for how to build a jsonCodec function that does this
// https://zod.dev/codecs?id=jsonschema

const schema = jsonCodec(
  z.object({
    success: z.boolean(),
    message: z.string(),
    recordId: z.string(),
  }),
);

const result = await db.runScript("CreateRecord", {
  resultSchema: schema,
});

// result.result is now typed based on your schema
console.log(result.result.recordId);
```

**Note:** OData doesn't support script names with special characters (e.g., `@`, `&`, `/`) or script names beginning with a number. TypeScript will catch these at compile time.

## Batch Operations

Batch operations allow you to execute multiple queries and operations together in a single request. All operations in a batch are executed atomically - they all succeed or all fail together. This is both more efficient (fewer network round-trips) and ensures data consistency across related operations.

### Batch Result Structure

Batch operations return a `BatchResult` object that contains individual results for each operation. Each result has its own `data`, `error`, and `status` properties, allowing you to handle success and failure on a per-operation basis:

```typescript
type BatchItemResult<T> = {
  data: T | undefined;
  error: FMODataErrorType | undefined;
  status: number; // HTTP status code (0 for truncated operations)
};

type BatchResult<T extends readonly any[]> = {
  results: { [K in keyof T]: BatchItemResult<T[K]> };
  successCount: number;
  errorCount: number;
  truncated: boolean; // true if FileMaker stopped processing due to an error
  firstErrorIndex: number | null; // Index of the first operation that failed
};
```

### Basic Batch with Multiple Queries

Execute multiple read operations in a single batch:

```typescript
// Create query builders
const contactsQuery = db.from("contacts").list().top(5);
const usersQuery = db.from("users").list().top(5);

// Execute both queries in a single batch
const result = await db.batch([contactsQuery, usersQuery]).execute();

// Access individual results
const [r1, r2] = result.results;

if (r1.error) {
  console.error("Contacts query failed:", r1.error);
} else {
  console.log("Contacts:", r1.data);
}

if (r2.error) {
  console.error("Users query failed:", r2.error);
} else {
  console.log("Users:", r2.data);
}

// Check summary statistics
console.log(`Success: ${result.successCount}, Errors: ${result.errorCount}`);
```

### Mixed Operations (Reads and Writes)

Combine queries, inserts, updates, and deletes in a single batch:

```typescript
// Mix different operation types
const listQuery = db.from("contacts").list().top(10);
const insertOp = db.from("contacts").insert({
  name: "John Doe",
  email: "john@example.com",
});
const updateOp = db.from("users").update({ active: true }).byId("user-123");

// All operations execute atomically
const result = await db.batch([listQuery, insertOp, updateOp]).execute();

// Access individual results
const [r1, r2, r3] = result.results;

if (r1.error) {
  console.error("List query failed:", r1.error);
} else {
  console.log("Fetched contacts:", r1.data);
}

if (r2.error) {
  console.error("Insert failed:", r2.error);
} else {
  console.log("Inserted contact:", r2.data);
}

if (r3.error) {
  console.error("Update failed:", r3.error);
} else {
  console.log("Updated user:", r3.data);
}
```

### Handling Errors in Batches

When FileMaker encounters an error in a batch operation, it **stops processing** subsequent operations. Operations that were never executed due to an earlier error will have a `BatchTruncatedError`:

```typescript
import { BatchTruncatedError, isBatchTruncatedError } from "@proofkit/fmodata";

const result = await db.batch([query1, query2, query3]).execute();

const [r1, r2, r3] = result.results;

// First operation succeeded
if (r1.error) {
  console.error("First query failed:", r1.error);
} else {
  console.log("First query succeeded:", r1.data);
}

// Second operation failed
if (r2.error) {
  console.error("Second query failed:", r2.error);
  console.log("HTTP Status:", r2.status); // e.g., 404
}

// Third operation was never executed (truncated)
if (r3.error && isBatchTruncatedError(r3.error)) {
  console.log("Third operation was not executed");
  console.log(`Failed at operation ${r3.error.failedAtIndex}`);
  console.log(`This operation index: ${r3.error.operationIndex}`);
  console.log("Status:", r3.status); // 0 (never executed)
}

// Check if batch was truncated
if (result.truncated) {
  console.log(`Batch stopped early at index ${result.firstErrorIndex}`);
}
```

### Transactional Behavior

Batch operations are transactional for write operations (inserts, updates, deletes). If any operation in the batch fails, all write operations are rolled back:

```typescript
const result = await db
  .batch([
    db.from("users").insert({ username: "alice", email: "alice@example.com" }),
    db.from("users").insert({ username: "bob", email: "bob@example.com" }),
    db.from("users").insert({ username: "charlie", email: "invalid" }), // This fails
  ])
  .execute();

// Check individual results
const [r1, r2, r3] = result.results;

if (r1.error || r2.error || r3.error) {
  // All three inserts are rolled back - no users were created
  console.error("Batch had errors:");
  if (r1.error) console.error("Operation 1:", r1.error);
  if (r2.error) console.error("Operation 2:", r2.error);
  if (r3.error) console.error("Operation 3:", r3.error);
}
```

### Important Notes

- **FileMaker stops on first error**: When an error occurs, FileMaker stops processing subsequent operations in the batch. Truncated operations will have `BatchTruncatedError` with `status: 0`.
- **Insert operations in batches**: FileMaker ignores `Prefer: return=representation` in batch requests. Insert operations return `{}` or `{ ROWID?: number }` instead of the full created record.
- **All results are always defined**: Every operation in the batch will have a corresponding result in `result.results`, even if it was never executed (truncated operations).
- **Summary statistics**: Use `result.successCount`, `result.errorCount`, `result.truncated`, and `result.firstErrorIndex` for quick batch status checks.

**Note:** Batch operations automatically group write operations (POST, PATCH, DELETE) into changesets for transactional behavior, while read operations (GET) are executed individually within the batch.

## Schema Management

The library provides methods for managing database schema through the `db.schema` property. You can create and delete tables, add and remove fields, and manage indexes.

### Creating Tables

Create a new table with field definitions:

```typescript
import type { Field } from "@proofkit/fmodata";

const fields: Field[] = [
  {
    name: "id",
    type: "string",
    primary: true,
    maxLength: 36,
  },
  {
    name: "username",
    type: "string",
    nullable: false,
    unique: true,
    maxLength: 50,
  },
  {
    name: "email",
    type: "string",
    nullable: false,
    maxLength: 255,
  },
  {
    name: "age",
    type: "numeric",
    nullable: true,
  },
  {
    name: "created_at",
    type: "timestamp",
    default: "CURRENT_TIMESTAMP",
  },
];

const tableDefinition = await db.schema.createTable("users", fields);
console.log(tableDefinition.tableName); // "users"
console.log(tableDefinition.fields); // Array of field definitions
```

### Field Types

The library supports various field types:

**String Fields:**

```typescript
{
  name: "username",
  type: "string",
  maxLength: 100, // Optional: varchar(100)
  nullable: true,
  unique: true,
  default: "USER" | "USERNAME" | "CURRENT_USER", // Optional
  repetitions: 5, // Optional: for repeating fields
}
```

**Numeric Fields:**

```typescript
{
  name: "age",
  type: "numeric",
  nullable: true,
  primary: false,
  unique: false,
}
```

**Date Fields:**

```typescript
{
  name: "birth_date",
  type: "date",
  default: "CURRENT_DATE" | "CURDATE", // Optional
  nullable: true,
}
```

**Time Fields:**

```typescript
{
  name: "start_time",
  type: "time",
  default: "CURRENT_TIME" | "CURTIME", // Optional
  nullable: true,
}
```

**Timestamp Fields:**

```typescript
{
  name: "created_at",
  type: "timestamp",
  default: "CURRENT_TIMESTAMP" | "CURTIMESTAMP", // Optional
  nullable: false,
}
```

**Container Fields:**

```typescript
{
  name: "avatar",
  type: "container",
  externalSecurePath: "/secure/path", // Optional
  nullable: true,
}
```

### Adding Fields to Existing Tables

Add new fields to an existing table:

```typescript
const newFields: Field[] = [
  {
    name: "phone",
    type: "string",
    nullable: true,
    maxLength: 20,
  },
  {
    name: "bio",
    type: "string",
    nullable: true,
    maxLength: 1000,
  },
];

const updatedTable = await db.schema.addFields("users", newFields);
```

### Deleting Tables and Fields

Delete an entire table:

```typescript
await db.schema.deleteTable("old_table");
```

Delete a specific field from a table:

```typescript
await db.schema.deleteField("users", "old_field");
```

### Managing Indexes

Create an index on a field:

```typescript
const index = await db.schema.createIndex("users", "email");
console.log(index.indexName); // "email"
```

Delete an index:

```typescript
await db.schema.deleteIndex("users", "email");
```

### Complete Example

Here's a complete example of creating a table with various field types:

```typescript
const fields: Field[] = [
  // Primary key
  {
    name: "id",
    type: "string",
    primary: true,
    maxLength: 36,
  },

  // String fields
  {
    name: "username",
    type: "string",
    nullable: false,
    unique: true,
    maxLength: 50,
  },
  {
    name: "email",
    type: "string",
    nullable: false,
    maxLength: 255,
  },

  // Numeric field
  {
    name: "age",
    type: "numeric",
    nullable: true,
  },

  // Date/time fields
  {
    name: "birth_date",
    type: "date",
    nullable: true,
  },
  {
    name: "created_at",
    type: "timestamp",
    default: "CURRENT_TIMESTAMP",
    nullable: false,
  },

  // Container field
  {
    name: "avatar",
    type: "container",
    nullable: true,
  },

  // Repeating field
  {
    name: "tags",
    type: "string",
    repetitions: 5,
    maxLength: 50,
  },
];

// Create the table
const table = await db.schema.createTable("users", fields);

// Later, add more fields
await db.schema.addFields("users", [
  {
    name: "phone",
    type: "string",
    nullable: true,
  },
]);

// Create an index on email
await db.schema.createIndex("users", "email");
```

**Note:** Schema management operations require appropriate access privileges on your FileMaker account. Operations will throw errors if you don't have the necessary permissions.

## Advanced Features

### Type Safety

The library provides full TypeScript type inference:

```typescript
const usersBase = defineBaseTable({
  schema: {
    id: z.string(),
    username: z.string(),
    email: z.string(),
  },
  idField: "id",
});

const usersTO = defineTableOccurrence({
  name: "users",
  baseTable: usersBase,
});

const db = connection.database("MyDB", {
  occurrences: [usersTO],
});

// TypeScript knows these are valid field names
db.from("users").list().select("username", "email");

// TypeScript error: "invalid" is not a field name
db.from("users").list().select("invalid"); // TS Error

// Type-safe filters
db.from("users")
  .list()
  .filter({ username: { eq: "john" } }); // ✓
db.from("users")
  .list()
  .filter({ invalid: { eq: "john" } }); // TS Error
```

### Required and Read-Only Fields

The library automatically infers which fields are required based on whether their validator allows `null` or `undefined`:

```typescript
const usersBase = defineBaseTable({
  schema: {
    id: z.string(), // Auto-required, auto-readOnly (idField)
    username: z.string(), // Auto-required (not nullable)
    email: z.string(), // Auto-required (not nullable)
    status: z.string().nullable(), // Optional (nullable)
    createdAt: z.string(), // Read-only system field
    updatedAt: z.string().nullable(), // Optional
  },
  idField: "id", // Automatically excluded from insert/update
  required: ["status"], // Make status required despite being nullable
  readOnly: ["createdAt"], // Exclude createdAt from insert/update
});

// Insert: username, email, and status are required
// Insert: id and createdAt are excluded (cannot be provided)
db.from("users").insert({
  username: "john",
  email: "john@example.com",
  status: "active", // Required due to 'required' array
  updatedAt: new Date().toISOString(), // Optional
});

// Update: all fields are optional except id and createdAt are excluded
db.from("users")
  .update({
    status: "active", // Optional
    // id and createdAt cannot be modified
  })
  .byId("user-123");
```

**Key Features:**

- **Auto-inference:** Non-nullable fields are automatically required for insert
- **Additional requirements:** Use `required` to make nullable fields required for new records
- **Read-only fields:** Use `readOnly` to exclude fields from insert/update (e.g., timestamps)
- **Automatic ID exclusion:** The `idField` is always read-only without needing to specify it
- **Update flexibility:** All fields are optional for updates (except read-only fields)

### Prefer: fmodata.entity-ids

This library supports using FileMaker's internal field identifiers (FMFID) and table occurrence identifiers (FMTID) instead of names. This protects your integration from both field and table occurrence name changes.

To enable this feature, simply define your schema with entity IDs using the `defineBaseTable` and `defineTableOccurrence` functions. Behind the scenes, the library will transform your request and the response back to the names you specify in these schemas. This is an all-or-nothing feature. For it to work properly, you must define all table occurrences passed to a `Database` with entity IDs (both `fmfIds` on the base table and `fmtId` on the table occurrence).

_Note for OttoFMS proxy: This feature requires version 4.14 or later of OttoFMS_

How do I find these ids? They can be found in the XML version of the `$metadata` endpoint for your database, or you can calculate them using these [custom functions](https://github.com/rwu2359/CFforID) from John Renfrew

#### Basic Usage

```typescript
import { defineBaseTable, defineTableOccurrence } from "@proofkit/fmodata";
import { z } from "zod/v4";

// Define a base table with FileMaker field IDs
const usersBase = defineBaseTable({
  schema: {
    id: z.string(),
    username: z.string(),
    email: z.string().nullable(),
    createdAt: z.string(),
  },
  idField: "id",
  fmfIds: {
    id: "FMFID:12039485",
    username: "FMFID:34323433",
    email: "FMFID:12232424",
    createdAt: "FMFID:43234355",
  },
});

// Create a table occurrence with a FileMaker table occurrence ID
const usersTO = defineTableOccurrence({
  name: "users",
  baseTable: usersBase,
  fmtId: "FMTID:12432533",
});
```

### Error Handling

All operations return a `Result` type with either `data` or `error`. The library provides rich error types that help you handle different error scenarios appropriately.

#### Basic Error Checking

```typescript
const result = await db.from("users").list().execute();

if (result.error) {
  console.error("Query failed:", result.error.message);
  return;
}

if (result.data) {
  console.log("Query succeeded:", result.data);
}
```

#### HTTP Errors

Handle HTTP status codes (4xx, 5xx) with the `HTTPError` class:

```typescript
import { HTTPError, isHTTPError } from "@proofkit/fmodata";

const result = await db.from("users").list().execute();

if (result.error) {
  if (isHTTPError(result.error)) {
    // TypeScript knows this is HTTPError
    console.log("HTTP Status:", result.error.status);

    if (result.error.isNotFound()) {
      console.log("Resource not found");
    } else if (result.error.isUnauthorized()) {
      console.log("Authentication required");
    } else if (result.error.is5xx()) {
      console.log("Server error - try again later");
    } else if (result.error.is4xx()) {
      console.log("Client error:", result.error.statusText);
    }

    // Access the response body if available
    if (result.error.response) {
      console.log("Error details:", result.error.response);
    }
  }
}
```

#### Network Errors

Handle network-level errors (timeouts, connection issues, etc.):

```typescript
import {
  TimeoutError,
  NetworkError,
  RetryLimitError,
  CircuitOpenError,
} from "@proofkit/fmodata";

const result = await db.from("users").list().execute();

if (result.error) {
  if (result.error instanceof TimeoutError) {
    console.log("Request timed out");
    // Show user-friendly timeout message
  } else if (result.error instanceof NetworkError) {
    console.log("Network connectivity issue");
    // Show offline message
  } else if (result.error instanceof RetryLimitError) {
    console.log("Request failed after retries");
    // Log the underlying error: result.error.cause
  } else if (result.error instanceof CircuitOpenError) {
    console.log("Service is currently unavailable");
    // Show maintenance message
  }
}
```

#### Validation Errors

When schema validation fails, you get a `ValidationError` with rich context:

```typescript
import { ValidationError, isValidationError } from "@proofkit/fmodata";

const result = await db.from("users").list().execute();

if (result.error) {
  if (isValidationError(result.error)) {
    // Access validation issues (Standard Schema format)
    console.log("Validation failed for field:", result.error.field);
    console.log("Issues:", result.error.issues);
    console.log("Failed value:", result.error.value);
  }
}
```

**Validator-Agnostic Error Handling**

The library uses [Standard Schema](https://github.com/standard-schema/standard-schema) to support any validation library (Zod, Valibot, ArkType, etc.). Following the same pattern as [uploadthing](https://github.com/pingdotgg/uploadthing), the `ValidationError.cause` property contains the normalized Standard Schema issues array:

```typescript
import { ValidationError } from "@proofkit/fmodata";

const result = await db.from("users").list().execute();

if (result.error instanceof ValidationError) {
  // The cause property (ES2022 Error.cause) contains the Standard Schema issues array
  // This is validator-agnostic and works with Zod, Valibot, ArkType, etc.
  console.log("Validation issues:", result.error.cause);
  console.log("Issues are also available directly:", result.error.issues);

  // Both point to the same array
  console.log(result.error.cause === result.error.issues); // true

  // Access additional context
  console.log("Failed field:", result.error.field);
  console.log("Failed value:", result.error.value);

  // Standard Schema issues have a normalized format
  result.error.issues.forEach((issue) => {
    console.log("Path:", issue.path);
    console.log("Message:", issue.message);
  });
}
```

**Why Standard Schema Issues Instead of Original Validator Errors?**

By using Standard Schema's normalized issue format in the `cause` property, the library remains truly validator-agnostic. All validation libraries that implement Standard Schema (Zod, Valibot, ArkType, etc.) produce the same issue structure, making error handling consistent regardless of which validator you choose.

If you need validator-specific error formatting, you can still access your validator's methods during validation before the data reaches fmodata:

```typescript
import { z } from "zod";

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().min(0).max(150),
});

// Validate early if you need Zod-specific error handling
const parseResult = userSchema.safeParse(userData);
if (!parseResult.success) {
  // Use Zod's error formatting
  const formatted = parseResult.error.flatten();
  console.log("Zod-specific formatting:", formatted);
}
```

#### OData Errors

Handle OData-specific protocol errors:

```typescript
import { ODataError, isODataError } from "@proofkit/fmodata";

const result = await db.from("users").list().execute();

if (result.error) {
  if (isODataError(result.error)) {
    console.log("OData Error Code:", result.error.code);
    console.log("OData Error Message:", result.error.message);
    console.log("OData Error Details:", result.error.details);
  }
}
```

#### Error Handling Patterns

**Pattern 1: Using instanceof (like ffetch):**

```typescript
import {
  HTTPError,
  ValidationError,
  TimeoutError,
  NetworkError,
} from "@proofkit/fmodata";

const result = await db.from("users").list().execute();

if (result.error) {
  if (result.error instanceof TimeoutError) {
    showTimeoutMessage();
  } else if (result.error instanceof HTTPError) {
    if (result.error.isNotFound()) {
      showNotFoundMessage();
    } else if (result.error.is5xx()) {
      showServerErrorMessage();
    }
  } else if (result.error instanceof ValidationError) {
    showValidationError(result.error.field, result.error.issues);
  } else if (result.error instanceof NetworkError) {
    showOfflineMessage();
  }
}
```

**Pattern 2: Using kind property (for exhaustive matching):**

```typescript
const result = await db.from("users").list().execute();

if (result.error) {
  switch (result.error.kind) {
    case "TimeoutError":
      showTimeoutMessage();
      break;
    case "HTTPError":
      handleHTTPError(result.error.status);
      break;
    case "ValidationError":
      showValidationError(result.error.field, result.error.issues);
      break;
    case "NetworkError":
      showOfflineMessage();
      break;
    case "ODataError":
      handleODataError(result.error.code);
      break;
    // TypeScript ensures exhaustive matching!
  }
}
```

**Pattern 3: Using type guards:**

```typescript
import {
  isHTTPError,
  isValidationError,
  isODataError,
  isNetworkError,
} from "@proofkit/fmodata";

const result = await db.from("users").list().execute();

if (result.error) {
  if (isHTTPError(result.error)) {
    // TypeScript knows this is HTTPError
    console.log("Status:", result.error.status);
  } else if (isValidationError(result.error)) {
    // TypeScript knows this is ValidationError
    console.log("Field:", result.error.field);
    console.log("Issues:", result.error.issues);
  } else if (isODataError(result.error)) {
    // TypeScript knows this is ODataError
    console.log("Code:", result.error.code);
  } else if (isNetworkError(result.error)) {
    // TypeScript knows this is NetworkError
    console.log("Network issue:", result.error.cause);
  }
}
```

#### Error Properties

All errors include helpful metadata:

```typescript
if (result.error) {
  // All errors have a timestamp
  console.log("Error occurred at:", result.error.timestamp);

  // All errors have a kind property for discriminated unions
  console.log("Error kind:", result.error.kind);

  // All errors have a message
  console.log("Error message:", result.error.message);
}
```

#### Available Error Types

- **`HTTPError`** - HTTP status errors (4xx, 5xx) with helper methods (`is4xx()`, `is5xx()`, `isNotFound()`, etc.)
- **`ODataError`** - OData protocol errors with code and details
- **`ValidationError`** - Schema validation failures with issues, schema reference, and failed value
- **`ResponseStructureError`** - Malformed API responses
- **`RecordCountMismatchError`** - When `single()` or `maybeSingle()` expectations aren't met
- **`TimeoutError`** - Request timeout (from ffetch)
- **`NetworkError`** - Network connectivity issues (from ffetch)
- **`RetryLimitError`** - Request failed after retries (from ffetch)
- **`CircuitOpenError`** - Circuit breaker is open (from ffetch)
- **`AbortError`** - Request was aborted (from ffetch)

### OData Annotations and Validation

By default, the library automatically strips OData annotations fields (`@id` and `@editLink`) from responses. If you need these fields, you can include them by passing `includeODataAnnotations: true`:

```typescript
const result = await db.from("users").list().execute({
  includeODataAnnotations: true,
});
```

You can also skip runtime validation by passing `skipValidation: true`.

```typescript
const result = await db.from("users").list().execute({
  skipValidation: true,
});

// Response is returned without schema validation
```

**Note:** Skipping validation means the response won't be validated OR transformed against your schema, so you lose runtime type safety guarantees. Use with caution.

### Custom Fetch Handlers

You can provide custom fetch handlers for testing or custom networking:

```typescript
const customFetch = async (url, options) => {
  console.log("Fetching:", url);
  return fetch(url, options);
};

const result = await db.from("users").list().execute({
  fetchHandler: customFetch,
});
```

## Testing

The library supports testing with custom fetch handlers. You can create mock fetch functions to return test data:

```typescript
const mockResponse = {
  "@odata.context": "...",
  value: [
    { id: "1", username: "john", email: "john@example.com" },
    { id: "2", username: "jane", email: "jane@example.com" },
  ],
};

const mockFetch = async () => {
  return new Response(JSON.stringify(mockResponse), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

const result = await db.from("users").list().execute({
  fetchHandler: mockFetch,
});

expect(result.data).toHaveLength(2);
expect(result.data[0].username).toBe("john");
```

You can also inspect query strings without executing:

```typescript
const queryString = db
  .from("users")
  .list()
  .select("username", "email")
  .filter({ active: true })
  .orderBy("username")
  .top(10)
  .getQueryString();

console.log(queryString);
// Output: "/users?$select=username,email&$filter=active eq true&$orderby=username&$top=10"
```
