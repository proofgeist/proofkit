---
"@proofkit/cli": patch
---

Guard page add/remove against missing `src/app/navigation.tsx` so WebViewer apps don’t error when updating navigation. This safely no-ops when the navigation file isn’t present.