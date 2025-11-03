# @proofkit/fmodata-mcp

MCP (Model Context Protocol) server for FileMaker OData API. This server exposes FileMaker OData operations as tools that can be used by AI assistants and other MCP clients.

## Installation

```bash
pnpm add @proofkit/fmodata-mcp
# or
npm install @proofkit/fmodata-mcp
# or
yarn add @proofkit/fmodata-mcp
```

## Configuration

The server reads configuration from environment variables:

### Required Variables
- `FMODATA_HOST` - FileMaker server host (e.g., `https://your-server.example.com`)
- `FMODATA_DATABASE` - Database name

### Authentication (choose one)

**Option 1: Basic Auth**
- `FMODATA_USERNAME` - FileMaker username
- `FMODATA_PASSWORD` - FileMaker password

**Option 2: Otto API Key**
- `FMODATA_OTTO_API_KEY` - Otto API key (`dk_` prefix for OttoFMS, `KEY_` prefix for Otto v3)
- `FMODATA_OTTO_PORT` - Otto port (optional, only for Otto v3, defaults to 3030)

## Usage

### Running the Server

```bash
node dist/index.js
# or after building
pnpm run build
node dist/index.js
```

### MCP Client Configuration

Add the server to your MCP client configuration (e.g., Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "fmodata": {
      "command": "node",
      "args": ["/path/to/@proofkit/fmodata-mcp/dist/index.js"],
      "env": {
        "FMODATA_HOST": "https://your-server.example.com",
        "FMODATA_DATABASE": "YourDatabase",
        "FMODATA_USERNAME": "your-username",
        "FMODATA_PASSWORD": "your-password"
      }
    }
  }
}
```

Or with Otto:

```json
{
  "mcpServers": {
    "fmodata": {
      "command": "node",
      "args": ["/path/to/@proofkit/fmodata-mcp/dist/index.js"],
      "env": {
        "FMODATA_HOST": "https://your-server.example.com",
        "FMODATA_DATABASE": "YourDatabase",
        "FMODATA_OTTO_API_KEY": "dk_your-api-key"
      }
    }
  }
}
```

## Available Tools

### Database Structure
- **`fmodata_list_tables`** - Get all tables in the database
- **`fmodata_get_metadata`** - Get OData metadata ($metadata)

### Data Query
- **`fmodata_query_records`** - Query records with filters, sorting, and pagination
  - Parameters: `table`, `filter`, `select`, `expand`, `orderby`, `top`, `skip`, `count`
- **`fmodata_get_record`** - Get a single record by primary key
  - Parameters: `table`, `key`, `select`, `expand`
- **`fmodata_get_record_count`** - Get count of records (optionally filtered)
  - Parameters: `table`, `filter`
- **`fmodata_get_field_value`** - Get specific field value
  - Parameters: `table`, `key`, `field`
- **`fmodata_navigate_related`** - Navigate related records through relationships
  - Parameters: `table`, `key`, `navigation`, `filter`, `select`, `top`, `skip`
- **`fmodata_cross_join`** - Perform cross-join query between tables
  - Parameters: `tables`, `filter`, `select`, `top`, `skip`

### Data Modification
- **`fmodata_create_record`** - Create new record
  - Parameters: `table`, `data`
- **`fmodata_update_record`** - Update existing record
  - Parameters: `table`, `key`, `data`
- **`fmodata_delete_record`** - Delete record
  - Parameters: `table`, `key`

### Schema Operations
- **`fmodata_create_table`** - Create new table
  - Parameters: `tableName`, `fields`
- **`fmodata_add_fields`** - Add fields to existing table
  - Parameters: `table`, `fields`
- **`fmodata_delete_table`** - Delete table
  - Parameters: `table`
- **`fmodata_delete_field`** - Delete field from table
  - Parameters: `table`, `field`

### Script Execution
- **`fmodata_run_script`** - Run FileMaker script
  - Parameters: `table`, `script`, `param` (optional)
- **`fmodata_batch`** - Execute batch operations
  - Parameters: `requests` (array of request objects)

## Example Usage

Once configured, you can use the tools through your MCP client:

```
User: List all tables in the database
Assistant: [calls fmodata_list_tables]
          Found 5 tables: Customers, Orders, Products, Suppliers, Categories

User: Get all customers named "John"
Assistant: [calls fmodata_query_records with table="Customers", filter="Name eq 'John'"]
          Found 3 customers matching the filter...

User: Create a new customer
Assistant: [calls fmodata_create_record with table="Customers", data={...}]
          Successfully created customer with ID 12345
```

## Development

### Building

```bash
pnpm run build
```

### Type Checking

```bash
pnpm run typecheck
```

## License

MIT

