#!/bin/bash

claude --dangerously-skip-permissions "\
1. Run 'bd ready' to find available work. \
2. Pick ONE task and run 'bd update <id> --status=in_progress'. \
3. Run 'bd show <id>' to understand the task. \
4. Implement the task. \
5. Run 'bd close <id>'. \
6. Run 'git add . && git commit' with a descriptive message. \
7. Run 'bd sync --from-main'. \
STOP AFTER ONE TASK."