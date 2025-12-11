# ORM API Implementation Summary

## Overview

Successfully implemented a Drizzle-inspired ORM API for fmodata that provides enhanced type safety and developer experience while maintaining full compatibility with the existing API.

## Completed Features

### ✅ 1. Field Builder System (`src/orm/field-builders.ts`)

Created a fluent field builder API with:

- **Field Types**: `textField()`, `numberField()`, `dateField()`, `timeField()`, `timestampField()`, `containerField()`, `calcField()`
- **Chainable Methods**:
  - `.primaryKey()` - Mark as primary key (auto read-only)
  - `.notNull()` - Make non-nullable
  - `.readOnly()` - Exclude from insert/update
  - `.entityId(id)` - Assign FileMaker field ID
  - `.readValidator(validator)` - Transform/validate data when reading from database
  - `.writeValidator(validator)` - Transform/validate data when writing to database

### ✅ 2. Column Reference System (`src/orm/column.ts`)

Created `Column<T, Name>` class that:

- Carries type information for TypeScript inference
- Stores field name, entity ID, table name, and table entity ID
- Provides methods to get identifiers (field/table)
- Supports both field names and entity IDs
- Includes `isColumn()` type guard

### ✅ 3. Filter Operators (`src/orm/operators.ts`)

Implemented comprehensive operator functions:

**Comparison**: `eq()`, `ne()`, `gt()`, `gte()`, `lt()`, `lte()`
**String**: `contains()`, `startsWith()`, `endsWith()`
**Array**: `inArray()`, `notInArray()`
**Null**: `isNull()`, `isNotNull()`
**Logical**: `and()`, `or()`, `not()`
**OrderBy**: `asc()`, `desc()` - Create OrderByExpression for type-safe sorting

Features:

- Support column-to-value comparisons
- Support column-to-column comparisons (cross-table)
- Convert to OData filter syntax
- Handle entity ID transformation
- Proper SQL escaping (single quotes)

### ✅ 4. Table Occurrence Factory (`src/orm/table.ts`)

Created `fmTableOccurrence()` function that:

- Takes field builders as input
- Generates Zod schema automatically (output and input schemas)
- Creates Column references for each field
- Extracts metadata (primary key, required, read-only, entity IDs)
- Supports `navigationPaths` for runtime validation of expand/navigate operations
- Supports `defaultSelect` option ("all", "schema", or function) for automatic field selection
- Returns object with both metadata (via Symbols) and column accessors

### ✅ 5. Query Builder Updates (`src/client/query-builder.ts`)

Enhanced QueryBuilder to support:

**Select Method**:

- Accepts object with Column references for type-safe field selection
- `.select({ id: users.id, name: users.name })` ✓
- Supports field renaming: `.select({ userId: users.id, userName: users.name })` ✓
- String-based select still supported via legacy API

**Where Method**:

- New `.where()` method accepts FilterExpression
- Converts operator expressions to OData syntax
- Respects `useEntityIds` setting

**OrderBy Method**:

- Accepts Column references, OrderByExpression, or strings
- `.orderBy(users.name)` ✓ (single column, ascending by default)
- `.orderBy([users.name, "asc"])` ✓ (single column with direction)
- `.orderBy(asc(users.name), desc(users.age))` ✓ (variadic with helpers)
- `.orderBy([[users.name, "asc"], [users.createdAt, "desc"]])` ✓ (array syntax)

### ✅ 6. Navigation Validation (`src/client/builders/expand-builder.ts`, `src/client/entity-set.ts`, `src/client/record-builder.ts`)

Added runtime validation for navigation operations:

- Validates `expand()` operations using `getNavigationPaths()` helper
- Validates `navigate()` operations in EntitySet and RecordBuilder
- Checks if relation name is in table's `navigationPaths` array
- Throws descriptive error if invalid path is attempted
- Works with new ORM table occurrences
- Backward compatible with old API

### ✅ 7. Default Select Feature (`src/client/entity-set.ts`, `src/client/builders/default-select.ts`)

Implemented automatic field selection based on table configuration:

- `defaultSelect: "all"` - Select all fields (default behavior)
- `defaultSelect: "schema"` - Select only fields defined in schema
- `defaultSelect: (columns) => {...}` - Custom function to select specific columns
- Automatically applied in `list()` and `get()` if no explicit `select()` is called

### ✅ 8. Documentation

Created comprehensive documentation:

- **`docs/ORM_API.md`**: Complete API guide with examples
- **`scripts/dreams.ts`**: Updated with working examples
- **`tests/orm-api.test.ts`**: Test suite covering all features

### ✅ 9. Exports (`src/index.ts`, `src/orm/index.ts`)

Updated exports to include:

