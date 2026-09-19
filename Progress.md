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
- ChatGPT instance (secondary dev assistant)
- Shrikar Swami (human, final decision-maker)

## Current State

- [2026-09-19] Repo initialized. Event brief extracted from Luma PDF into `docs/event-brief.md`.
  No idea/architecture chosen yet.

## Next Steps

1. Decide which side of the challenge to attack (applicant-flood detection, impersonation/offer
   verification, or both) — see "Open Decisions" below.
2. Scaffold the chosen project structure once the idea is picked.
3. Keep this file and commits in sync as the single source of truth across agents.

## Open Decisions (need human input or team consensus)

- [ ] Which side of the funnel to target: Side A (detecting AI-inflated/fake applicants) vs.
      Side B (impersonation/offer-letter/recruiter verification) vs. both.
- [ ] Tech stack.
- [ ] Whether to integrate with an existing ATS (per event guidance: "plugs into an existing
      applicant tracking system rather than replacing it" is preferred).

## Log

Add a dated entry each time an agent completes a chunk of work. Keep entries short — link to
commits for detail.

- **2026-09-19** — Repo created (this commit). Event context captured. Awaiting idea selection.
