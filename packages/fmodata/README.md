# @proofkit/fmodata

TypeScript client for the FileMaker OData API.

## Installation

```bash
pnpm add @proofkit/fmodata
# or
npm install @proofkit/fmodata
# or
yarn add @proofkit/fmodata
```

## Quick Start

### Basic Authentication

```typescript
import { ODataApi, FetchAdapter } from "@proofkit/fmodata";

const client = ODataApi({
  adapter: new FetchAdapter({
    server: "https://your-server.example.com",
    database: "YourDatabase",
    auth: {
      username: "your-username",
      password: "your-password",
    },
  }),
});

// Get list of tables
const tables = await client.getTables();
console.log(tables.value);

// Query records
const records = await client.getRecords("YourTable", {
  $filter: "Name eq 'John'",
  $top: 10,
});

// Get a single record
const record = await client.getRecord("YourTable", "123");

// Create a record
const newRecord = await client.createRecord("YourTable", {
  data: {
    Name: "Jane Doe",
    Email: "jane@example.com",
  },
});

// Update a record
await client.updateRecord("YourTable", "123", {
  data: {
    Name: "Jane Smith",
  },
});

// Delete a record
await client.deleteRecord("YourTable", "123");
```

### Otto Authentication

```typescript
import { ODataApi, OttoAdapter } from "@proofkit/fmodata";

const client = ODataApi({
  adapter: new OttoAdapter({
    server: "https://your-server.example.com",
    database: "YourDatabase",
    auth: {
      apiKey: "dk_your-otto-api-key", // or "KEY_" prefix for Otto v3
      ottoPort: 3030, // Optional, only for Otto v3
    },
  }),
});
```

## API Reference

### Query Operations

#### `getTables(options?)`
Get list of all tables in the database.

#### `getMetadata(options?)`
Get OData metadata ($metadata endpoint).

#### `getRecords(table, options?)`
Query records from a table with optional filters.

**Options:**
- `$filter`: OData filter expression (e.g., `"Name eq 'John'"`)
- `$select`: Comma-separated list of fields to select
- `$expand`: Navigation properties to expand
- `$orderby`: Order by clause
- `$top`: Maximum number of records
- `$skip`: Number of records to skip
- `$count`: Include total count in response
- `$format`: Response format (`json`, `atom`, `xml`)

#### `getRecord(table, key, options?)`
Get a single record by primary key.

#### `getRecordCount(table, options?)`
Get count of records, optionally filtered.

#### `getFieldValue(table, key, field, options?)`
Get the value of a specific field.

#### `navigateRelated(table, key, navigation, options?)`
Navigate to related records through a navigation property.

#### `crossJoin(tables, options?)`
Perform a cross-join query between multiple tables.

### CRUD Operations

#### `createRecord(table, options)`
Create a new record.

**Options:**
- `data`: Record data as key-value pairs

#### `updateRecord(table, key, options)`
Update an existing record.

**Options:**
- `data`: Fields to update as key-value pairs

#### `deleteRecord(table, key, options?)`
Delete a record.

### Schema Operations

#### `createTable(options)`
Create a new table (schema modification).

**Options:**
- `tableName`: Name of the table
- `fields`: Array of field definitions

#### `addFields(table, options)`
Add fields to an existing table.

**Options:**
- `fields`: Array of field definitions

#### `deleteTable(table, options?)`
Delete a table.

#### `deleteField(table, field, options?)`
Delete a field from a table.

### Script Execution

#### `runScript(table, options)`
Run a FileMaker script.

**Options:**
- `script`: Script name
- `param`: Optional script parameter

### Batch Operations

#### `batchRequests(options)`
Execute multiple operations in a single batch request.

**Options:**
- `requests`: Array of request objects with `method`, `url`, `headers`, and `body`

## Error Handling

The client throws `FileMakerODataError` for API errors:

```typescript
import { FileMakerODataError } from "@proofkit/fmodata";

try {
  await client.getRecord("Table", "invalid-key");
} catch (error) {
  if (error instanceof FileMakerODataError) {
    console.error(`Error ${error.code}: ${error.message}`);
  }
}
```

## TypeScript Support

The client is fully typed and supports generic types:

```typescript
interface MyRecord {
  id: string;
  name: string;
  email: string;
}

const record = await client.getRecord<MyRecord>("MyTable", "123");
```

## License

MIT

