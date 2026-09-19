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
     **All 15 implementation-plan tasks are code-complete** (see Next Steps for the two
     human-only checks still open: live Outlook verification, IMAP password).
     In progress in `email-scanner/backend`: Tasks 1–7 done (scaffold/types/config,
     known-companies data + claimed-company detection, sender-domain rule, spellcheck rule
     with false-positive guards, verdict computation, LLM prompt/tolerant JSON parsing/span
     location, Ollama client with retry/timeout/warm-up/health + live smoke script). **Backend
     complete (Task 8):** `src/scan.ts` (`scanEmail` orchestrator) and `src/server.ts`
     (`createApp`, Express 5, `POST /scan` + `GET /health`) + `src/index.ts` entrypoint; 51/51
     tests passing. Live end-to-end run against Thor (`llama3:70b`) via the real HTTP server
     confirmed working: `GET /health` → `reachable: true, modelPresent: true`; `POST /scan` on
     a fake Tesla/Gmail email → `"Likely Scam"` with `domain_mismatch`, a `misspelling` on
     "detials", two `llm_*` flags, `llm_status: "ok"`, ~22s. Local Ollama fallback
     (`localhost:11434`) still down — needs `ollama serve` + `ollama pull qwen2.5vl:7b` before
     demo if Thor is unreachable. **Task 9 done:** scaffolded `email-scanner/addin` (Yeoman
     `generator-office` React+TypeScript Outlook add-in, React 18.3.1, webpack-dev-server 6, XML
     manifest); added the `/api` proxy to `webpack.config.js` (`/api/*` → `http://localhost:3001`);
     renamed manifest to "Trust Scanner" and fixed it to a read-scenario add-in
     (`MessageReadCommandSurface`, `ReadItem`, button label "Scan for scams"; validated clean via
     `office-addin-manifest validate`). Dev certs installed. Verified with both servers running:
     `https://localhost:3000/taskpane.html` serves HTML and `https://localhost:3000/api/health`
     proxies through to the backend's real JSON. Sideload into Outlook on the web NOT attempted
     (needs Shrikar's sign-in) — steps in Next Steps below. **Task 11 implemented locally:** the add-in task pane now reads the open email, scans through `/api/scan`, sweeps over plain-text highlights, and shows verdict/findings; the extra ribbon action was removed. Typecheck, unit tests, production build, and manifest validation pass; a follow-up fixed the dev-server hot-reload render path and rechecked typecheck/build. Live Outlook verification and screenshot remain pending with Shrikar. **Task 10 done:** pure highlight
     segment builder for the task pane — `src/taskpane/types.ts` (verbatim copy of backend
     types), `src/taskpane/lib/segments.ts` (`marksFor`, `buildSegments`, tiling overlap
     resolution: hard > soft > verified, later mark clipped), TDD with vitest (added as
     devDependency, `npm run test:unit`); 5/5 tests passing, `tsc --noEmit` and `webpack --mode
     development` both clean. Tasks 11–15 of the implementation plan (sweep UI wiring, synthetic
     data, IMAP seeding, demo runbook) still to come.
  2. **Job-posting verification tool** (Abhiram's build) — checks postings claiming to be from
     a company against that company's real published job list. Designed and built — see the
     "Job-posting verifier built" entry below.
- [2026-09-19] Added `AbhiramAgentHandoff.md`: onboarding doc for Abhiram's coding agent(s),
  covering both components, his own idea verbatim, a synthetic-email JSON schema for seeding
  the email scanner's test/demo mailbox (`slhj1208@outlook.com`, via IMAP APPEND — no real
  internet impersonation of any company involved), and instructions to design his own component
  the same way the email scanner was designed (brainstorm → short spec → build).

- [2026-09-19] **Job-posting verifier built** in `job-posting-verifier/` (Abhiram; Next.js App
  Router + TS + Tailwind; **demoed on localhost, no Vercel deploy**). Demo company: **Coinbase** (Greenhouse, 217 live roles);
  Stripe + Airbnb snapshotted in `data/cache/` as fallbacks. `lib/ats/` (greenhouse/lever/ashby +
  `resolveCompany`), `lib/match.ts` (conservative matcher), two-column UI at `/`, case file for red
  postings. Left column reads `data/claimed-postings.json`; currently 4 **fabricated placeholders**
  (source "Demo sample"). Abhiram is collecting the real scraped postings. Design was settled by
  Abhiram directly (brainstorm phase skipped by his instruction); real scraped postings are the
  core, fabricated data is a labelled supplement only (overrides the handoff doc). Demo path:
  `cd job-posting-verifier && npm run build && npm start` -> http://localhost:3000 (verified
  serving: 217 live Coinbase roles, 4 placeholder postings -> verified/verified/no_such_req x2).
  Pushed to `origin/main` under `abhiramkandadi` per Abhiram's instruction (CLAUDE.md says
  `slhj1208` — **Shrikar please note**).

