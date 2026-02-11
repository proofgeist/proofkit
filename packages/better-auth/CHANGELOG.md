# @proofkit/better-auth

## 0.4.0-beta.5

### Patch Changes

- Updated dependencies [6c6b569]
  - @proofkit/fmodata@0.1.0-beta.28

## 0.4.0-beta.4

### Patch Changes

- Updated dependencies [840c7c1]
  - @proofkit/fmodata@0.1.0-beta.27

## 0.4.0-beta.3

### Patch Changes

- Updated dependencies [553d386]
  - @proofkit/fmodata@0.1.0-beta.26

## 0.4.0-beta.2

### Minor Changes

- 69fd3fb: BREAKING(@proofkit/better-auth): Use fmodata Database object instead of raw OData config.
  Config now requires `database` (fmodata Database instance) instead of
  `odata: { serverUrl, auth, database }`.
  Enables fetch override via FMServerConnection's fetchClientOptions.

### Patch Changes

- Updated dependencies [69fd3fb]
  - @proofkit/fmodata@0.1.0-beta.25

## 0.3.1-beta.1

### Patch Changes

- 2858f6a: Fix TypeScript build errors by making adapter/migration types resilient to upstream Better Auth changes.

## 0.3.1-beta.0

### Patch Changes

- 863e1e8: Update tooling to Biome

## 0.3.0

### Minor Changes

- 10f3fc4: Change underlying fetch implementation

## 0.2.4

### Patch Changes

- Auto load env vars in migrate CLI

## 0.2.3

### Patch Changes

- update types

## 0.2.2

### Patch Changes

- update migration field types

## 0.2.1

### Patch Changes

- Add debug logging
- Fix date parsing in odata filter query

## 0.2.0

### Minor Changes

- Make raw odata requests

## 0.2.0-beta.0

### Minor Changes

- Make raw odata requests
