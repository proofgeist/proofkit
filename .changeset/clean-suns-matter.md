"@proofkit/typegen": patch
---

Make `@proofkit/fmdapi` and `@proofkit/fmodata` optional peers for `@proofkit/typegen`, and lazy-load each path so fmdapi-only and fmodata-only installs do not hard-require the other package.
