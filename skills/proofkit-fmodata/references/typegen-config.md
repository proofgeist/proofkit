# Typegen Configuration Reference

Configuration options for @proofkit/typegen.

## Table of Contents

- [CLI Commands](#cli-commands)
- [Config File Structure](#config-file-structure)
- [fmodata Config](#fmodata-config)
- [fmdapi Config](#fmdapi-config)
- [Environment Variables](#environment-variables)
- [Examples](#examples)

## CLI Commands

```bash
# Generate types from config
npx @proofkit/typegen generate
npx @proofkit/typegen generate --config custom-config.json
npx @proofkit/typegen generate --env-path .env.local
npx @proofkit/typegen generate --reset-overrides

# Initialize new config
npx @proofkit/typegen init

# Launch interactive web UI
npx @proofkit/typegen ui
npx @proofkit/typegen ui --port 3000
npx @proofkit/typegen ui --no-open
```

### CLI Options

| Option | Description |
|--------|-------------|
| `--config <file>` | Config file path (default: `proofkit-typegen.config.jsonc`) |
| `--env-path <path>` | Path to `.env` file |
| `--reset-overrides` | Recreate override files even if they exist |
| `--port <number>` | UI server port (auto-finds available) |
| `--no-open` | Don't auto-open browser for UI |

## Config File Structure

Config files: `proofkit-typegen.config.jsonc` or `proofkit-typegen.config.json`

```jsonc
{
  // Single config
  "config": { ... },

  // Or multiple configs
  "config": [
    { "type": "fmodata", ... },
    { "type": "fmdapi", ... }
  ],

  // Run after generation (formatting, linting)
  "postGenerateCommand": "pnpm biome format --write ."
}
```

## fmodata Config

For OData API with typed field builders:

```jsonc
{
  "type": "fmodata",
  "configName": "MyODataConfig",  // Optional display name

  // Environment variable names
  "envNames": {
    "server": "FM_SERVER",        // Default: FM_SERVER
    "db": "FM_DATABASE",          // Default: FM_DATABASE
    "auth": {
      "apiKey": "OTTO_API_KEY"    // Default: OTTO_API_KEY
      // Or username/password:
      // "username": "FM_USERNAME",
      // "password": "FM_PASSWORD"
    }
  },

  // Tables to generate
  "tables": [
    {
      "tableName": "Customers",      // OData entity set name
      "variableName": "CustomersTable", // TS variable name (optional)
      "fields": [
        {
          "fieldName": "customer_id",
          "exclude": false,          // Exclude from generation
          "typeOverride": "text"     // Override detected type
        }
      ],
      "reduceMetadata": false,       // Omit entityIds/comments
      "alwaysOverrideFieldNames": false,
      "includeAllFieldsByDefault": true
    }
  ],

  // Global options
  "path": "schema",                  // Output directory
  "clearOldFiles": true,             // Wipe old generated files
  "reduceMetadata": false,           // Global metadata setting
  "alwaysOverrideFieldNames": false,
  "includeAllFieldsByDefault": true
}
```

### fmodata Type Overrides

| Type | Description |
|------|-------------|
| `text` | `textField()` |
| `number` | `numberField()` |
| `boolean` | `numberField()` with boolean validators |
| `date` | `dateField()` |
| `timestamp` | `timestampField()` |
| `container` | `containerField()` |

### fmodata Output

```
schema/
├── Customers.ts      # Table with field builders
├── Orders.ts
└── index.ts          # Re-exports all tables
```

Generated file example:

```typescript
import { fmTableOccurrence, textField, numberField } from "@proofkit/fmodata";

export const Customers = fmTableOccurrence(
  "Customers",
  {
    customer_id: textField().primaryKey().entityId("FMFID:100001"),
    name: textField().entityId("FMFID:100002"),
    balance: numberField().entityId("FMFID:100003"),
  },
  {
    entityId: "FMTID:1000001",
    navigationPaths: ["Orders"],
  }
);
```

## fmdapi Config

For REST Data API with Zod schemas:

```jsonc
{
  "type": "fmdapi",
  "configName": "MyRestConfig",

  "envNames": {
    "server": "FM_SERVER",
    "db": "FM_DATABASE",
    "auth": {
      "apiKey": "OTTO_API_KEY"
      // Or:
      // "username": "FM_USERNAME",
      // "password": "FM_PASSWORD"
    }
  },

  // Layouts to generate
  "layouts": [
    {
      "layoutName": "Customers_API",    // FM layout name
      "schemaName": "Customers",        // TS schema name
      "valueLists": "strict",           // "strict" | "allowEmpty" | "ignore"
      "generateClient": true,           // Generate layout client
      "strictNumbers": false            // Coerce strings to numbers
    }
  ],

  // Global options
  "path": "schema",
  "clearOldFiles": true,
  "validator": "zod/v4",         // "zod" | "zod/v4" | "zod/v3" | false
  "clientSuffix": "Layout",      // Suffix for client files
  "generateClient": true,        // Generate clients by default
  "webviewerScriptName": null    // Use WebViewerAdapter instead
}
```

### fmdapi Value List Options

| Option | Behavior |
|--------|----------|
| `strict` | `z.enum(["Option1", "Option2"])` |
| `allowEmpty` | `z.enum(["Option1", "Option2"]).catch("")` |
| `ignore` | `z.string()` (no enum constraint) |

### fmdapi Output

```
schema/
├── generated/
│   └── Customers.ts    # Auto-generated (don't edit)
├── client/
│   ├── Customers.ts    # Layout client
│   └── index.ts        # Re-exports
└── Customers.ts        # User-editable overrides
```

## Environment Variables

### Default Names

| Variable | Purpose | Default |
|----------|---------|---------|
| `FM_SERVER` | FileMaker server URL | Required |
| `FM_DATABASE` | Database name (with .fmp12) | Required |
| `OTTO_API_KEY` | OttoFMS API key | For Otto auth |
| `FM_USERNAME` | FileMaker username | For basic auth |
| `FM_PASSWORD` | FileMaker password | For basic auth |
| `OTTO_PORT` | OttoFMS port | Optional |

### .env File Example

```bash
FM_SERVER=https://fm.example.com
FM_DATABASE=MyDatabase.fmp12
OTTO_API_KEY=your-api-key-here

# Or for basic auth:
# FM_USERNAME=admin
# FM_PASSWORD=secret
```

## Examples

### Minimal fmodata Config

```jsonc
{
  "config": {
    "type": "fmodata",
    "tables": [
      { "tableName": "Customers" },
      { "tableName": "Orders" }
    ]
  }
}
```

### Minimal fmdapi Config

```jsonc
{
  "config": {
    "type": "fmdapi",
    "layouts": [
      { "layoutName": "Customers_API", "schemaName": "Customers" }
    ]
  }
}
```

### Multiple Configs

```jsonc
{
  "config": [
    {
      "type": "fmodata",
      "configName": "OData Tables",
      "tables": [
        { "tableName": "Customers" }
      ],
      "path": "schema/odata"
    },
    {
      "type": "fmdapi",
      "configName": "REST Layouts",
      "layouts": [
        { "layoutName": "Dashboard", "schemaName": "Dashboard" }
      ],
      "path": "schema/rest"
    }
  ],
  "postGenerateCommand": "pnpm biome format --write ."
}
```

### With Field Customization

```jsonc
{
  "config": {
    "type": "fmodata",
    "tables": [
      {
        "tableName": "Users",
        "fields": [
          { "fieldName": "internal_id", "exclude": true },
          { "fieldName": "is_active", "typeOverride": "boolean" },
          { "fieldName": "created_date", "typeOverride": "timestamp" }
        ]
      }
    ]
  }
}
```

### WebViewer Mode (fmdapi)

```jsonc
{
  "config": {
    "type": "fmdapi",
    "webviewerScriptName": "WebViewer API",
    "layouts": [
      { "layoutName": "Mobile_Layout", "schemaName": "Mobile" }
    ]
  }
}
```

### Post-Generate Commands

```jsonc
{
  "config": { ... },

  // Format with Biome
  "postGenerateCommand": "pnpm biome format --write ."

  // Or Prettier
  // "postGenerateCommand": "pnpm prettier --write schema/"

  // Or ESLint
  // "postGenerateCommand": "pnpm eslint --fix schema/"
}
```
