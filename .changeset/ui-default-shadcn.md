---
"@proofkit/cli": major
---

Learn more about v2 in the docs: [https://proofkit.com/docs/cli/v2](https://proofkit.com/docs/cli/v2)

CLI now defaults to shadcn/ui for new projects. Legacy Mantine templates are still available via a hidden `--ui mantine` flag during `init`. The selected UI is persisted in `proofkit.json` as `ui`. Existing projects using Mantine may not be fully supported.

For adding new pages or auth via `proofkit add`, you will need to pass the name of the component you want to add, such as `proofkit add table/basic`. See new templates in the [docs](/docs/templates).
