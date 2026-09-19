# Progress.md — Source of Truth

> **MANDATORY:** Every agent (Claude instance #1, Claude instance #2, ChatGPT, or any other assistant)
> MUST read this entire file — and skim recent git commit messages (`git log --oneline -20`) —
> before starting *any* new task on this project. Do not begin building until you've done this.
>
> After finishing a unit of work, update this file (new entry under "Log", plus "Current State"
> and "Next Steps" if they changed) and commit it along with your code changes in the same commit
> where possible. This file + git history is the single shared memory across all agents/chats
> working on this project.

## Project

**Trust in the Hiring Funnel Hackathon @ NYU**
NYU MakerSpace, Brooklyn — Saturday, Sep 19, 2026, 10:00 AM – 6:00 PM.
Full event brief: [docs/event-brief.md](docs/event-brief.md).

One-line problem: Generative AI has broken trust on both sides of hiring — recruiters can't
tell which applicants are real, and candidates can't tell which employers/offers are real.
Build a working tool (triage/screening layer, or a verification tool) that attacks either side
of the funnel, or the seam between them. Submissions due 4:30 PM; demos/judging 4:30–6:00 PM.

## Team / Agents Involved

- Claude instance A (this orchestrator / primary dev session)
- Claude instance B (secondary dev session — different machine/tab)
- ChatGPT / Codex instance (secondary dev assistant, see `AGENTS.md`)
- Shrikar Swami (human, final decision-maker)
- Abhiram Reddy "Ready" Kandadi (human, teammate — working a related/complementary angle with
  his own coding agents; see `AbhiramAgentHandoff.md` once added)

## Current State

- [2026-09-19] Repo initialized. Event brief extracted from Luma PDF into `docs/event-brief.md`.
  No idea/architecture chosen yet.
- [2026-09-19] Added root `AGENTS.md` with Codex instructions to fetch and read current
  main-branch coordination files before every task and directly update this file after
  each unit of work. Project direction and architecture remain undecided.
- [2026-09-19] Standardized git identity: routine commits/pushes across all agents use the
  `slhj1208` GitHub account (has write access to this `ShrikarSwami`-owned repo), documented
  in `CLAUDE.md` and `AGENTS.md`.
- [2026-09-19] Decided project direction: **Track B**. Two complementary components planned:
  (1) an Outlook-UI-style email scanner (this team's build — highlights suspicious sender
  domains, misspellings, and other impersonation signals red/green), and (2) a job-posting
  verification tool from teammate Abhiram (checks postings claiming to be from a company
  against that company's real published job list). Design for (1) is in progress
  (brainstorming session); handoff doc for (2) pending as `AbhiramAgentHandoff.md`.

## Next Steps

1. Decide which side of the challenge to attack (applicant-flood detection, impersonation/offer
   verification, or both) — see "Open Decisions" below.
2. Scaffold the chosen project structure once the idea is picked.
3. Follow `CLAUDE.md` and the Codex instructions in `AGENTS.md`; keep this file and commits
   in sync as the single source of truth across agents. Commit the new instructions and
   this progress update together so other checkouts receive them.

## Open Decisions (need human input or team consensus)

- [x] Which side of the funnel to target: **Track B — impersonation/offer-letter/recruiter
      verification** (Side B in `docs/event-brief.md`). Decided 2026-09-19.
- [ ] Tech stack for the Outlook-scan feature — under design as of 2026-09-19 (see brainstorming
      session in chat / upcoming design doc under `docs/superpowers/specs/`).
- [ ] Whether to integrate with an existing ATS — likely N/A for this angle (email-client-side
      feature, not ATS-side), revisit if scope changes.

## Log

Add a dated entry each time an agent completes a chunk of work. Keep entries short — link to
commits for detail.

- **2026-09-19** — Repo created (this commit). Event context captured. Awaiting idea selection.
- **2026-09-19** — Codex fetched and read main-branch `Progress.md` and `CLAUDE.md`, checked
  local files and recent commits, and added `AGENTS.md` to persist the same coordination
  requirements for future Codex tasks. Updated Current State and Next Steps directly;
  no implementation changes or project decisions made.
- **2026-09-19** — Claude (orchestrator) documented `slhj1208` as the standard git identity
  for commits/pushes in `CLAUDE.md` and `AGENTS.md`, and committed/pushed `AGENTS.md` plus
  this file under that account.
