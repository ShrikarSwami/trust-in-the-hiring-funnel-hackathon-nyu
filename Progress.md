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
- [2026-09-19] Added root `AGENTS.md` (Codex instructions) and standardized git identity:
  routine commits/pushes across all agents use the `slhj1208` GitHub account. Collaborators on
  the repo: `ShrikarSwami` (admin/owner), `slhj1208` (write), `abhiramkandadi` (write).
- [2026-09-19] Decided project direction: **Track B**, two complementary components:
  1. **Email trust scanner** (Shrikar's build) — real Outlook Office-JS add-in; hybrid
     rules+LLM detection; design approved and written up in
     [docs/superpowers/specs/2026-09-19-email-scanner-design.md](docs/superpowers/specs/2026-09-19-email-scanner-design.md).
     Not yet implemented — next step is an implementation plan (writing-plans skill), to be
     driven by a separate Claude instance (see that instance's own thread/session).
  2. **Job-posting verification tool** (Abhiram's build) — checks postings claiming to be from
     a company against that company's real published job list. No design yet; intentionally
     left for Abhiram + his agent(s) to brainstorm and design themselves.
- [2026-09-19] Added `AbhiramAgentHandoff.md`: onboarding doc for Abhiram's coding agent(s),
  covering both components, his own idea verbatim, a synthetic-email JSON schema for seeding
  the email scanner's test/demo mailbox (`slhj1208@outlook.com`, via IMAP APPEND — no real
  internet impersonation of any company involved), and instructions to design his own component
  the same way the email scanner was designed (brainstorm → short spec → build).

## Next Steps

1. **Email scanner:** hand the approved design spec to a fresh Claude instance to produce an
   implementation plan and build it in `email-scanner/` (Node/TS + React add-in, Node/TS +
   Express backend, Thor integration, synthetic-data seeding via IMAP APPEND).
2. **Job-posting verifier:** Abhiram (via `AbhiramAgentHandoff.md`) to brainstorm scope with his
   agent, get sign-off from Abhiram on a short design, then build in `job-posting-verifier/`.
3. Keep this file, `CLAUDE.md`/`AGENTS.md`, and commits in sync as the single source of truth
   across all agents/sessions/humans working on this project.

## Open Decisions (need human input or team consensus)

- [x] Which side of the funnel to target: **Track B — impersonation/offer-letter/recruiter
      verification**. Decided 2026-09-19.
- [x] Tech stack / architecture for the email scanner — see design spec linked above.
      Decided 2026-09-19.
- [ ] Scope/design for the job-posting verification tool — Abhiram's call, not yet made.
- [ ] Whether/how the two components' UI should visually match for a unified demo (e.g. shared
      color/verdict language) — not yet discussed with Abhiram; flagged in
      `AbhiramAgentHandoff.md` as something to raise rather than assume.
- [ ] Whether to integrate with an existing ATS — likely N/A for either component as currently
      scoped (both are client-side/verification tools, not ATS-side), revisit if scope changes.

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
- **2026-09-19** — Claude (orchestrator) ran a full brainstorming session with Shrikar for the
  email scanner component (build target, detection approach, domain-list source, LLM/Thor
  choice, verdict model, stack, repo layout, synthetic-data plan) and wrote the approved design
  to `docs/superpowers/specs/2026-09-19-email-scanner-design.md`. Added `AbhiramAgentHandoff.md`
  covering both components. Verified `abhiramkandadi` already has write access to the repo.
  No implementation started yet on either component.
