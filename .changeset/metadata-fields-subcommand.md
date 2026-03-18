---
"@proofkit/fmodata": minor
---

Add metadata fields subcommand for listing table field names and metadata

- New `fmodata metadata fields` CLI command to list fields for a specific table
- Support `--table` option to specify target table (required)
- Support `--details` flag to include field metadata (type, nullable, etc)
- Simplifies field inspection workflow vs full metadata export
