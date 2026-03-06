---
"@proofkit/fmodata": patch
"@proofkit/better-auth": minor
---

Fix `getMetadata()` key lookup when FileMaker Server returns the database name without `.fmp12` extension. Upgrade better-auth to 1.5.x (`createAdapter` → `createAdapterFactory`, removed `getAdapter`).
