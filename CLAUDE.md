# CLAUDE.md

This project is worked on by multiple assistant sessions in parallel (multiple Claude Code
instances, and a ChatGPT instance). **Before doing anything else in this repo, read
[Progress.md](Progress.md) in full**, and skim recent commits (`git log --oneline -20`) to see
what changed since Progress.md was last updated.

Progress.md is the single shared source of truth across all agents. Rules:

1. Read it fully before starting any task here.
2. After completing a unit of work, update Progress.md ("Current State", "Next Steps", and a
   dated "Log" entry) in the same commit as the code change, whenever practical.
3. Do not silently diverge from decisions recorded in "Open Decisions" — if you disagree, add a
   note and flag it for the human (Shrikar) rather than overriding it.
4. Commit early and often with clear messages; git history plus Progress.md is how other agents
   (including future you, in a new session) reconstruct context.

See [docs/event-brief.md](docs/event-brief.md) for the full hackathon problem statement this
project is being built for.

## Git identity for commits/pushes

The repo is owned by the `ShrikarSwami` GitHub account (`origin` points at
`github.com/ShrikarSwami/trust-in-the-hiring-funnel-hackathon-nyu`), but day-to-day commits and
pushes should be made using the **`slhj1208`** GitHub account/credentials — it already has
write access to this repo, and is the account expected to be active in `gh auth status` for
routine agent work. Do not switch the active `gh` account to `ShrikarSwami` for ordinary
commits; only the human should do that if repo-admin actions are ever needed. Local git commit
identity (`git config user.name` / `user.email`) should likewise stay `SLHJ1208`.
