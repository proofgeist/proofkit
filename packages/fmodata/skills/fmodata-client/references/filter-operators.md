# Filter Operators Reference

All operators are imported from `@proofkit/fmodata`. They return `FilterExpression` objects for use in `.where()` clauses.

## Comparison Operators

| Operator | Signature | OData Output | Example |
|----------|-----------|-------------|---------|
| `eq` | `eq(column, value \| column)` | `field eq value` | `eq(users.name, "Alice")` |
| `ne` | `ne(column, value \| column)` | `field ne value` | `ne(users.status, "inactive")` |
| `gt` | `gt(column, value)` | `field gt value` | `gt(users.age, 18)` |
| `gte` | `gte(column, value)` | `field ge value` | `gte(users.age, 18)` |
| `lt` | `lt(column, value)` | `field lt value` | `lt(users.age, 65)` |
| `lte` | `lte(column, value)` | `field le value` | `lte(users.age, 65)` |

Notes:
- `eq` and `ne` support column-to-column comparison: `eq(users.id, contacts.userId)`
- `gt`, `gte`, `lt`, `lte` constrain `TOutput` to `number | string | Date | null`
- Values are type-checked against the column's input type (`TInput`)

## String Operators

| Operator | Signature | OData Output | Example |
|----------|-----------|-------------|---------|
| `contains` | `contains(column, value)` | `contains(field, value)` | `contains(users.name, "John")` |
| `startsWith` | `startsWith(column, value)` | `startswith(field, value)` | `startsWith(users.email, "admin")` |
| `endsWith` | `endsWith(column, value)` | `endswith(field, value)` | `endsWith(users.email, "@example.com")` |
| `matchesPattern` | `matchesPattern(column, pattern)` | `matchesPattern(field, pattern)` | `matchesPattern(users.name, "^A.*e$")` |

Notes:
- `matchesPattern` takes a raw regex string as the second argument, not a column
- `matchesPattern` constrains `TOutput` to `string | null`

## String Transform Functions

Wrap a column to transform its value before comparison. Used as the first argument to comparison operators.

| Function | Signature | OData Output | Example |
|----------|-----------|-------------|---------|
| `tolower` | `tolower(column)` | `tolower(field)` | `eq(tolower(users.name), "john")` |
| `toupper` | `toupper(column)` | `toupper(field)` | `eq(toupper(users.name), "JOHN")` |
| `trim` | `trim(column)` | `trim(field)` | `eq(trim(users.name), "John")` |

These return `ColumnFunction` which can be used anywhere a `Column` is accepted in filter operators.

## Array Operators

| Operator | Signature | OData Output | Example |
|----------|-----------|-------------|---------|
| `inArray` | `inArray(column, values[])` | `field in (v1, v2, ...)` | `inArray(users.status, ["active", "pending"])` |
| `notInArray` | `notInArray(column, values[])` | `not (field in (v1, v2, ...))` | `notInArray(users.role, ["banned", "deleted"])` |

## Null Check Operators

| Operator | Signature | OData Output | Example |
|----------|-----------|-------------|---------|
| `isNull` | `isNull(column)` | `field eq null` | `isNull(users.deletedAt)` |
| `isNotNull` | `isNotNull(column)` | `field ne null` | `isNotNull(users.email)` |

## Logical Operators

| Operator | Signature | OData Output | Example |
|----------|-----------|-------------|---------|
| `and` | `and(...expressions)` | `expr1 and expr2` | `and(eq(users.active, true), gt(users.age, 18))` |
| `or` | `or(...expressions)` | `expr1 or expr2` | `or(eq(users.role, "admin"), eq(users.role, "mod"))` |
| `not` | `not(expression)` | `not (expr)` | `not(eq(users.status, "deleted"))` |

Notes:
- `and()` and `or()` accept variadic `FilterExpression` arguments (minimum 1)
- If only one expression is passed, it is returned as-is (no wrapping)
- Nested logical expressions are automatically wrapped in parentheses for precedence

## OrderBy Operators

| Operator | Signature | Example |
|----------|-----------|---------|
| `asc` | `asc(column)` | `asc(users.name)` |
| `desc` | `desc(column)` | `desc(users.age)` |

Used in `.orderBy()`:
```ts
.orderBy(asc(users.name))
.orderBy(asc(users.lastName), desc(users.firstName))
.orderBy(users.name) // defaults to ascending
```

## Raw String Escape Hatch

`.where()` also accepts a raw OData filter string for edge cases:

```ts
.where("status eq 'active' and age gt 18")
```

Use this only when the type-safe operators are insufficient.

## Input Validator Integration

When a column has a `writeValidator`, filter operators automatically apply the validator to transform values before serializing to OData. For example, if a boolean column has a write validator that transforms `true` to `1`:

```ts
const active = numberField()
  .readValidator(z.coerce.boolean())
  .writeValidator(z.boolean().transform((v) => (v ? 1 : 0)));

// eq(table.active, true) produces: active eq 1
```

Async validators are not supported in filter expressions.

## Temporal Value Handling

Date, time, and timestamp columns automatically format values in OData-compatible formats:
- `dateField` -- `YYYY-MM-DD`
- `timeField` -- `HH:mm:ss`
- `timestampField` -- ISO 8601

Date objects passed as values are auto-converted. These values are unquoted in the OData filter string (no surrounding single quotes).
