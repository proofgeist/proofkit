---
"@proofkit/typegen": patch
---

Fix fmodata type generation to preserve existing field-level customizations even when `clearOldFiles` is enabled.

Stale files in the output directory are now removed after regeneration, so dead generated files are still cleaned up without discarding validator customizations from existing schemas.
