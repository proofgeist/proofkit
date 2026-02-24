# @proofkit/fmodata

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
