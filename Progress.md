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
of the funnel, or the seam between them. **Submissions due 4:00 PM** (moved up from the
originally-posted 4:30 PM — see `docs/event-brief.md`); demos/judging follow.

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

1. **Email scanner:** Task 1 (backend scaffold, shared types, env config) and Task 2
   (known-companies data + claimed-company detection) done in `email-scanner/backend`.
   Continue executing Tasks 3–15 of
   [docs/superpowers/plans/2026-09-19-email-scanner.md](docs/superpowers/plans/2026-09-19-email-scanner.md).
   **Shrikar action, can start now:** try an Outlook.com app password for
   `slhj1208@outlook.com` IMAP (plan Task 14 Step 3) — Outlook.com may reject basic-auth IMAP,
   in which case an Entra app registration is needed.
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
- [ ] **Email scanner data-model additions (proposed by Claude/email-scanner, not yet approved):**
      (1) `field: "sender"|"subject"|"body"` on each flag/verified entry — the spec's offsets
      only index the body, but the domain-mismatch/verified highlight sits on the sender address;
      (2) `llm_status` + `llm_summary` on ScanResult so the pane can say "AI check unavailable"
      and show the model's one-line impression; (3) LLM quotes that can't be located in the email
      are dropped. Plan proceeds with these unless Shrikar overrules.
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
- **2026-09-19** — Claude (email-scanner) read the approved spec and wrote the phased
  implementation plan `docs/superpowers/plans/2026-09-19-email-scanner.md` (15 tasks: backend
  rules TDD → Thor/Ollama client → Office add-in + sweep UI → synthetic data/calibration →
  IMAP seeding → demo runbook). Environment checks: Thor reachable, Ollama 0.32.6,
  `llama3:70b` resident (~22s cold / ~10s warm on a tiny prompt → 90s timeout, warm-up call,
  looping scan line while waiting); local Ollama on the Mac is NOT running (fallback needs
  `ollama serve` + model pulled). Task 1 (backend scaffold) done: `email-scanner/backend`
  package created with TS/vitest tooling, shared `types.ts` (ScanRequest/Flag/Verified/
  ScanResult/senderLine), and `config.ts` (`loadConfig`) reading Thor/Ollama + IMAP env vars;
  4/4 tests passing, `tsc --noEmit` clean. Tasks 2–15 still to come.
- **2026-09-19** — Claude (email-scanner) Task 1: scaffolded `email-scanner/backend` (package.json,
  tsconfig, vitest config, .env.example, .gitignore), added `src/types.ts` and `src/config.ts`;
  4/4 tests passing.
- **2026-09-19** — Claude (email-scanner) Task 2: added `email-scanner/data/known-companies.json`
  (14 seed companies) and `src/companies.ts` (`loadCompanies`, `emailDomain`, `domainMatches`,
  `findClaimedCompany`) for detecting which company an email claims to represent; 14/14 tests
  passing (10 new), `tsc --noEmit` clean.
