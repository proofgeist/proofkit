---
"@proofkit/cli": minor
---

CLI defaults to shadcn/ui for new projects. Legacy Mantine templates are still available via a hidden `--ui mantine` flag during `init`. The selected UI is persisted in `proofkit.json` as `ui`. Existing projects using Mantine are auto-detected and remain fully supported. For shadcn-based projects, adding new pages or auth via `proofkit add` is temporarily disabled while we work on a new component system.