# Phase 04: Release Hardening & Beta Exit Preparation

This phase hardens the CI/CD pipeline, validates the full release process end-to-end, and prepares for exiting beta prerelease mode. By the end, the release pipeline will be validated and ready for the stable release cut. The actual `changeset pre exit` command should be run manually by a maintainer when ready — this phase prepares everything needed for that moment.

## Tasks

- [ ] Audit and fix CI workflow issues:
  - Review `.github/workflows/release.yml` for any gaps or issues:
    - Verify all job dependencies are correct (lint → typecheck → test → smoke → release)
    - Ensure Node version is consistent across jobs (some use 22, release uses 24 — verify this is intentional)
    - Check that the `changesets/action@v1` step has correct configuration for the beta prerelease mode
  - Review `.github/workflows/continuous-release.yml` (PR checks):
    - Verify the `pkg-pr-new publish` step works correctly for preview packages
    - Ensure all parallel jobs (lint, typecheck, test, build) have consistent Node/pnpm versions
  - Check that Doppler OIDC authentication is properly configured for smoke tests (`.github/workflows/release.yml` smoke test job). Don't modify secrets, just verify the workflow references are correct.

- [ ] Validate the changeset configuration for stable release:
  - Read `.changeset/config.json` and verify settings are correct for public release:
    - `access: "public"` is set
    - `baseBranch: "main"` is correct
    - `ignore` list only contains packages that should not be published (`@proofkit/docs`, `@proofkit/typegen-web`)
    - `updateInternalDependencies: "patch"` is appropriate
  - Read `.changeset/pre.json` and document the current beta state: which packages have beta versions, how many changesets are queued.
  - Create a checklist file at `docs/release/beta-exit-checklist.md` with structured markdown (front matter: type: reference, tags: [release, beta, checklist]) documenting:
    1. Pre-exit steps (run full CI, verify all tests pass, review doc staleness report)
    2. The exit command: `pnpm changeset pre exit`
    3. Post-exit steps (run `pnpm changeset version`, review generated changelogs, commit, push, let CI release)
    4. Rollback plan if something goes wrong
    5. List of packages and their current beta versions vs expected stable versions

- [ ] Ensure all packages build cleanly for release:
  - Run `pnpm build` from the repo root and verify all packages compile without errors.
  - Run `pnpm --filter @proofkit/registry build` separately since it's private — verify it still builds even if it might be removed later.
  - Check that each package's `package.json` has correct `exports`, `main`, `types`, and `files` fields for npm publishing.
  - Run `pnpm dlx publint` on each package (or check if it's already part of the build pipeline) to validate package entry points.

- [ ] Run the complete CI pipeline locally to simulate a release:
  - Run `pnpm run ci` (lint + typecheck + test) from the repo root.
  - Run `pnpm build` to verify build succeeds.
  - Run `pnpm changeset status` to see the current changeset queue and verify it reports correctly.
  - If smoke tests can be run locally (check if Doppler secrets are available), run `pnpm --filter @proofkit/cli test:smoke`. If not, note this as a CI-only gate.
  - Fix any issues found during this validation.

- [ ] Create a release runbook document:
  - Create `docs/release/release-runbook.md` with structured markdown front matter (type: reference, tags: [release, process, runbook]) documenting:
    1. The complete release process from changeset creation to npm publish
    2. How the CI pipeline validates each step
    3. How to handle common failure scenarios (failed publish, partial release, reverted changeset)
    4. How the doc-staleness check (from Phase 02) integrates into the process
    5. How skill staleness checks (notify-intent → check-skills) fit into the release cycle
    6. Contact/escalation info if the release pipeline breaks
  - Use `[[Beta-Exit-Checklist]]` wiki-link to cross-reference the checklist from the previous task.
