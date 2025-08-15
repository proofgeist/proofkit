# @proofgeist/kit

## 1.1.7

### Patch Changes

- 00177bf: Guard page add/remove against missing `src/app/navigation.tsx` so WebViewer apps don’t error when updating navigation. This safely no-ops when the navigation file isn’t present.
- Updated dependencies [7c602a9]
- Updated dependencies [a29ca94]
  - @proofkit/typegen@1.0.10
  - @proofkit/fmdapi@5.0.2

## 1.1.5

### Patch Changes

- Run typegen code directly instead of via execa
- error trap around formatting
- Remove shared-utils dep

## 1.1.0

### Minor Changes

- 7429a1e: Add simultaneous support for Shadcn. New projects will have Shadcn initialized automatically, and the upgrade command will offer to automatically add support for Shadcn to an existing ProofKit project.

### Patch Changes

- b483d67: Update formatting after typegen to be more consistent
- f0ddde2: Upgrade next-safe-action to v8 (and related dependencies)
- 7c87649: Fix getFieldNamesForSchema function

## 1.0.0

### Major Changes

- c348e37: Support @proofkit namespaced packages

### Patch Changes

- Updated dependencies [16fb8bd]
- Updated dependencies [16fb8bd]
- Updated dependencies [16fb8bd]
  - @proofkit/fmdapi@5.0.0

## 0.3.2

### Patch Changes

- 8986819: Fix: name argument in add command optional
- 47aad62: Make the auth installer spinner good

## 0.3.1

### Patch Changes

- 467d0f9: Add new menu command to expose all proofkit functions more easily
- 6da944a: Ensure using authedActionClient in existing actions after adding auth
- b211fbd: Deploy command: run build on Vercel instead of locally. Use flag --local-build to build locally like before
- 39648a9: Fix: Webviewer addon installation flow
- d0627b2: update base package versions

## 0.3.0

### Minor Changes

- 846ae9a: Add new upgrade command to upgrade ProofKit components in an existing project. To start, this command only adds/updates the cursor rules in your project.

### Patch Changes

- e07341a: Always use accessorFn for tables for better type errors

## 0.2.3

### Patch Changes

- 217eb5b: Fixed infinite table queries for other field names
- 217eb5b: New infinite table editable template

## 0.2.2

### Patch Changes

- ffae753: Better https parsing when prompting for the FileMaker Server URL
- 415be19: Add options for password strength in fm-addon auth. Default to not check for compromised passwords
- af5feba: Fix the launch-fm script for web viewer

## 0.2.1

### Patch Changes

- 6e44193: update helper text for npm after adding page
- 6e44193: additional supression of hydration warning
- 6e44193: move question about adding data source for new project
- 183988b: fix import path for reset password helper
- 6e44193: Make an initial commit when initializing git repo
- e0682aa: Copy cursor rules.mdc file into the base project.

## 0.2.0

### Minor Changes

- 6073cfe: Allow deploying a demo file to your server instead of having to pick an existing file

### Patch Changes

- d0f5c6e: Fix: post-install template functions not running

## 0.1.2

### Patch Changes

- 92cb423: fix: runtime error due to external shared package

## 0.1.1

### Patch Changes

- f88583c: prompt user to login to Vercel if needed during deploy command

## 0.1.0

### Minor Changes

- c019363: Add Deploy command for Vercel

### Patch Changes

- 0b7bf78: Allow setup without any data sources

## 0.0.15

### Patch Changes

- 1ff4aa7: Hide options for unsupported features in webviewer apps
- 5cfd0aa: Add infinite table page template
- 063859a: Added Template: Editable Table
- de0c2ab: update shebang in index
- b7ad0cf: Stream output from the typegen command

## 0.0.6

### Patch Changes

- Adding pages

## 0.0.3

### Patch Changes

- add typegen command for fm

## 0.0.2

### Patch Changes

- fix auth in init

## 0.0.2-beta.0

### Patch Changes

- fix auth in init
