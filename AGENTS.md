# AGENTS.md — Codex project instructions

These instructions apply to every Codex task in this repository, including questions,
research, planning, reviews, and implementation. Follow the shared coordination rules in
[CLAUDE.md](CLAUDE.md). [Progress.md](Progress.md) is the single source of truth for project
state, decisions, and next steps; this file defines the workflow, not a separate project log.

## Git identity for commits/pushes

Commit and push using the **`slhj1208`** GitHub account. The repo is owned by `ShrikarSwami`,
but `slhj1208` already has write access and is the account expected to be active in
`gh auth status` for routine work — do not switch the active `gh` account to `ShrikarSwami`
for ordinary commits. If `gh auth status` shows a different account active, switch back with
`gh auth switch --hostname github.com --user slhj1208` before pushing. Local git commit
identity (`git config user.name` / `user.email`) should likewise be `SLHJ1208`.

## Before every task

1. Fetch the current main branch with `git fetch origin main`, then read both files in full:
   - `git show origin/main:Progress.md`
   - `git show origin/main:CLAUDE.md`
2. Read the working-copy `Progress.md` and `CLAUDE.md` as well. Check `git status --short`
   and skim recent commits with `git log --oneline -20` and
   `git log origin/main --oneline -20` to account for local work and other agents' changes.
3. Preserve existing local edits. Fetching main does not authorize overwriting the working
   tree. Reconcile relevant differences before proceeding; flag conflicting project
   decisions to the user rather than silently choosing one.
4. Do not rely on an earlier conversation or cached file contents. If current main cannot
   be fetched, try the raw GitHub URLs for these files. If neither method works, stop and
   ask the user for the current contents before proceeding:
   - https://raw.githubusercontent.com/ShrikarSwami/trust-in-the-hiring-funnel-hackathon-nyu/main/Progress.md
   - https://raw.githubusercontent.com/ShrikarSwami/trust-in-the-hiring-funnel-hackathon-nyu/main/CLAUDE.md

## After every unit of work

1. Update the repository's `Progress.md` yourself whenever the checkout is writable. This
   is part of completing the task and does not need a separate user request or approval.
   Use the existing capitalized filename; do not create a second `progress.md`.
2. Re-read the file immediately before editing so another collaborator's entries are
   preserved. Keep changes focused on the work just completed:
   - Record what changed and any relevant verification results or remaining blockers.
   - Update **Current State** to reflect the actual outcome.
   - Review and update **Next Steps**; preserve still-valid actions if they did not change.
   - Add a dated **Log** entry identifying Codex and summarizing the completed work.
3. Respect **Open Decisions**. Record proposals as proposals, and flag disagreements to
   the user instead of treating an undecided question as an approved decision.
4. Review the final diff and run checks appropriate to the change before claiming success.
5. Include `Progress.md` with related changes in the same commit whenever practical. In
   the final response, state whether the update was committed; if it remains uncommitted,
   explicitly remind the user that it must be committed to the repository.
6. If direct editing is unavailable, provide an applicable patch against the current file
   and explain that it still needs to be applied and committed. Do not substitute a chat
   summary for an actual file update when editing is possible.
