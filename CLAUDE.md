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
`github.com/ShrikarSwami/trust-in-the-hiring-funnel-hackathon-nyu`).

- **AI agents working on Shrikar's components** (e.g. `email-scanner/`, and shared root files
  like this one/`Progress.md`) should commit/push as **`slhj1208`** — it already has write
  access, and is the account expected to be active in `gh auth status` for that work. Local git
  commit identity (`git config user.name` / `user.email`) should likewise be `SLHJ1208` /
  `SLHJ1208@gmail.com` for those commits.
- **This rule is for AI agents, not for Abhiram.** Abhiram commits under his own GitHub account
  (`abhiramkandadi`, already a repo collaborator with write access) for his own component
  (`job-posting-verifier/`) and anything else he does directly — that's his call, not a
  deviation to flag. If his own coding agent(s) are the ones committing on his behalf, same
  logic applies: they should use his identity, not `slhj1208`, since that's effectively
  Shrikar's own credentials.
