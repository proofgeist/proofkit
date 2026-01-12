#!/bin/bash

claude --dangerously-skip-permissions "\
1. Run 'bd ready' to find available work. \
2. Pick ONE task and run 'bd update <id> --status=in_progress'. \
3. Run 'bd show <id>' to understand the task. \
4. Implement the task. \
5. Run `pnpm ci` at the root to check tests, type checks, and other quality gates. \
6. Run 'bd close <id>'. \
7. Use the graphite CLI to create a new branch with the name of the task and commit the changes. \
8. Run 'bd sync --from-main'. \
STOP AFTER ONE TASK."