---
"@proofkit/better-auth": minor
"@proofkit/fmodata": patch
---

BREAKING(@proofkit/better-auth): Use fmodata Database object instead of raw OData config.
Config now requires `database` (fmodata Database instance) instead of
`odata: { serverUrl, auth, database }`.
Enables fetch override via FMServerConnection's fetchClientOptions.
