Always run `pnpm run ci` from the root of the repo after completing a task and before committing
When editing package code, add a changeset file with fixes. Without it, changelog updates and version bumps will not happen. Changesets are not required for changes that only affect things like CI or formatting; only if the published code would need a version bump.
