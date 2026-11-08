---
name: ship
description: "Use when: ready to ship changes. Review uncommitted changes with code-reviewer, fix findings, run checks, then commit once"
---
Run these steps in order, without skipping any. Do not commit before step 5.

1. Run `git status` and `git diff HEAD` to see the uncommitted changes (including untracked files).
2. Run the `code-reviewer` subagent on those uncommitted changes. Ask it to return a list of P0/P1 issues.
3. If there are P0/P1 issues, pass them to a general-purpose subagent with instructions to fix only those issues.
4. In `app/`, run `npm run typecheck` and `npm run lint`. If either fails, fix it and rerun (at most 2 times).
5. Commit all changes (original work plus fixes) with a conventional-commit message.

Do not `git push`. If any step fails twice, stop and report.
