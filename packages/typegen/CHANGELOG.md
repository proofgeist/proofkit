# @proofkit/typegen

## 1.1.0-beta.6

### Patch Changes

- UI updates

## 1.1.0-beta.5

### Patch Changes

- ae07372: Fix post-generate command to run once after all configs instead of once per config.
- 23639ec: Fix generated client authentication type detection to use OttoAdapter when OTTO_API_KEY environment variable is set with default names
- dfe52a7: Fix boolean transformations in odata

## 1.1.0-beta.4

### Minor Changes

- 7dbfd63: Add optional `postGenerateCommand` config option to run custom formatter after typegen completes. Users can now specify their own CLI command (e.g., `pnpm biome format --write` or `npx prettier --write`) to format generated files. The output paths are automatically appended as arguments to the command. This setting can be configured in the typegen UI's Global Settings section.

### Patch Changes

- 863e1e8: Update tooling to Biome
- Updated dependencies [863e1e8]
  - @proofkit/fmodata@0.1.0-beta.23
  - @proofkit/fmdapi@5.0.3-beta.1

## 1.1.0-beta.3

### Patch Changes

- Updated dependencies [4072415]
  - @proofkit/fmodata@0.1.0-beta.22

## 1.1.0-beta.2

### Minor Changes

- 7672233: New command: `npx @proofkit/typegen@latest ui` will launch a web UI for configuring and running your typegen config.
  (beta) support for @proofkit/fmodata typegen config.

### Patch Changes

- Updated dependencies
  - @proofkit/fmodata@0.1.0-beta.21

## 1.0.11-beta.1

### Patch Changes

- 4d9d0e9: Add type import to the `InferZodPortals` import

## 1.0.11-beta.0

### Patch Changes

- Updated dependencies [78cbab1]
  - @proofkit/fmdapi@5.0.3-beta.0

## 1.0.10

### Patch Changes

- 7c602a9: Export layoutName from generated schema files so consumers can import the layout name when generateClient is false. This avoids hard-coding layout strings elsewhere. No changes to generated clients.
- Updated dependencies [a29ca94]
  - @proofkit/fmdapi@5.0.2

## 1.0.9

### Patch Changes

- 2ff4cd1: Update how portal validation should be passed to the fmdapi client.
  To update, simply re-run the `npx @proofkit/typegen@latest` command and your files will be updated to the correct syntax. If you still see errors, try with the "--reset-overrides" flag to also re-create your overrides files.
- Updated dependencies [2ff4cd1]
  - @proofkit/fmdapi@5.0.1

## 1.0.8

### Patch Changes

- 56270f6: Fix strict numbers to use coerce

## 1.0.7

### Patch Changes

- Update README and package metadata

## 1.0.6

### Patch Changes

- Reduce error logs
- error trap around formatting
- Remove shared-utils dep

## 1.0.1

### Patch Changes

- b483d67: Update formatting after typegen to be more consistent

## 1.0.0

### Major Changes

- 16fb8bd: Introducing @proofkit/typegen

### Minor Changes

- 16fb8bd: Add CLI option to reset the overrides files

### Patch Changes

- 16fb8bd: export type for typegen config
- 16fb8bd: Fix client gen for no validator and no portals
- 16fb8bd: Better success/error messages when layouts aren't found
- 16fb8bd: Proper jsonc parsing
- Updated dependencies [16fb8bd]
- Updated dependencies [16fb8bd]
- Updated dependencies [16fb8bd]
  - @proofkit/fmdapi@5.0.0

## 1.0.0-beta.4

### Patch Changes

- Fix client gen for no validator and no portals

## 1.0.0-beta.3

### Minor Changes

- Add CLI option to reset the overrides files

## 1.0.0-beta.2

### Patch Changes

- export type for typegen config

## 1.0.0-beta.1

### Patch Changes

- 8eb5ad9: Better success/error messages when layouts aren't found
- 6ce4abe: Proper jsonc parsing

## 1.0.0-beta.0

### Major Changes

- f8df018: Introducing @proofkit/typegen

### Patch Changes

- Updated dependencies [c01bed2]
- Updated dependencies [c01bed2]
- Updated dependencies [c01bed2]
  - @proofkit/fmdapi@5.0.0-beta.0
