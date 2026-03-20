---
"@proofkit/webviewer": patch
---

Soften the Vite FM bridge startup path when FM MCP responds but has no connected files. The dev server now logs a warning, injects a fallback bridge shim, and logs runtime errors if bridge calls are made before a file connects. Unreachable or unhealthy FM MCP still fails setup.
