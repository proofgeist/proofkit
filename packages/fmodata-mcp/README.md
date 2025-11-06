# @proofkit/fmodata-mcp

MCP (Model Context Protocol) server for FileMaker OData API. This server exposes FileMaker OData operations as tools that can be used by AI assistants and other MCP clients.

## Installation

### Install from npm (Recommended)

```bash
npm install -g @proofkit/fmodata-mcp
# or
pnpm add -g @proofkit/fmodata-mcp
# or
yarn global add @proofkit/fmodata-mcp
```

Or use `npx` to run without installing:
```bash
npx @proofkit/fmodata-mcp --http --host=... --database=...
```

## Configuration

The server can be configured in two ways:

### Option 1: Configuration via MCP Args (Recommended)

**If installed globally**, use the `fmodata-mcp` command:

```json
{
  "mcpServers": {
    "fmodata": {
      "command": "fmodata-mcp",
      "args": [
        "--host",
        "https://your-server.example.com",
        "--database",
        "YourDatabase",
        "--ottoApiKey",
        "dk_your-api-key"
      ]
    }
  }
}
```

**If using npx**, use the full package name:

```json
{
  "mcpServers": {
    "fmodata": {
      "command": "npx",
      "args": [
        "-y",
        "@proofkit/fmodata-mcp",
        "--host",
        "https://your-server.example.com",
        "--database",
        "YourDatabase",
        "--ottoApiKey",
        "dk_your-api-key"
      ]
    }
  }
}
```

**If installed locally**, use the full path to the binary:

```json
{
  "mcpServers": {
    "fmodata": {
      "command": "node",
      "args": [
        "./node_modules/@proofkit/fmodata-mcp/dist/index.js",
        "--host",
        "https://your-server.example.com",
        "--database",
        "YourDatabase",
        "--ottoApiKey",
        "dk_your-api-key"
      ]
    }
  }
}
```

**Arguments:**
- `--host` or `--server` - FileMaker server host (required)
- `--database`, `--db`, or `--filename` - Database name (required)
- `--ottoApiKey`, `--apiKey`, or `--key` - Otto API key (`dk_` for OttoFMS, `KEY_` for Otto v3)
- `--ottoPort` or `--port` - Otto port (optional, only for Otto v3)
- `--username` or `--user` - FileMaker username (for Basic Auth)
- `--password` or `--pass` - FileMaker password (for Basic Auth)

You can also use `--key=value` format:
```json
{
  "mcpServers": {
    "fmodata": {
      "command": "node",
      "args": [
        "/path/to/fmodata-mcp/dist/index.js",
        "--host=https://your-server.example.com",
        "--database=YourDatabase",
        "--ottoApiKey=dk_your-api-key"
      ]
    }
  }
}
```

### Option 2: Environment Variables

The server can also read configuration from environment variables:

**Required Variables:**
- `FMODATA_HOST` - FileMaker server host (e.g., `https://your-server.example.com`)
- `FMODATA_DATABASE` - Database name

**Authentication (choose one):**

**Basic Auth:**
- `FMODATA_USERNAME` - FileMaker username
- `FMODATA_PASSWORD` - FileMaker password

**Otto API Key:**
- `FMODATA_OTTO_API_KEY` - Otto API key (`dk_` prefix for OttoFMS, `KEY_` prefix for Otto v3)
- `FMODATA_OTTO_PORT` - Otto port (optional, only for Otto v3, defaults to 3030)

**Note:** Configuration from args takes precedence over environment variables.

## Usage

### Running the Server

```bash
node dist/index.js
# or after building
pnpm run build
node dist/index.js
```

### MCP Client Configuration

Add the server to your MCP client configuration (e.g., Cursor `mcp.json`):

**Using global install (recommended):**
```json
{
  "mcpServers": {
    "fmodata": {
      "command": "fmodata-mcp",
      "args": [
        "--host",
        "https://your-server.example.com",
        "--database",
        "YourDatabase",
        "--ottoApiKey",
        "dk_your-api-key"
      ]
    }
  }
}
```

**Using npx (no install required):**
```json
{
  "mcpServers": {
    "fmodata": {
      "command": "npx",
      "args": [
        "-y",
        "@proofkit/fmodata-mcp",
        "--host",
        "https://your-server.example.com",
        "--database",
        "YourDatabase",
        "--ottoApiKey",
        "dk_your-api-key"
      ]
    }
  }
}
```

**Using environment variables:**
```json
{
  "mcpServers": {
    "fmodata": {
      "command": "node",
      "args": ["/path/to/fmodata-mcp/dist/index.js"],
      "env": {
        "FMODATA_HOST": "https://your-server.example.com",
        "FMODATA_DATABASE": "YourDatabase",
        "FMODATA_OTTO_API_KEY": "dk_your-api-key"
      }
    }
  }
}
```

**With Basic Auth:**
```json
{
  "mcpServers": {
    "fmodata": {
      "command": "node",
      "args": [
        "/path/to/fmodata-mcp/dist/index.js",
        "--host",
        "https://your-server.example.com",
        "--database",
        "YourDatabase",
        "--username",
        "your-username",
        "--password",
        "your-password"
      ]
    }
  }
}
```

### HTTP Mode (Express Server)

You can also run the server as an HTTP server on `localhost:3000`:

**Start the HTTP server:**

If installed globally:
```bash
fmodata-mcp --http --host=https://your-server.example.com --database=YourDatabase --ottoApiKey=dk_your-key
```

Or with npx:
```bash
npx @proofkit/fmodata-mcp --http --host=https://your-server.example.com --database=YourDatabase --ottoApiKey=dk_your-key
```

Or with Basic Auth:
```bash
fmodata-mcp --http --host=https://your-server.example.com --database=YourDatabase --username=your-user --password=your-pass
```

**Then configure MCP client to use the HTTP endpoint:**
```json
{
  "mcpServers": {
    "fmodata": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

**Note:** When using HTTP mode, you can start the server with configuration via args (as shown above) or use environment variables. The server will run on port 3000 by default (or the port specified by the `PORT` environment variable).

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

## Self-Hosting (Optional)

If you want to deploy the server as a hosted service (e.g., on Railway, Fly.io, Render), you can run it in HTTP mode:

1. **Deploy the server** with your configuration:
   ```bash
   fmodata-mcp --http --host=YOUR_HOST --database=YOUR_DB --ottoApiKey=YOUR_KEY
   ```

2. **Configure your MCP client** to use the HTTP endpoint:
   ```json
   {
     "mcpServers": {
       "fmodata": {
         "url": "https://your-deployed-server.com/mcp"
       }
     }
   }
   ```

**Note:** Each user should deploy their own instance with their own credentials for security. Shared instances are not recommended.

## Publishing

To publish a new version:

```bash
# Beta release
pnpm pub:beta

# Next/RC release
pnpm pub:next

# Production release
pnpm pub:release
```

Or use the monorepo's changeset workflow:
```bash
pnpm changeset
pnpm version-packages
pnpm release
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