- All field builder functions
- Column and operator types/functions
- fmTableOccurrence function
- Proper TypeScript types

## Key Design Decisions

### 1. Query Order: `from().select().where()`

Kept the existing pattern (not Drizzle's `select().from()`) for consistency and single-table query ergonomics.

### 2. Select Syntax

Support both string-based and column-based selection:

- String-based (legacy): `select("id", "name")` - variadic string arguments
- Column-based (new ORM): `select({ id: users.id, name: users.name })` - object with column references, supports field renaming

### 3. Navigation Validation

Simple `navigationPaths: string[]` array with runtime validation when expanding/navigating. Uses `getNavigationPaths()` helper to access paths from FMTable. Throws descriptive error if relation name is not in paths.

### 4. Cross-Table Operations

Operators support column-to-column comparisons: `eq(users.id, contacts.id_user)`

### 5. Default Select

Tables can define `defaultSelect` option to automatically select fields when `list()` or `get()` is called without explicit `select()`. Supports "all", "schema", or custom function.

### 6. Backward Compatibility

New API coexists with old API. Both exported from main package. No breaking changes.

## File Structure

```
src/
├── orm/
│   ├── field-builders.ts    # Field builder classes and factories
│   ├── column.ts             # Column reference type
│   ├── operators.ts          # Filter and OrderBy operator functions
│   ├── table.ts              # fmTableOccurrence function and FMTable class
│   └── index.ts              # Barrel exports
├── client/
│   ├── query/
│   │   └── query-builder.ts  # Enhanced with Column/operator support
│   ├── builders/
│   │   ├── expand-builder.ts # Expand logic with navigation validation
│   │   └── default-select.ts # Default select helper functions
│   ├── entity-set.ts         # EntitySet with defaultSelect support
│   └── ...                   # Other existing files
└── index.ts                  # Main exports (old + new API)

docs/
└── ORM_API.md                # Complete API documentation

scripts/
└── dreams.ts                 # Updated with working examples

tests/
└── orm-api.test.ts           # Test suite for new API
```

## Usage Example

```typescript
import {
  fmTableOccurrence,
  textField,
  numberField,
  timestampField,
  eq,
  and,
  gt,
  asc,
  FMServerConnection,
} from "@proofkit/fmodata";
import { z } from "zod/v4";

// Define table with field builders
const users = fmTableOccurrence(
  "users",
  {
    id: textField().primaryKey().entityId("FMFID:1"),
    name: textField().notNull().entityId("FMFID:2"),
    age: numberField().entityId("FMFID:3"),
    status: textField()
      .readValidator(z.enum(["active", "pending", "inactive"]))
      .entityId("FMFID:4"),
    createdAt: timestampField().readOnly().entityId("FMFID:5"),
  },
  {
    entityId: "FMTID:100",
    navigationPaths: ["contacts"],
  },
);

// Connect
const connection = new FMServerConnection({
  serverUrl: "https://api.example.com",
  auth: { apiKey: "key" },
});
const db = connection.database("MyDB.fmp12");

// Query with new API
const result = await db
  .from(users)
  .list()
  .select({
    id: users.id,
    name: users.name,
    age: users.age,
  })
  .where(and(eq(users.status, "active"), gt(users.age, 18)))
  .orderBy(asc(users.name))
  .execute();
```

## Type Safety Benefits

1. **Enum Autocomplete**: `eq(users.status, "active")` - "active" autocompletes from enum validator
2. **Column Type Checking**: Operators validate value types against column types
3. **Select Field Validation**: Column references provide type-safe field selection with renaming support
4. **Cross-Table Safety**: Column references carry table information for validation
5. **Navigation Validation**: Runtime checks ensure valid expand/navigate paths
6. **Insert/Update Type Safety**: Read-only fields automatically excluded, required fields enforced
7. **Input/Output Transformation**: Separate validators for reading (readValidator) and writing (writeValidator)

## Implementation Status

✅ All core features completed:

1. ✅ Field builders with read/write validators
2. ✅ Column references with type safety
3. ✅ Filter operators (comparison, string, array, null, logical)
4. ✅ OrderBy operators (asc, desc)
5. ✅ Table factory (fmTableOccurrence) with Symbol-based metadata
6. ✅ Query builder updates (select, where, orderBy)
7. ✅ Navigation validation (expand, navigate)
8. ✅ Default select feature

✅ No linting errors
✅ Documentation complete
✅ Tests written
✅ Examples updated

## Next Steps (Optional)

Potential future enhancements:

1. Add more operator types (between, like with wildcards, etc.)
2. Support for aggregate functions (count, sum, avg, etc.)
3. Type-safe joins (if OData supports them)
4. Schema migration helpers
5. Code generation from FileMaker metadata
