# New ORM API (Drizzle-Inspired)

The new ORM API provides a Drizzle-inspired interface for defining tables and building queries with enhanced type safety and developer experience.

## Key Features

- **Field Builders**: Fluent API for defining fields with metadata (primary keys, entity IDs, validators)
- **Column References**: Type-safe column references for queries (`users.id`, `users.name`)
- **Filter Operators**: Standalone operator functions (`eq()`, `gt()`, `and()`, `or()`)
- **Support for Both Styles**: Works with both typed strings AND column references
- **Cross-Table Comparisons**: Compare columns across tables (`eq(users.id, contacts.id_user)`)
- **Runtime Navigation Validation**: Validates expand paths against `navigationPaths`

## Table Definition

### Basic Table

```typescript
import { fmTableOccurrence, textField, numberField, timestampField } from "@proofkit/fmodata";

export const users = fmTableOccurrence("users", {
  id: textField().primaryKey().entityId("FMFID:1"),
  name: textField().notNull().entityId("FMFID:6"),
  email: textField().entityId("FMFID:7"),
  age: numberField().entityId("FMFID:8"),
  CreationTimestamp: timestampField().readOnly().entityId("FMFID:2"),
}, {
  entityId: "FMTID:100",
  defaultSelect: "schema",
  navigationPaths: ["contacts", "orders"],
});
```

### Field Builder Methods

All field builders support these chainable methods:

- `.primaryKey()` - Mark as primary key (automatically read-only)
- `.notNull()` - Mark as non-nullable
- `.readOnly()` - Exclude from insert/update operations
- `.entityId(id)` - Assign FileMaker field ID (FMFID)
- `.outputValidator(validator)` - Transform data when reading (FM → your app)
- `.inputValidator(validator)` - Transform data when writing (your app → FM)

### Available Field Types

```typescript
textField()        // string | null
numberField()      // number | null
dateField()        // string | null (ISO date)
timeField()        // string | null (ISO time)
timestampField()   // string | null (ISO 8601)
containerField()   // string | null (base64)
calcField()        // string | null (auto read-only)
```

### Custom Field Types with Validators

```typescript
import { z } from "zod/v4";

// Boolean field (FM stores as 0/1)
const booleanField = () =>
  numberField()
    .outputValidator(z.coerce.boolean())
    .inputValidator(z.boolean().transform(v => v ? 1 : 0));

// Enum field
const statusField = () =>
  textField()
    .outputValidator(z.enum(["active", "pending", "inactive"]));

// Use in table definition
const users = fmTableOccurrence("users", {
  active: booleanField().entityId("FMFID:7"),
  status: statusField().entityId("FMFID:8"),
}, { entityId: "FMTID:100" });
```

## Querying

### Select - Multiple Syntax Options

```typescript
import { eq } from "@proofkit/fmodata";

// Option 1: Typed strings (original style)
db.from(users).select("id", "name", "email");

// Option 2: Column references (new capability)
db.from(users).select(users.id, users.name, users.email);

// Option 3: Mix both styles
db.from(users).select(users.id, "name", users.email);
```

### Filter with Operators

#### Comparison Operators

```typescript
import { eq, ne, gt, gte, lt, lte } from "@proofkit/fmodata";

// Equal
db.from(users).where(eq(users.status, "active"));

// Not equal
db.from(users).where(ne(users.status, "deleted"));

// Greater than / Greater than or equal
db.from(users).where(gt(users.age, 18));
db.from(users).where(gte(users.age, 18));

// Less than / Less than or equal
db.from(users).where(lt(users.age, 65));
db.from(users).where(lte(users.age, 65));
```

#### String Operators

```typescript
import { contains, startsWith, endsWith } from "@proofkit/fmodata";

// Contains substring
db.from(users).where(contains(users.name, "John"));

// Starts with prefix
db.from(users).where(startsWith(users.email, "admin"));

// Ends with suffix
db.from(users).where(endsWith(users.email, "@example.com"));
```

#### Array Operators

```typescript
import { inArray, notInArray } from "@proofkit/fmodata";

// Value in array
db.from(users).where(inArray(users.status, ["active", "pending"]));

// Value not in array
db.from(users).where(notInArray(users.status, ["deleted", "banned"]));
```

#### Null Checks

```typescript
import { isNull, isNotNull } from "@proofkit/fmodata";

// Is null
db.from(users).where(isNull(users.deletedAt));

// Is not null
db.from(users).where(isNotNull(users.email));
```

#### Logical Operators

```typescript
import { and, or, not, eq, gt } from "@proofkit/fmodata";

// AND - all conditions must be true
db.from(users).where(
  and(
    eq(users.active, true),
    gt(users.age, 18)
  )
);

// OR - at least one condition must be true
db.from(users).where(
  or(
    eq(users.role, "admin"),
    eq(users.role, "moderator")
  )
);

// NOT - negate a condition
db.from(users).where(
  not(eq(users.status, "deleted"))
);

// Complex combinations
db.from(users).where(
  and(
    eq(users.active, true),
    or(
      eq(users.role, "admin"),
      and(
        eq(users.role, "user"),
        gt(users.age, 18)
      )
    )
  )
);
```

### Cross-Table Column Comparisons

```typescript
// Compare columns from different tables
db.from(users)
  .select(users.id, users.name)
  .where(eq(users.id, contacts.id_user));

// Works with any comparison operator
db.from(orders)
  .where(gt(orders.total, users.credit_limit));
```

### Order By