- [2026-09-19] **Email scanner demo pivot: real IMAP/Outlook dependency dropped for judging.**
  Both real-mailbox seeding paths hit hard walls: basic-auth IMAP → `Login is disabled`;
  OAuth device-code (after registering `trust-scanner-seed` in Entra, adding the
  `IMAP.AccessAsUser.All` permission via manifest edit since the picker UI couldn't find
  Exchange Online on this personal tenant, enabling public client flows) → authenticated
  successfully but `User is authenticated but not connected` — the mailbox's IMAP protocol
  access itself is blocked server-side, not fixable client-side. Per Shrikar: stop pursuing
  IMAP, build a **standalone Outlook-lookalike demo page** instead
  (`email-scanner/addin/src/demo/`, served at `/demo.html` alongside the real add-in, new
  webpack entry). Reuses the real, tested task-pane pieces (`Highlighted`, `marksFor`,
  `VerdictBanner`, `FlagList`, `useSweep`) with zero Office.js — an Outlook-style shell
  (folder rail, inbox list populated directly from the 30 synthetic emails, reading pane) that
  needs no Outlook account or IMAP at all. `seed-mailbox.ts`/`get-outlook-token.ts` stay in the
  repo as correct, tested code, just unused for this event.
  Iterated per feedback into its current state: real Outlook fonts/metrics inspected live via
  Claude in Chrome; sponsor/event emails (Solari, Block Convey, Visionbrew, Integral
  Recruiting, localhost:nyc, NYU, Meta) reordered to the top of the inbox; all emails now greet
  "Somya Gupta" (varied Somya/Somya Gupta/Mr. Gupta) instead of a generic name; emoji chrome
  icons replaced with flat monochrome SVGs; scanline/highlight animation made more dramatic
  (glowing gradient sweep, pulsing red "spotlight" on hard flags); a "Check {company}'s real
  careers page" button appears after scanning, linking to each company's actual careers page
  (verified via web search) — omitted for the 3 fictional demo companies with no real page.
  **`backend/scripts/cache-demo-results.ts`** pre-computes real scan results (live Thor) for
  all 30 emails into `addin/src/demo/scan-cache.json`; the demo checks this cache first (a
  short artificial delay keeps the sweep feeling intentional) and falls back to a live call on
  a miss — makes the demo both fast and immune to Thor/Tailscale flakiness during judging.
  Recomputed after the name-length change (offsets shift). Confirmed clean end to end: backend
  tests, add-in tests, both typechecks, production build.

## Next Steps

