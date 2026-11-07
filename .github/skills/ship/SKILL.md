---
name: ship
description: "Use when: ready to ship changes. Commit, review with code-reviewer, fix findings, run checks, then commit again"
---
Run these steps in order, without skipping any:

1. Run `git status` and `git diff`. Commit the current changes with a conventional-commit message.
2. Run the `code-reviewer` subagent on the changed files (diff against the main branch). Ask it to return a list of P0/P1 issues.
3. If there are P0/P1 issues, pass them to a general-purpose subagent with instructions to fix only those issues.
4. In `app/`, run `npm run typecheck` and `npm run lint`. If either fails, fix it and rerun (at most 2 times).
5. Make a final commit: `fix: address review feedback`.

Do not `git push`. If any step fails twice, stop and report.
