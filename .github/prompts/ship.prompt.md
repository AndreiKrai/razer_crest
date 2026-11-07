---
description: "Use when: ready to ship changes. Commit, review with code-reviewer, fix findings, then commit again"
agent: agent
tools: ['runSubagent', 'run_in_terminal', 'read_file', 'replace_string_in_file', 'get_errors']
---
Виконай послідовно, не пропускаючи кроків:

1. Зроби `git status` і `git diff`. Закомітити поточні зміни з conventional-commit повідомленням (проєкт використовує commitlint).
2. Запусти субагента `code-reviewer` на змінених файлах (diff від головної гілки). Попроси повернути список проблем P0/P1.
3. Якщо є P0/P1 — передай їх у субагента (за замовчуванням агент) з інструкцією виправити лише ці проблеми.
4. Запусти `npx tsc --noEmit` та `npm test`. Якщо падає — виправ і повтори (не більше 2 разів).
5. Зроби фінальний коміт `fix: address review feedback`.

Не роби `git push`. Якщо якийсь крок не вдався двічі — зупинись і доповідай.