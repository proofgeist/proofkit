# FileMaker OData CrossJoin: Server Testing Results

Tested against FileMaker OData API (via Ottomatic) on 2026-01-15.

## TL;DR

**FileMaker's `$crossjoin` cannot join related records.** The main use case—filtering where `table1/foreignKey eq table2/primaryKey`—fails. It only produces paginated Cartesian products.

## Feature Support Matrix

| Feature | Supported | Notes |
|---------|-----------|-------|
| Basic `$crossjoin(t1,t2)` | ✅ | Requires `$top` to avoid timeout |
| `$top` / `$skip` | ✅ | Pagination works |
| Single `$expand` | ✅ | Returns only that table's fields |
| Multiple `$expand` | ❌ | `$expand=t1,t2` → syntax error |
| Cross-table filter | ❌ | `$filter=t1/field eq t2/field` → parse failure |
| Single-table filter | ✅ | Only when that table is expanded |
| Unqualified filter | ❌ | `$filter=name eq 'x'` → "cannot determine table" |
| `$select` | ❌ | Parse error |
| `$orderby` | ❌ | Internal error |
| 3+ table crossjoin | ✅ | Works with `$top` |

## Response Format

### Without `$expand` (default)

All fields from all tables merged flat. **Field name collisions occur**—later table's value overwrites earlier:

```json
{
  "contacts@navigationLink": "https://.../contacts(ID1)",
  "users@navigationLink": "https://.../users(ID2)",
  "PrimaryKey": "ID1",
  "name": "Test User",        // From users, overwrote contacts.name!
  "hobby": "Board games",     // From contacts
  "id": "ID2",                // From users
  "id_user": "ID2",           // From contacts
  "id_customer": "..."        // From users
}
```

### With `$expand=contacts`

Only expanded table's fields returned. Navigation links still present for other tables:

```json
{
  "contacts@navigationLink": "https://.../contacts(ID1)",
  "PrimaryKey": "ID1",
  "name": "Eric",             // Correct - from contacts
  "hobby": "Board games",
  "id_user": "...",
  "my_calc": "..."
}
```

## Critical Limitation: No Cross-Table Filtering

The primary use case for crossjoin—joining on matching keys—**does not work**:

```
# These all FAIL:
/$crossjoin(contacts,users)?$filter=contacts/id_user eq users/id
/$crossjoin(contacts,users)?$filter=id_user eq id
```

Error: `"Error: parse failure in URL at: 'id'"`

**You cannot express "give me contacts paired with their related user."**

## What Works

### Paginated Cartesian Product
```
/$crossjoin(contacts,users)?$top=10
```
Returns first 10 pairs of (contact × user). Not useful for related data.

### Single-Table Filter (with expand)
```
/$crossjoin(contacts,users)?$expand=contacts&$filter=contacts/name eq 'Eric'
```
Filters contacts, returns all contacts named "Eric" paired with every user.

## Recommendations

### Option 1: Don't Implement
Document that crossjoin isn't supported due to FileMaker limitations. Users should use:
- Navigation properties (`$expand`) for related data
- Multiple queries + client-side joining

### Option 2: Limited Implementation
Expose as `db.from(t1).crossjoin(t2)` with clear warnings:
- Returns Cartesian product
- Only primary table's fields (via implicit expand)
- Filter only on primary table
- `$top` required

## Test Script

See `scripts/test-crossjoin.ts` for reproduction. Run with:
```bash
bun run scripts/test-crossjoin.ts
```

Requires `.env.local` with `FMODATA_SERVER_URL`, `FMODATA_API_KEY`, `FMODATA_DATABASE`.