1. **Email scanner — Tasks 1–15 of
   [docs/superpowers/plans/2026-09-19-email-scanner.md](docs/superpowers/plans/2026-09-19-email-scanner.md)
   are ALL CODE-COMPLETE.** History: Claude did 1–10, a Codex session did most of Task 11
   (task-pane UI) before running out of credits mid-session (left `synthetic-emails.json`
   uncommitted), Claude (this orchestrator session, standing in while Opus/Codex are
   unavailable) did the rest: finished/committed Task 12 (calibration found and fixed one
   false-positive), Task 14b, Task 13, Task 14, and most of Task 15.
   - Backend (`email-scanner/backend`): 52 vitest tests passing, `tsc --noEmit` clean.
   - Add-in (`email-scanner/addin`): task-pane UI + sweep animation + verdict/flags (Task 11)
     built by Codex, `tsc --noEmit` + `test:unit` + `npm run build` all clean — **not yet
     verified live in Outlook by a human** (agents can't drive the actual Outlook UI).
   - `data/synthetic-emails.json`: 16 emails. `npm run calibrate` **confirmed 16/16 passing**
     after the allowlist fix.
   - Task 14b sample picker: built, typechecked, tested, built successfully. Not yet clicked in
     real Outlook.
   - Task 13/14: **CLOSED, both real-mailbox auth paths dead-ended** (basic-auth: `Login is
     disabled`; OAuth device-code, after full Entra app setup: `authenticated but not
     connected` — the mailbox's IMAP protocol access itself is blocked server-side). Shrikar's
     final call: stop pursuing real IMAP entirely. `.eml` builder + seed script stay in the
     repo as correct, tested code, just unused for this event.
   - Task 15: Thor-down drill and `LLM_ENABLED=false` drill both verified live (see Log).
     `email-scanner/README.md` runbook written and reflects the demo pivot below. Final sweep
     **confirmed clean**: backend 52/52 tests + `tsc --noEmit`, add-in tests + `tsc --noEmit`,
     production build.
   - **DEMO PLAN CHANGED:** the live judged demo uses **`email-scanner/addin/dist/demo.html`**
     (standalone Outlook-lookalike page, see Current State), not the real Outlook add-in. The
     real add-in still exists and still works (sideload steps in `README.md`) if Shrikar wants
     to show "yes it's a real Outlook add-in too," but the demo.html page is the primary,
     rehearsed, judging-day path — start both servers (`backend: npm start`,
     `addin: npm run dev-server`) and open `https://localhost:3000/demo.html`.

   **Sponsor/event-themed data expansion (2026-09-19, done):** Shrikar asked for 14 more
   synthetic emails (7 legit, 7 scam) using this event's own sponsors/hosts as claimed
   companies — Solari (`getsolari.com`), Block Convey (`blockconvey.com`), Visionbrew
   (`visionbrew.app`), Integral Recruiting (`integralrecruiting.com`), localhost:nyc
   (`localhost-nyc.com`), NYU (`nyu.edu`), plus Meta as a legit big-name example — for a "cute"
   demo touch judges will recognize. Real domains confirmed via web search, not guessed. Added
   to `known-companies.json` and `synthetic-emails.json` (now 30 emails total: `legit-007..013`,
   `scam-011..017`); `samples.json` regenerated from the full set. Calibration found 3 false
   positives (dictionary gaps for "observability"/"iCIMS", and "localhost"/"nyc" not matching
   the tokenizer's per-word company-name allowlist for the single-token name "localhost:nyc"),
   fixed via `spell-allowlist.txt`. **`npm run calibrate` confirms 30/30.** Backend 52/52 tests
   + `tsc --noEmit`, add-in tests + build all clean.

   **Status: DONE, confirmed by Shrikar.** Live-verified in the browser (standalone demo
   page, not a real Outlook account): sweep/verdict/highlights all render correctly, cached
   results return near-instantly, visual polish approved (see the demo-pivot Current State
   entry above for the full list of what landed). No further work planned unless something
   breaks before judging.

   **Deferred minors (unchanged from earlier handoff, still low priority):** LLM quotes with
   mid-quote "…" can't be located and are dropped; `parseLlmJson` uses first-{/last-};
   backend logs 200 chars of unparseable model output; `buildSegments` priority only
   tie-breaks equal starts (parked — hard flags only occur on the sender line); unused
   generator `manifest.json`; manifest internal ids say "Compose".
2. **Job-posting verifier:** Abhiram to drop real scraped postings into
   `job-posting-verifier/data/claimed-postings.json` (schema in that file; `origin: "real"`),
   then tune matcher thresholds (`lib/match.ts`) against them (re-run `scripts/selftest.mts`, check no
   real posting comes back `no_such_req`), polish demo. No deploy — localhost only. **Real postings
   collected 2026-09-19 (see Log); matcher thresholds not yet tuned — awaiting Abhiram's review.**
3. Keep this file, `CLAUDE.md`/`AGENTS.md`, and commits in sync as the single source of truth
   across all agents/sessions/humans working on this project.

## Open Decisions (need human input or team consensus)

- [x] Which side of the funnel to target: **Track B — impersonation/offer-letter/recruiter
      verification**. Decided 2026-09-19.
- [x] Tech stack / architecture for the email scanner — see design spec linked above.
      Decided 2026-09-19.
- [x] Scope/design for the job-posting verification tool — decided by Abhiram 2026-09-19 (see Log).
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

- **2026-09-19** — Codex (email-scanner) Task 11 review fix: corrected the task-pane hot-reload callback to render `<NextApp />`, keeping the pane mounted when App changes during development. `npx tsc --noEmit` and `npm run build` pass. Live Outlook verification remains pending.

- **2026-09-19** — Codex (email-scanner) Task 11: replaced the add-in demo pane with Outlook email reading, backend scan request, animated highlight sweep, verdict and finding navigation; removed scaffold components and the manifest action button, renamed the ribbon group. Added busy/error/reduced-motion handling and text-only rendering. Add-in typecheck, 5 unit tests, production build, and manifest validation pass. Live Outlook check and screenshot remain pending.

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
- **2026-09-19** — Claude (email-scanner) Task 3: added `src/rules/domain.ts`
  (`checkSenderDomain`) hard-flagging sender-domain mismatches (freemail or look-alike domains)
  and marking matching domains as verified/green; 18/18 tests passing (4 new), `tsc --noEmit`
  clean.
- **2026-09-19** — Claude (email-scanner) Task 4: added `email-scanner/data/spell-allowlist.txt`
  and `src/rules/spell.ts` (`checkSpelling`) — nspell + dictionary-en misspelling flags with
  false-positive guards (proper nouns, short words, digits, URLs/emails, possessives, allowlist);
  23/23 tests passing (5 new), `tsc --noEmit` clean.
- **2026-09-19** — Claude (email-scanner) Task 5: added `src/verdict.ts` (`computeVerdict`, 
  `sortFlags`) — verdict tiers (Legitimate/Suspicious/Likely Scam) and flag ordering (sender → 
  subject → body, then span_start); 27/27 tests passing (4 new), `tsc --noEmit` clean.
- **2026-09-19** — Claude (Abhiram's session, job-posting-verifier) validated Greenhouse tokens
  (stripe 666, discord 46, airbnb 168, coinbase 217, robinhood 155, figma 152, databricks 878
  roles; doordash 404), Abhiram picked Coinbase. Built ATS adapters (plain `/jobs` list only;
  content fetched via single-job endpoint when a case file opens), matcher (self-test: 0/217 real
  Coinbase roles mis-verified; `no_such_req` only if no title similarity >= 0.55), UI, case file,
  placeholder claimed postings. UI provenance is a uniform dim `via {source}` line on every card
  (no origin badge/colour; demo entries use source "Demo sample"; `origin` kept in the JSON schema
  for filtering only). Per Abhiram's explicit instruction, this component's commits are pushed
  under his own account `abhiramkandadi` (not `slhj1208` as CLAUDE.md says) — Shrikar FYI.
- **2026-09-19** — Claude (email-scanner) Task 6: added `src/llm/prompt.ts` (`SYSTEM_PROMPT`,
  `buildUserPrompt`, `RESPONSE_SCHEMA`) and `src/llm/parse.ts` (`parseLlmJson`, `locateSpan`,
  `findingsToFlags`) — tolerant JSON extraction/parsing (zod 4, code fences, `flags`/`findings`
  key tolerance, category defaulting) and whitespace/case/curly-quote-tolerant span location;
  36/36 tests passing (9 new), `tsc --noEmit` clean.
- **2026-09-19** — Claude (email-scanner) Task 7: added `src/llm/client.ts` (`runLlmCheck`,
  `warmUp`, `llmHealth`) — POSTs to `{base}/api/chat` with the configured model, retries once
  on unparseable output, returns `unavailable` (never throws) on network error or after two
  bad parses; `scripts/llm-smoke.ts` live smoke script; 42/42 tests passing (6 new), `tsc
  --noEmit` clean. Live smoke test against Thor (`llama3:70b`) succeeded: `status: "ok"`,
  4 flags (3 body-located, 1 subject-located), 27.9s elapsed. Local Ollama fallback
  (`localhost:11434`) confirmed still down — demo-readiness gap recorded above.
- **2026-09-19** — Claude (email-scanner) Task 7 fix round 1: LLM flag `reason` was echoing the
  category name instead of an explanation (found via Task 7's own smoke test, confirmed by
  review). Fixed in `src/llm/prompt.ts` (reordered `RESPONSE_SCHEMA` item properties to
  quoted_span/category/reason, added `description`s, added a SYSTEM_PROMPT rule for an
  8-20-word explanatory reason) and `src/llm/parse.ts` (`findingsToFlags` now replaces an
  empty/category-echoing/<3-word reason with a category default); 44/44 tests passing (2 new
  in `test/llm-parse.test.ts`), `tsc --noEmit` clean. Re-ran live smoke against Thor: `status:
  "ok"`, 31.3s, reasons now real sentences (e.g. "Legitimate employers typically conduct
  interviews before making job offers.").
- **2026-09-19** — Claude (email-scanner) Task 8: added `src/scan.ts` (`scanEmail` orchestrator,
  `ScanDeps`), `src/server.ts` (`createApp` — Express 5, `POST /scan` with zod validation,
  `GET /health`), `src/index.ts` (entrypoint wiring config/companies/LLM client); 51/51 tests
  passing (7 new: `test/scan.test.ts`, `test/server.test.ts`), `tsc --noEmit` clean. Live e2e
  against Thor via `npm start`: health `reachable: true, modelPresent: true`; scan of a fake
  Tesla/Gmail email → `"Likely Scam"`, `domain_mismatch` + `misspelling` on "detials" + two
  `llm_*` flags, `llm_status: "ok"`, ~22s; server stopped cleanly after. Backend now complete.
- **2026-09-19** — Claude (Abhiram's session, job-posting-verifier) later work: removed the
  origin badge/striped styling/case-file warning (uniform `via {source}` line; demo entries
  source "Demo sample"); rebased onto Shrikar's email-scanner commits (only Progress.md
  conflicted, both sides kept) and pushed to `origin/main` as `abhiramkandadi` at Abhiram's
  explicit direction (**deviates from CLAUDE.md's `slhj1208` rule — left here for Shrikar**).
  Vercel deploy attempted then cancelled by Abhiram (localhost demo); no deploy artifacts/config
  exist. Verified `npm run build && npm start` serves on port 3000. Waiting on Abhiram's real
  `data/claimed-postings.json`.
- **2026-09-19** — Claude (email-scanner) Task 9: scaffolded `email-scanner/addin` via
  `npx --package yo --package generator-office -- yo office react "Trust Scanner" outlook xml
  --ts --output addin --skip-cache` (React 18.3.1, webpack-dev-server 6, XML manifest). The
  generator's own `convert-to-single-host` step failed mid-run (`office-addin-manifest: command
  not found` — it shells out via `npx` before `npm install` has run); worked around by running
  `npm install` manually, then hand-fixing `manifest.xml` (DisplayName "Trust Scanner",
  Description, `Permissions` ReadWriteItem→ReadItem, `ExtensionPoint` MessageCompose→
  MessageReadCommandSurface, button label/tooltip "Scan for scams") and creating the missing
  `.gitignore` (also dropped by the failed step). Added the `/api` proxy to `webpack.config.js`
  devServer. `office-addin-manifest validate manifest.xml` passes clean; `office-addin-dev-certs
  install` succeeded without a keychain prompt. Verified end-to-end: started backend (`npm
  start` in `email-scanner/backend`) and add-in dev server (`npm run dev-server`) in the
  background, `curl -sk https://localhost:3000/taskpane.html` returned HTML, `curl -sk
  https://localhost:3000/api/health` returned the backend's real health JSON through the proxy;
  both servers stopped afterward. Sideload into Outlook on the web NOT attempted (needs
  interactive sign-in as `slhj1208@outlook.com`) — steps recorded in Next Steps. Full report:
  `.superpowers/sdd/2026-09-19-email-scanner/task-9-report.md`.
- **2026-09-19** — Claude (email-scanner): added `operatorTasks.md` — Shrikar-only steps for
  (1) sideloading the Trust Scanner add-in into Outlook on the web and (2) testing an
  Outlook.com app password for IMAP seeding (openssl LOGIN test; report "IMAP OK/failed").
- **2026-09-19** — Claude (email-scanner) Task 10: added `src/taskpane/types.ts` (verbatim
  copy of backend types) and `src/taskpane/lib/segments.ts` (`marksFor`, `buildSegments` —
  pure highlight segment builder, tiles text exactly, resolves overlaps hard > soft > verified
  with later marks clipped); TDD with vitest (new devDependency, `test:unit` script); 5/5 tests
  passing, `tsc --noEmit` and dev webpack build both clean.

- **2026-09-19** — Claude (email-scanner): Task 10 review Approved (1 parked edge case in
  `buildSegments`, no demo impact). Session hit context limit — wrote full handoff under Next
  Steps item 1 (remaining Tasks 11, 12, 14b, 13, 14, 15; rulings; running-server notes).
- **2026-09-19** — Codex (email-scanner) Task 11: built the real task-pane UI (`lib/office.ts`,
  `lib/api.ts`, `components/{App,EmailView,VerdictBanner,FlagList}.tsx`, `useSweep.ts`,
  `taskpane.css`), removed scaffold demo components, cleaned up `manifest.xml` (removed
  "Perform an action" button, renamed group label to "Trust Scanner"). `tsc --noEmit`,
  `test:unit`, `npm run build`, manifest validation all pass. One follow-up commit fixed a
  hot-reload rendering bug. Ran out of credits shortly after — left `data/synthetic-emails.json`
  (Task 12's data half) uncommitted; no other work lost.
- **2026-09-19** — Claude (orchestrator, standing in for Opus/Codex while both are
  unavailable — Opus rate-limited, Codex out of credits): picked up from the handoff.
  Verified repo was in sync with origin, found and reviewed Codex's uncommitted
  `synthetic-emails.json` (16 emails, all claimed companies match `known-companies.json`,
  good mix of severity/subtlety — kept as-is). Completed and committed:
  - **Task 12:** wrote `backend/scripts/calibrate.ts` (runs every synthetic email through the
    real scanner incl. live Thor, checks verdict tier matches expectation). First run: 15/16,
    one false positive — "anonymized" not in `dictionary-en`'s word list. Investigated whether
    this was a British/American spelling issue (installed `dictionary-en-us` to compare,
    confirmed via a debug script that `dictionary-en` already accepts `organize`/`color`/
    `prioritize` — it's a genuine word-list gap, not a locale problem) and reverted the
    unnecessary package swap. Fixed via `spell-allowlist.txt`
    (anonymize/-d/-s/-ing/-ation) per the plan's ruling to tune the allowlist, not the verdict
    rule. Re-ran calibration to confirm.
  - **Task 14b:** generated `addin/src/taskpane/samples.json` from the synthetic-emails data,
    added a grouped `<select>` sample picker to `App.tsx` (refactored `run` into
    `runWithRequest` so both the live-Outlook path and the sample path share one code path),
    added `resolveJsonModule` to the add-in's `tsconfig.json`, minimal CSS. `tsc --noEmit`,
    `test:unit`, `npm run build` all clean.
  - **Task 13:** TDD — wrote the failing test first, then `src/seed/eml.ts` (`buildEml` via
    nodemailer's `MailComposer`, RFC822 output with a marker header). 1/1 new test passing.
  - **Task 14:** `scripts/seed-mailbox.ts` (imapflow APPEND, `--dry-run`/`--clear`/`--only`).
    `--dry-run` verified: 16 `.eml` files written locally with correct headers. Real IMAP
    APPEND attempted and failed: `.env` has `IMAP_USER` set but `IMAP_PASSWORD` is present as a
    key with an empty value — flagged to Shrikar in Next Steps, not blocking since Task 14b
    covers the demo regardless.
  - **Task 15 (partial):** wrote `email-scanner/README.md` (prerequisites, start order,
    sideload steps, env var table, fallback paths, 60-second demo script). Verified live: an
    unreachable LLM endpoint returns `"Likely Scam"` (from the hard domain-mismatch rule alone)
    with `llm_status: "unavailable"` in ~5s instead of hanging; `LLM_ENABLED=false` returns a
    verdict in ~53ms with no LLM call. Full live-Outlook dry run and final combined test sweep
    still need Shrikar (agents can't drive the real Outlook UI).
  - Also: clarified in `CLAUDE.md` that the `slhj1208` git-identity rule is for AI agents, not
    for Abhiram (his own account for his own component is correct, not a deviation).
  - All work committed and pushed to `main` incrementally (one commit per task) so it stays
    pullable throughout.
- **2026-09-19** — Claude (Abhiram's session, job-posting-verifier) collected 23 real "Coinbase"
  postings into `job-posting-verifier/data/claimed-postings.json` (`real-001`..`real-023`,
  `origin: "real"`; 4 demo rows kept, source "Demo sample"). Sites: Lensa 20, Jooble 1, Talent.com 1,
  SimplyHired 1; Careerjet skipped (bot check "unusual traffic" interstitial, not bypassed). Only
  listings whose displayed *employer* is Coinbase were taken — Jooble/Talent keyword search mostly
  returns other companies that merely mention Coinbase (~1 in 20 was Coinbase). Matcher run (live
  Greenhouse = cache, 217 roles): verified 10 / unverified 10 / no_such_req 7 across all 27 rows;
  5 of 7 `no_such_req` are real Lensa Coinbase postings with reworded titles (false positives);
  `match.ts` thresholds NOT changed.
- **2026-09-19** — Claude (Abhiram's session, job-posting-verifier) at Abhiram's direction: the 20
  Lensa rows (real-004..023) are real Coinbase roles with reworded titles (matcher false positives),
  so they were moved out of `claimed-postings.json` into `data/lensa-review.json` (kept, not demoed).
  Re-collected from lower-moderation sources: Craigslist (8 metros: NY, SF Bay, LA, Chicago, Seattle,
  Austin, Miami, Atlanta) = 0 Coinbase results; Jobcase = 0; Jora US redirected to AU (skipped);
  Adzuna = 9, Jobrapido = 3 (employer displayed as Coinbase) -> `real-024..035`. Live file now has 4
  demo + real-001..003 + real-024..035 = 19 rows. Matcher (217 live roles): verified 5 / unverified 11
  / no_such_req 3 (2 demo + `real-033` Jobrapido). Adzuna spreads each remote role across arbitrary
  cities (location mismatch -> "unverified"); Jobrapido reworded titles resemble Lensa's. Thresholds
  unchanged. No fraudulent-looking Coinbase postings found on any source.
- **2026-09-19** — Claude (Abhiram's session, job-posting-verifier) pre-demo validation. `lib/match.ts`:
  the verdict is now decided by **title only** (verified >= 0.85, unverified >= 0.55, else
  no_such_req); `locationOk` is still returned but never changes status; ties on title prefer a
  location-compatible role. Case file shows an informational "Location note". Thresholds unchanged.
  Results: self-test 0/217 mis-verified; 217 roles x 4 scrambled locations = 0 non-verified, 0 false
  no_such_req; no row > 0.90 returns non-verified. Clean `rm -rf .next && npm run build && npm start`
  serves on **http://localhost:3000**. Offline simulation (fetch failing) loads the cached snapshot
  ("cached snapshot" label) with identical 14/2/2 results. Stripe/Airbnb/Robinhood (Robinhood not in
  cache) render the 0-posting empty state without errors; unknown company shows a red banner. Moved
  `real-033` (Jobrapido, reworded real role -> false no_such_req) into `data/lensa-review.json`
  (now 21 rows there). Live file: 18 rows -> 14 verified / 2 unverified (real-034, real-035, Jobrapido)
  / 2 no_such_req (both fabricated demo rows). Known limits: amber (unverified) cards are not
  clickable (only red opens a case file); offline the case file's "closest role" text 404s
  (`/api/role`, needs live) and is silently omitted. Committed under `abhiramkandadi` at Abhiram's
  direction (CLAUDE.md says `slhj1208` — Shrikar FYI).
- **2026-09-19** — Claude (orchestrator): both real-IMAP auth paths for the demo mailbox
  confirmed dead (basic-auth `Login is disabled`; OAuth device-code, after full Entra app
  registration + `IMAP.AccessAsUser.All` permission added via manifest edit +
  `Allow public client flows` enabled, `authenticated but not connected`). Shrikar called it:
  stop pursuing real IMAP, build a standalone demo page instead. Built
  `email-scanner/addin/src/demo/` (new webpack entry `demo.html`) reusing the real task-pane
  logic with zero Office.js — an Outlook-lookalike shell fed directly from the 30 synthetic
  emails. Added `backend/scripts/cache-demo-results.ts` to pre-compute real scan results (live
  Thor) into `scan-cache.json`, consumed by the demo for instant + Thor-outage-proof scans.
  Iterated per feedback: inspected real Outlook's fonts/row metrics live via Claude in Chrome;
  sponsor emails reordered to inbox top; all emails renamed to greet "Somya Gupta" (the event
  host) instead of a generic name (cache recomputed after, since offsets shift with name
  length); emoji icons replaced with flat SVG icons; scanline/highlight animation made more
  dramatic; added a "Check {company}'s real careers page" link using real, search-verified
  URLs (not Abhiram's app, and not guessed). All checks green throughout.
- **2026-09-19 3:28 PM** — Claude (orchestrator): final polish round before the demo -
  VerdictBanner rebuilt as a Windows-Defender-style security card (shield icons, muted
  colors, structured meta line) instead of a colorful banner, shared by both the real add-in
  and the demo page; scanline given a chromatic-aberration glitch effect (independent
  cyan/magenta jitter + brief flicker) for a more "actively scanning" feel; hand-drawn chrome
  icons replaced with real MIT-licensed icons fetched from Microsoft's own
  `fluentui-system-icons` GitHub repo, path data inlined with `currentColor` for correct
  recoloring per context. **Shrikar confirmed it looks good — email scanner demo is DONE.**
  Final state: `email-scanner/addin/demo.html` (built) is the primary judging-day demo
  surface; real Outlook add-in also exists/works if wanted as a secondary "yes it's real"
  proof point (see `README.md` for sideload steps). All checks green: backend 52/52 tests +
  `tsc --noEmit`, add-in tests + `tsc --noEmit` + production build. Working tree clean,
  nothing outstanding to commit.
