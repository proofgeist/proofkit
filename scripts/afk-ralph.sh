#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

for ((i=1; i<=$1; i++)); do
  result=$(claude --permission-mode acceptEdits -p "\
  1. Run 'bd ready' to find available work. \
  2. If no tasks available, output <promise>COMPLETE</promise> and stop. \
  3. Pick ONE task and run 'bd update <id> --status=in_progress'. \
  4. Run 'bd show <id>' to understand the task. \
  5. Implement the task. \
  6. Run `pnpm ci` at the root to check tests, linters, and other quality gates. \
  7. Run 'bd close <id>'. \
  8. Use the graphite CLI to create a new branch with the name of the task and commit the changes. \
  9. Run 'bd sync'. \
  STOP AFTER ONE TASK.")

  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "All tasks complete after $i iterations."
    exit 0
  fi
done