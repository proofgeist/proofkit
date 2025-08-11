---
"@proofkit/typegen": patch
---

Export layoutName from generated schema files so consumers can import the layout name when generateClient is false. This avoids hard-coding layout strings elsewhere. No changes to generated clients.