---
"@proofkit/fmodata": patch
---

Allow Date objects as the second parameter for date, time, and timestamp filter operators (eq, ne, gt, gte, lt, lte). Date values are serialized to OData-friendly ISO strings (YYYY-MM-DD for date, HH:mm:ss for time, full ISO 8601 for timestamp).
