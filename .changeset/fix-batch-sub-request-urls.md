---
"@proofkit/fmodata": patch
---

Fix batch sub-request URLs to use canonical FileMaker OData path format. Strips the Otto proxy prefix (`/otto/`) and `.fmp12` file extension from database names in sub-request URLs inside multipart batch bodies, which are processed directly by FileMaker's OData engine. Also fix `InvalidLocationHeaderError` in batch insert/update sub-responses by gracefully handling missing Location headers (returns ROWID -1 instead of throwing).
