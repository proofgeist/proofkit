# CrossJoin Implementation Plan for fmodata

## Summary of FileMaker CrossJoin Behavior (Tested)

Based on live server testing, FileMaker's `$crossjoin` has **significant limitations**:

| Feature | Status | Notes |
|---------|--------|-------|
| Basic crossjoin | ✅ | Requires `$top` to avoid timeout (Cartesian product) |
| `$top`/`$skip` | ✅ | Pagination works |
| Single `$expand` | ✅ | Returns fields from expanded table only |
| Multiple `$expand` | ❌ | `$expand=t1,t2` syntax error |
| Cross-table filter | ❌ | `$filter=t1/field eq t2/field` fails |
| Unqualified filter | ❌ | `$filter=name eq 'x'` → "cannot determine table" |
| `$select` | ❌ | Parse error |
| `$orderby` | ❌ | Internal error |

### Response Format

**Without `$expand`**: All fields from all tables **merged flat** into each record:
```json
{
  "contacts@navigationLink": "...contacts(ID1)",
  "users@navigationLink": "...users(ID2)",
  "PrimaryKey": "ID1",      // from contacts
  "name": "Test User",      // COLLISION - users.name overwrites contacts.name!
  "hobby": "Board games",   // from contacts
  "id": "ID2",              // from users
  "id_user": "...",         // from contacts
  "id_customer": "..."      // from users
}
```

**With `$expand=contacts`**: Only contacts fields returned:
```json
{
  "contacts@navigationLink": "...contacts(ID1)",
  "PrimaryKey": "ID1",
  "name": "Eric",           // contacts.name (correct)
  "hobby": "Board games",
  "id_user": "...",
  "my_calc": "..."
}
```

### Critical Insight

**The main use case (joining on matching keys) is NOT supported.** You cannot filter like:
```
$filter=contacts/id_user eq users/id
```

This makes crossjoin essentially a **paginated Cartesian product** with no way to get "related" records.

---

## Recommendation: Limited Implementation

Given the severe limitations, I recommend a **minimal implementation** that:

1. Exposes the raw crossjoin capability (full Cartesian product)
2. Warns users about limitations
3. Supports filtering on ONE table (when that table is expanded)
4. Does NOT promise cross-table joining (since FM doesn't support it)

---

## API Design: `db.from(table1).crossjoin(table2)`

Even with limitations, this API makes sense because:
- Shows crossjoin starts from a "primary" table
- `.list()` semantics carry over (pagination with `$top`)
- User can filter on the primary table

### Basic Usage

```ts
// Get Cartesian product with contacts data (paginated)
const result = await db
  .from(contacts)
  .crossjoin(users)
  .top(100)           // REQUIRED - prevents timeout
  .execute();

// result.data[0] has:
// - All contacts fields (from $expand=contacts)
// - users@navigationLink (to know which user)
```

### With Filter (primary table only)

```ts
// Filter on contacts (the "from" table)
const result = await db
  .from(contacts)
  .crossjoin(users)
  .where(eq(contacts.name, "Eric"))  // becomes: $filter=contacts/name eq 'Eric'
  .top(100)
  .execute();
```

### Type Inference

Since only the `from` table's fields are returned (via implicit `$expand`):

```ts
type Result = InferSchemaOutput<typeof contacts> & {
  // Navigation links extracted as record IDs
  _crossjoin: {
    users: string;  // extracted from users@navigationLink
  }
}
```

---

## Implementation Phases

### Phase 1: Core CrossJoinBuilder

**New file**: `src/client/query/crossjoin-builder.ts`

```ts
export class CrossJoinBuilder<
  PrimaryTable extends FMTable<any, any>,
  JoinedTables extends FMTable<any, any>[]
> {
  private readonly primaryTable: PrimaryTable;
  private readonly joinedTables: JoinedTables;
  private filterExpression?: FilterExpression;
  private topValue?: number;
  private skipValue?: number;

  // from(contacts).crossjoin(users) creates this
  constructor(
    primaryTable: PrimaryTable,
    joinedTables: JoinedTables,
    context: ExecutionContext
  ) { ... }

  where(expr: FilterExpression): this {
    // Validate filter only uses primaryTable columns
    return this.clone({ filterExpression: expr });
  }

  top(n: number): this {
    return this.clone({ topValue: n });
  }

  skip(n: number): this {
    return this.clone({ skipValue: n });
  }

  getQueryString(): string {
    // /$crossjoin(primary,joined1,joined2)?$expand=primary&$filter=...&$top=...
    const tables = [this.primaryTable, ...this.joinedTables]
      .map(t => getTableName(t))
      .join(',');

    const params: string[] = [];

    // Always expand primary table to get its fields
    params.push(`$expand=${getTableName(this.primaryTable)}`);

    if (this.filterExpression) {
      // Prefix all columns with table name
      params.push(`$filter=${this.buildFilter()}`);
    }

    if (this.topValue) params.push(`$top=${this.topValue}`);
    if (this.skipValue) params.push(`$skip=${this.skipValue}`);

    return `/$crossjoin(${tables})?${params.join('&')}`;
  }

  async execute(): Promise<Result<CrossJoinResult<PrimaryTable, JoinedTables>[]>> {
    // Enforce $top requirement
    if (!this.topValue) {
      return {
        data: undefined,
        error: { type: 'validation', message: 'CrossJoin requires .top() to prevent timeout' }
      };
    }
    // Execute and process response
  }
}
```

### Phase 2: EntitySet.crossjoin() Method

**Modify**: `src/client/entity-set.ts`

```ts
export class EntitySet<Occ extends FMTable<any, any>> {
  // ...existing methods...

  /**
   * Create a cross join with another table.
   *
   * WARNING: FileMaker crossjoin has limitations:
   * - Cannot filter across tables (e.g., t1.id eq t2.foreignKey)
   * - Returns Cartesian product (N×M rows)
   * - Requires .top() to prevent timeout
   *
   * @example
   * ```ts
   * const result = await db
   *   .from(contacts)
   *   .crossjoin(users)
   *   .where(eq(contacts.name, "Eric"))
   *   .top(100)
   *   .execute();
   * ```
   */
  crossjoin<T extends FMTable<any, any>>(
    ...tables: T[]
  ): CrossJoinBuilder<Occ, T[]> {
    return new CrossJoinBuilder(
      this.table,
      tables,
      this.context
    );
  }
}
```

### Phase 3: Filter Expression Updates

**Modify**: `src/orm/operators.ts`

Add table qualification for crossjoin context:

```ts
export function toODataFilterForCrossJoin(
  expr: FilterExpression,
  tableContext: string
): string {
  // Same as toODataFilter but prefix columns with tableContext/
  // e.g., name eq 'Eric' → contacts/name eq 'Eric'
}
```

### Phase 4: Response Processing

**New file**: `src/client/query/crossjoin-response-processor.ts`

```ts
interface CrossJoinRawRecord {
  [key: string]: unknown;
  // Navigation links like "users@navigationLink": "url/users(ID)"
}

export function processCrossJoinResponse<P extends FMTable, J extends FMTable[]>(
  rawRecords: CrossJoinRawRecord[],
  primaryTable: P,
  joinedTables: J
): CrossJoinResult<P, J>[] {
  return rawRecords.map(raw => {
    // Extract primary table fields (already flat)
    const primaryFields = extractFields(raw, primaryTable);

    // Extract navigation link IDs
    const crossjoinMeta: Record<string, string> = {};
    for (const joinedTable of joinedTables) {
      const navLink = raw[`${getTableName(joinedTable)}@navigationLink`];
      if (typeof navLink === 'string') {
        crossjoinMeta[getTableName(joinedTable)] = extractIdFromNavLink(navLink);
      }
    }

    return {
      ...primaryFields,
      _crossjoin: crossjoinMeta
    };
  });
}

function extractIdFromNavLink(url: string): string {
  // "https://.../users(UUID)" → "UUID"
  const match = url.match(/\(([^)]+)\)$/);
  return match?.[1] ?? '';
}
```

### Phase 5: Types

**New file**: `src/client/query/crossjoin-types.ts`

```ts
export type CrossJoinResult<
  Primary extends FMTable<any, any>,
  Joined extends FMTable<any, any>[]
> = InferSchemaOutputFromFMTable<Primary> & {
  _crossjoin: {
    [K in Joined[number] as TableName<K>]: string;  // Record ID
  };
};
```

### Phase 6: Tests

**New file**: `tests/crossjoin.test.ts`

```ts
describe("CrossJoin", () => {
  describe("Query String Generation", () => {
    it("generates basic crossjoin URL", () => {
      const qs = db.from(contacts).crossjoin(users).top(10).getQueryString();
      expect(qs).toBe("/$crossjoin(contacts,users)?$expand=contacts&$top=10");
    });

    it("adds filter with table qualification", () => {
      const qs = db
        .from(contacts)
        .crossjoin(users)
        .where(eq(contacts.name, "Eric"))
        .top(10)
        .getQueryString();
      expect(qs).toContain("$filter=contacts/name eq 'Eric'");
    });

    it("supports multiple joined tables", () => {
      const qs = db.from(contacts).crossjoin(users, customers).top(10).getQueryString();
      expect(qs).toContain("$crossjoin(contacts,users,customers)");
    });
  });

  describe("Validation", () => {
    it("requires top() to prevent timeout", async () => {
      const result = await db.from(contacts).crossjoin(users).execute();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("requires .top()");
    });
  });

  describe("Response Processing", () => {
    it("extracts navigation link IDs into _crossjoin", async () => {
      const mockResponse = {
        value: [{
          "contacts@navigationLink": "https://example.com/contacts(ID1)",
          "users@navigationLink": "https://example.com/users(ID2)",
          "PrimaryKey": "ID1",
          "name": "Eric"
        }]
      };

      const result = await db
        .from(contacts)
        .crossjoin(users)
        .top(10)
        .execute({ fetchHandler: simpleMock({ status: 200, body: mockResponse }) });

      expect(result.data?.[0]?._crossjoin.users).toBe("ID2");
    });
  });
});
```

---

## Files to Create/Modify

### New Files
- `src/client/query/crossjoin-builder.ts`
- `src/client/query/crossjoin-types.ts`
- `src/client/query/crossjoin-response-processor.ts`
- `tests/crossjoin.test.ts`

### Modified Files
- `src/client/entity-set.ts` - Add `crossjoin()` method
- `src/orm/operators.ts` - Add table-qualified filter builder
- `src/index.ts` - Export new types

---

## Open Questions

1. **Should we expose raw crossjoin (without expand)?** - Returns merged fields with collisions. Probably not useful.
2. **Error on filter with wrong table?** - If user tries `where(eq(users.name, "x"))` but expanded contacts, should we error at build time or let FM error?
3. **Worth adding `expandAll()` to try getting all fields?** - FM doesn't support multi-expand, so this would fail.

---

## Alternative: Don't Implement

Given the severe limitations, consider **not implementing crossjoin** and documenting why:

> FileMaker's OData crossjoin does not support cross-table filtering (`$filter=t1/field eq t2/field`), making it unsuitable for joining related records. Use navigation properties or execute separate queries instead.

This saves implementation effort for a feature that can't do what users expect.