```typescript
// With strings
db.from(users).orderBy("name");
db.from(users).orderBy(["name", "asc"]);
db.from(users).orderBy([["name", "asc"], ["createdAt", "desc"]]);

// With Column references
db.from(users).orderBy(users.name);
db.from(users).orderBy([users.name, "asc"]);
db.from(users).orderBy([[users.name, "asc"], [users.createdAt, "desc"]]);
```

## Navigation & Expansion

Navigation paths are defined in the table definition and validated at runtime:

```typescript
const users = fmTableOccurrence("users", {
  // ... fields
}, {
  navigationPaths: ["contacts", "orders"],  // Valid paths
});

// Valid expansion (contacts is in navigationPaths)
db.from(users)
  .expand(contacts, (q) => q.select("name", "email"))
  .execute();

// Error: "Cannot expand to 'invoices'. Valid navigation paths: contacts, orders"
db.from(users)
  .expand(invoices, (q) => q.select("id"))  // Runtime error!
  .execute();
```

## Type Inference

The new API provides excellent type inference:

```typescript
// users.id is Column<string, "id">
type UserId = typeof users.id;

// users.hobby is Column<"reading" | "writing" | "coding", "hobby">
// (inferred from the enum validator)
type UserHobby = typeof users.hobby;

// Filter values are type-checked
eq(users.hobby, "reading")  // ✓ Valid - "reading" is in enum
eq(users.hobby, "invalid")  // ✗ Type error - not in enum

// Select fields are type-checked
db.from(users).select("id", "name")  // ✓ Valid
db.from(users).select("invalid")     // ✗ Type error
```

## Migration from Old API

The new ORM API coexists with the old API. Both are exported from `@proofkit/fmodata`:

```typescript
// Old API (still works)
import { defineBaseTable, defineTableOccurrence } from "@proofkit/fmodata";

// New API
import { fmTableOccurrence, textField, eq } from "@proofkit/fmodata";
```

### Key Differences

| Feature | Old API | New API |
|---------|---------|---------|
| Table Definition | `defineBaseTable` + `defineTableOccurrence` | `fmTableOccurrence` |
| Schema | Zod schemas in separate object | Field builders inline |
| Metadata | Separate `required`, `readOnly` arrays | Chainable methods on fields |
| Filters | Object syntax or typed strings | Operator functions |
| Select | Typed strings only | Typed strings OR column references |
| Navigation | Type-safe via `buildOccurrences()` | Runtime validation via `navigationPaths` |

### Migration Example

**Old API:**
```typescript
const usersBase = defineBaseTable({
  schema: {
    id: z.string(),
    name: z.string().nullable(),
    active: z.coerce.boolean(),
  },
  idField: "id",
  readOnly: ["CreationTimestamp"],
  fmfIds: { id: "FMFID:1", name: "FMFID:6" },
});

const users = defineTableOccurrence({
  name: "users",
  baseTable: usersBase,
});

// Query
db.from(users)
  .select("id", "name")
  .filter({ active: { eq: true } });
```

**New API:**
```typescript
const users = fmTableOccurrence("users", {
  id: textField().primaryKey().entityId("FMFID:1"),
  name: textField().entityId("FMFID:6"),
  active: numberField()
    .outputValidator(z.coerce.boolean())
    .inputValidator(z.boolean().transform(v => v ? 1 : 0)),
  CreationTimestamp: timestampField().readOnly(),
});

// Query
db.from(users)
  .select(users.id, users.name)
  .where(eq(users.active, true));
```

## Best Practices

1. **Use Column References for Clarity**: `users.name` is more explicit than `"name"`
2. **Define Reusable Field Builders**: Extract common patterns like `booleanField()`
3. **Leverage Type Inference**: Let TypeScript infer types from validators
4. **Use Logical Operators**: Prefer `and()` / `or()` over nested objects
5. **Validate Navigation Paths**: Always define `navigationPaths` for type safety
6. **Combine Old and New APIs**: Use whichever feels better for each use case

## Complete Example

```typescript
import {
  fmTableOccurrence,
  textField,
  numberField,
  timestampField,
  FMServerConnection,
  eq,
  and,
  or,
  gt,
  contains,
} from "@proofkit/fmodata";
import { z } from "zod/v4";

// Define tables
const users = fmTableOccurrence("users", {
  id: textField().primaryKey().entityId("FMFID:1"),
  name: textField().notNull().entityId("FMFID:2"),
  email: textField().entityId("FMFID:3"),
  age: numberField().entityId("FMFID:4"),
  status: textField()
    .outputValidator(z.enum(["active", "pending", "inactive"]))
    .entityId("FMFID:5"),
  createdAt: timestampField().readOnly().entityId("FMFID:6"),
}, {
  entityId: "FMTID:100",
  navigationPaths: ["orders"],
});

const orders = fmTableOccurrence("orders", {
  id: textField().primaryKey().entityId("FMFID:10"),
  user_id: textField().entityId("FMFID:11"),
  total: numberField().entityId("FMFID:12"),
  status: textField().entityId("FMFID:13"),
}, {
  entityId: "FMTID:101",
  navigationPaths: ["users"],
});

// Connect
const connection = new FMServerConnection({
  serverUrl: "https://api.example.com",
  auth: { apiKey: "test-api-key" },
});
const db = connection.database("MyDatabase.fmp12");

// Query with new API
const result = await db
  .from(users)
  .select(users.id, users.name, users.email)
  .where(
    and(
      or(
        eq(users.status, "active"),
        eq(users.status, "pending")
      ),
      gt(users.age, 18),
      contains(users.email, "@example.com")
    )
  )
  .orderBy([[users.name, "asc"], [users.createdAt, "desc"]])
  .top(50)
  .execute();

if (result.data) {
  console.log(`Found ${result.data.length} users`);
}
```

