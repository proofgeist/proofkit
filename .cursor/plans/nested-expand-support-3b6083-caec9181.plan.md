<!-- caec9181-bb9a-4c29-8458-07d85bca1fcb 013b4f46-eb88-46d0-ac71-f9b3d3e7e38f -->
# Nested Expand Support with QueryBuilder

## API Design

Users will write code using the existing QueryBuilder in callbacks:

```typescript
// Simple expand (all fields)
db.from("contacts").expand("users")

// Expand with select and filter
db.from("contacts").expand("users", (b) => 
  b.select("name", "email")
   .filter({ active: true })
   .orderBy("name")
)

// Multiple expands (chainable)
db.from("contacts")
  .expand("users", (b) => b.select("name"))
  .expand("other_users")

// Nested expands
db.from("contacts").expand("users", (b) =>
  b.select("name")
   .expand("user_customer", (nested) => nested.select("name"))
)
```

This generates OData query strings:

- `?$expand=users`
- `?$expand=users($select=name,email;$filter=active eq true;$orderby=name)`
- `?$expand=users($select=name),other_users`
- `?$expand=users($select=name;$expand=user_customer($select=name))`

## Implementation Strategy

### 1. Modify QueryBuilder.expand()

Update `src/client/query-builder.ts`:

**Current signature:**

```typescript
expand(expand: QueryOptions<T>["expand"]): QueryBuilder<...>
```

**New signature:**

```typescript
expand<Rel extends NavigationNames>(
  relation: Rel,
  callback?: (builder: QueryBuilder<TargetSchema>) => QueryBuilder<TargetSchema>
): QueryBuilder<...>
```

**Implementation approach:**

- Store expand configurations in a new internal array: `expandConfigs: Array<{relation: string, options?: QueryOptions}>`
- When callback is provided:

  1. Look up target occurrence from `this.occurrence?.navigation[relation]`
  2. Create new QueryBuilder instance for target occurrence
  3. Pass to callback, receive configured builder
  4. Extract builder's `queryOptions` 
  5. Store `{relation, options}` in `expandConfigs`

- When callback is omitted: store `{relation, options: undefined}`
- Support chaining: return `this`

### 2. Custom OData Query String Generation

The `odata-query` library doesn't support complex nested expand syntax. We need to build the `$expand` parameter ourselves.

**Add helper function in QueryBuilder:**

```typescript
private buildExpandString(configs: ExpandConfig[]): string {
  // For each config:
  // - If no options: just "relationName"
  // - If options: "relationName($select=...;$filter=...;$expand=...)"
  // - Recursively handle nested expands
  // Return comma-separated list
}
```

**Modify existing query string generation:**

- In `getQueryString()` and `execute()`: don't pass `expand` to `buildQuery()`
- Build base query string without expand using odata-query
- Build custom expand string from `expandConfigs`
- Combine: `baseQuery + &$expand=customExpandString`

### 3. TypeScript Type Utilities

Add helper types to:

- Extract navigation relation names from occurrence (already exists)
- Find target occurrence type from relation name (already exists)
- Type the callback's builder parameter correctly

The callback should receive a QueryBuilder typed to the target occurrence's schema, ensuring:

- `select()` only accepts fields from target table
- `filter()` only accepts fields from target table
- `expand()` only accepts navigation relations from target table

### 4. Update EntitySet.expand()

Update `src/client/entity-set.ts` to match the new signature:

- Change from simple string to relation + callback pattern
- Create and return a QueryBuilder with the expand configuration

### 5. Tests

Add comprehensive tests in `tests/navigate.test.ts`:

- Simple expand without callback
- Expand with select
- Expand with filter, orderBy, top, skip
- Multiple expands chained
- Nested expands (2-3 levels deep)
- Type checking for invalid relations (should allow but warn)
- Type checking for invalid field names in select
- Query string generation validation for all patterns

## Files to Modify

1. **src/client/query-builder.ts** - New expand() signature, expand config storage, custom query generation
2. **src/client/entity-set.ts** - Update expand() to match new signature
3. **src/types.ts** - Add ExpandConfig type if needed
4. **tests/navigate.test.ts** - Add comprehensive expand callback tests
5. **tests/query-strings.test.ts** - Add nested expand query string tests

## Key Implementation Details

- **No new builder class** - reuse existing QueryBuilder for all expand callbacks
- **Recursive handling** - nested expands are handled by recursively processing QueryBuilder.expandConfigs
- **Type safety** - each callback gets a QueryBuilder typed to its target occurrence
- **Chainable** - expand() returns the original builder for method chaining
- **Callback requirement** - if callback provided, it must return the builder instance

### To-dos

- [ ] Create ExpandBuilder class with select() and expand() methods, typed to TableOccurrence
- [ ] Implement OData query string generation for nested expand syntax
- [ ] Modify QueryBuilder.expand() to accept relation name and callback, support chaining
- [ ] Update EntitySet.expand() to match new signature
- [ ] Add TypeScript helper types for extracting schema fields and navigation relations
- [ ] Add comprehensive tests for all expand scenarios including nested expands