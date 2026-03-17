# @proofkit/fmodata

## 0.1.0-beta.33

### Patch Changes

- 5544f68: - cli: Revamp the WebViewer Vite template and harden `proofkit init` (ignore hidden files, improve non-interactive prompts, stop generating Cursor rules).
  - cli: Install typegen skills locally when scaffolding projects.
  - typegen: Add optional `fmHttp` config for using an FM HTTP proxy during metadata fetching.
  - fmdapi/fmodata/webviewer: Add initial Codex skills for client and integration workflows.
- f3980b1: Add warnings to agent skills to prevent manually adding fields or inventing entity IDs in generated schema files; deduplicate common mistakes across skills with cross-refs to typegen-setup

## 0.1.0-beta.32

### Minor Changes

- 78a9f70: Add CLI binary with commands for records, schema, metadata, scripts, and webhooks

  - New `fmodata` command-line interface for database operations
  - Records command: Query, create, update, delete FileMaker records
  - Schema command: Inspect and manage database schema
  - Metadata command: Access FileMaker metadata and system information
  - Scripts command: Execute FileMaker scripts
  - Webhooks command: Manage webhook subscriptions and configuration

- de21bbe: Add select("all") to override defaultSelect on a per-query basis

### Patch Changes

- 1acca57: Update docs AI agent integration instructions

  Updated quick-start and index docs to reference npx @tanstack/intent@latest instead of npx skills

## 0.1.0-beta.31

### Minor Changes

- c5efdbd: fix(fmodata): align webhook types with actual FM OData API response

  BREAKING: `WebhookListResponse`, `WebhookInfo`, and `WebhookAddResponse` property names changed to match what the API actually returns:

  - `Status` → `status`, `WebHook` → `webhooks`
  - `webHookID` → `webhookID`, `url` → `webhook`
  - `webHookResult` → `webhookResult`

### Patch Changes

- 2cddedf: Fix `getMetadata()` key lookup when FileMaker Server returns the database name without `.fmp12` extension. Upgrade better-auth to 1.5.x (`createAdapter` → `createAdapterFactory`, removed `getAdapter`).

## 0.1.0-beta.29

### Patch Changes

- Allow Date objects as the second parameter for date, time, and timestamp filter operators (eq, ne, gt, gte, lt, lte). Date values are serialized to OData-friendly ISO strings (YYYY-MM-DD for date, HH:mm:ss for time, full ISO 8601 for timestamp).

## 0.1.0-beta.28

### Patch Changes

- 6c6b569: Fix navigate() losing per-table useEntityIds after Database.from() mutation fix

## 0.1.0-beta.27

### Patch Changes

- 840c7c1: Fix unquoted date/time/timestamp values in OData filters and fix `Database.from()` mutating shared `_useEntityIds` state

## 0.1.0-beta.26

### Minor Changes

- 553d386: Add OData string functions: `matchesPattern`, `tolower`, `toupper`, `trim`

## 0.1.0-beta.25

### Patch Changes

- 69fd3fb: BREAKING(@proofkit/better-auth): Use fmodata Database object instead of raw OData config.
  Config now requires `database` (fmodata Database instance) instead of
  `odata: { serverUrl, auth, database }`.
  Enables fetch override via FMServerConnection's fetchClientOptions.

## 0.1.0-beta.24

### Patch Changes

- b727425: Fix navigate() not including parent table in URL when defaultSelect is "schema" or object (#107)

## 0.1.0-beta.23

### Patch Changes

- 863e1e8: Update tooling to Biome

## 0.1.0-beta.22

### Patch Changes

- 4072415: Add `useEntityIds` override parameter to `getQueryString()` methods in QueryBuilder and RecordBuilder, allowing users to override entity ID usage when inspecting query strings without executing requests.

## 0.1.0-beta.21

### Minor Changes

- Beta release

## 0.0.0

Initial setup of the package.
