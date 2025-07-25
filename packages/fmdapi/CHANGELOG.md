# @proofkit/fmdapi

## 5.0.1

### Patch Changes

- 2ff4cd1: Update how portal validation should be passed to the fmdapi client.
  To update, simply re-run the `npx @proofkit/typegen@latest` command and your files will be updated to the correct syntax. If you still see errors, try with the "--reset-overrides" flag to also re-create your overrides files.

## 5.0.0

### Major Changes

- 16fb8bd: Require layout to be passed when initializing client
- 16fb8bd: Use StandardSchemaV1 for validation and transforming data. No longer have to pass types directly when initializing the client
- 16fb8bd: Rename to @proofkit/fmdapi

## 5.0.0-beta.0

### Major Changes

- c01bed2: Require layout to be passed when initializing client
- c01bed2: Use StandardSchemaV1 for validation and transforming data. No longer have to pass types directly when initializing the client
- c01bed2: Rename to @proofkit/fmdapi

## 5.0.0

- Renamed package to `@proofkit/fmdapi`

# @proofgeist/fmdapi

## 4.3.2

### Patch Changes

- 570610f: fix: zod validators weren't running for find requests unless "ignoreEmptyResult" was true

## 4.3.1

### Patch Changes

- dfbdcd2: Expose the getToken method for the fetch adapter

## 4.3.0

### Minor Changes

- e806a30: New method for uploading container data

## 4.2.2

### Patch Changes

- 79547a1: [fix] Removed the redundant setToken call at the end of getToken method

## 4.2.1

### Patch Changes

- update maybeFindFirst to include ignore empty result by default

## 4.2.0

### Minor Changes

- new method: maybeFindFirst. Will return the first record if it exists, or null without erroring

## 4.1.5

### Patch Changes

- fix broken directory link

## 4.1.4

### Patch Changes

- Fix sorting query in base fetch adapter

## 4.1.3

### Patch Changes

- 3ec78d9: Fix `refreshToken` value in the FetchAdapter

## 4.1.2

### Patch Changes

- Added console warning when not using pagination params and not all data is returned

## 4.1.1

### Patch Changes

- Allow array of config to support multiple servers in a single config file
- f5751fb: add new option to clean out old files prior to running codegen, so removed schemas don't remain in your codebase

## 4.1.0

### Minor Changes

- ca692ee: Rewrote codegen command to use ts-morph instead of typescript. This allows for the script to be run directly from npm, and increses maintainability.
  Update tests to vitest

## 4.0.2

### Patch Changes

- fix omit type for queries

## 4.0.1

### Patch Changes

- eaba131: Fix type import for config file in codegen
- acd66f2: codegen: allow schema names that end with numbers

## 4.0.0

### Major Changes

- b6eb3dc: Extendable Adapters

### Patch Changes

- b6eb3dc: Add `layout` property to client return. Use for reference or as a helper to custom method which do not automatically recieve the layout property
- 76f46c9: Support webviewer import in codegen
- b6eb3dc: Remove `baseUrl` from client return

## 3.5.0

### Minor Changes

- f7777c1: Support for write operations in FileMaker 2024
- 514b2b6: Set global field values

## 3.4.2

### Patch Changes

- 5fe2192: Fix portal range options in query and create/update types
  Fixes [#100](https://github.com/proofgeist/fmdapi/issues/100) and [#101](https://github.com/proofgeist/fmdapi/issues/101)

## 3.4.0

### Minor Changes

- Handle dateformats option of DataAPI

### Patch Changes

- add more exports to index

## 3.3.10

### Patch Changes

- 28067f8: fix list all method

## 3.3.8

### Patch Changes

- don't reimport config statement

## 3.3.6

### Patch Changes

- fix wv find

## 3.3.5

### Patch Changes

- 63f1da5: Update generated comment header

## 3.3.4

### Patch Changes

- 7b2cadd: Add type validation helper functions for detecting Otto API keys

## 3.3.3

### Patch Changes

- a31c94c: add export for `tokenStores`
  adjust offset for automatic pagination functions

## 3.3.2

### Patch Changes

- don't rename limit param for find request

## 3.3.1

### Patch Changes

- fix offset param in find queries

## 3.3.0

### Minor Changes

- Add support for OttoFMS proxy

## 3.2.15

### Patch Changes

- e4d536e: Update findAll method similar to listAll method; offset fix
- 08e951d: Fix ReferenceError: \_\_dirname is not defined

## 3.2.14

### Patch Changes

- fix: remove offset if 0

## 3.2.13

### Patch Changes

- fix: listAll pagination offset

## 3.2.10

### Patch Changes

- use absolute imports

## 3.2.9

### Patch Changes

- remove node-fetch dep

## 3.2.8

### Patch Changes

- update packages

## 3.2.7

### Patch Changes

- add types decl to package.json

## 3.2.4

### Patch Changes

- improve exports

## 3.2.3

### Patch Changes

- add wv path to export
- 4fff462: allow no params to listAll method

## 3.2.2

### Patch Changes

- b604cf6: remove webviewer import from main index

## 3.2.1

### Patch Changes

- 8146800: add removeFMTableNames to main export

## 3.2.0

### Minor Changes

- 30aa8a9: Add WebViewer Client
  You can now use easily use this package with FileMaker webviewer integrations! Simply add @proofgeist/fm-webviewer-fetch to your project and specify the FM Script Name that runs the Execute Data API command in the fmschema.config file. Now you'll have autogenerated types for your FileMaker layouts but without sending calls via the network!

## 3.1.0

### Minor Changes

- c4f2345: Support portal fields in query type

### Patch Changes

- 8fd05d8: fix: add more error trapping when importing config file in codegen CLI

## 3.0.10

### Patch Changes

- 6745dd2: fix Codegen on Windows systems

## 3.0.9

### Patch Changes

- fix: remove fetch param from passing through to FM

## 3.0.8

- fix: file return types to conform to zod validator
- fix: if no token store is provided, default memory store was not being imported correctly
- fix: memory token store would throw error during zod validation
- add back default export
- support commonJS and module imports in codegen cli
- improve cli, supports .mjs config file by default
- 129f9a6: fix codegen import

## 3.0.0

### Major Changes

- 5c2f0d2: Use native fetch (Node 18+).

  This package now requires Node 18+ and no longer relys on the `node-fetch` package.
  Each method supports passing additional options to the `fetch` function via the `fetch` parameter. This is useful if used within a framework that overrides the global `fetch` function (such as Next.js).

### Minor Changes

- 5c2f0d2: Custom functions to override where the temporary access token is stored
- add LocalStorage and Upstash helper methods for token store
