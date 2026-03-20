---
"@proofkit/cli": patch
---

Normalize only the final path segment in `parseNameAndPath`, preserving leading directory segments verbatim while keeping scoped-name parsing and `.` handling intact
