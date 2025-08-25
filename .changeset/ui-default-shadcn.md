---
"@proofkit/cli": minor
---

CLI defaults to shadcn/ui for new projects. Legacy Mantine templates are still available via a hidden `--ui mantine` flag during `init`. The selected UI is persisted in `proofkit.json` as `ui`. Existing projects using Mantine are auto-detected and remain fully supported. For shadcn-based projects, adding new pages or auth via `proofkit add` requires passing the name of the component you want to add, such as `proofkit add table/basic`. Interactive selection of templates will come back soon!

This release also deprecates the `mantine` UI templates. In the next major release of the CLI, the `mantine` UI templates will no longer be supported for new projects.