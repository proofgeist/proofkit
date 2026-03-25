---
"@proofkit/fmodata": patch
---

Fix batch sub-request URLs to use canonical FileMaker OData path format. Strips the Otto proxy prefix (`/otto/`) and `.fmp12` file extension from database names in sub-request URLs inside multipart batch bodies, which are processed directly by FileMaker's OData engine.
