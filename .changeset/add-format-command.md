---
"@proofkit/typegen": minor
---

Add optional `postGenerateCommand` config option to run custom formatter after typegen completes. Users can now specify their own CLI command (e.g., `pnpm biome format --write` or `npx prettier --write`) to format generated files. The output paths are automatically appended as arguments to the command. This setting can be configured in the typegen UI's Global Settings section.

