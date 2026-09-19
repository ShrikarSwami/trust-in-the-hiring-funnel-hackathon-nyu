# Design: Outlook Email Trust Scanner

Status: approved by Shrikar 2026-09-19, ready for implementation planning.
Component owner: Shrikar (this repo/session). Complementary component (job-posting
verification) owned by Abhiram — see [AbhiramAgentHandoff.md](../../../AbhiramAgentHandoff.md)
(to be added) for that half.

## Goal

Track B ("Trust going out: impersonation and candidate scams" — see
[docs/event-brief.md](../../event-brief.md)) submission, part 1 of 2. A real Office JS add-in
for Outlook that lets a candidate scan a received email and get a verdict on whether it's a
legitimate employer/recruiter message or an impersonation/scam attempt, with a visually
compelling "scan" animation as the core demo moment.

## Non-goals (explicitly out of scope for the hackathon build)

- Real SPF/DKIM/DMARC verification — we work off content and display metadata (sender address,
  claimed company, wording), not mail-transport authentication.
- Shipping to AppSource / any real users beyond the demo.
- General-purpose spam/phishing detection beyond the hiring-scam scenario in the event brief.
- Abhiram's job-posting verification component (separate design, separate handoff doc).

## Architecture & data flow

```
Outlook on the web (outlook.office.com)
  └─ Task pane add-in (React, TypeScript) — sidebar next to the open email
       1. User opens an email, opens the add-in, clicks "Scan"
       2. Office JS reads: sender display name + address, subject, body (text + html)
       3. POST /scan to local backend with that payload
       4. Backend returns { verdict, flags[] } (see Data model below)
       5. Task pane renders its own copy of subject/sender/body, then plays a blue
          horizontal "scan line" animation top-to-bottom over that rendered copy;
          as the line passes each flagged span it lights up red (flag) or green
          (explicitly verified-clean, e.g. a domain match); ends on a verdict banner.

Backend (Node/TypeScript, Express, runs on localhost during dev/demo)
  POST /scan:
    a. Rules engine (deterministic, runs first, cheap):
       - Extract any company name the email claims affiliation with (sender display name,
         signature block, subject).
       - Look up that company in data/known-companies.json; if found, compare its real
         domain(s) to the actual sender email's domain. Mismatch = hard flag.
       - Spellcheck the body text (npm spellcheck lib, e.g. `nspell` + `dictionary-en`);
         flag misspelled words as soft flags with their location.
    b. LLM check (Thor, in parallel with nothing blocking on it except itself):
       - POST to Thor's Ollama API (http://enverthor:11434/api/generate or /api/chat),
         model `llama3:70b` (already resident on Thor; no download needed — see Decisions).
       - Prompt asks for structured JSON output: array of {quoted_span, reason} for
         suspicious tone/phrasing/pressure-tactics/plausibility issues, plus a one-line
         overall impression.
       - Parse the model's JSON; each entry becomes a soft flag with its location found via
         substring match against the original body.
    c. Merge rule flags + LLM flags into one list, resolve character offsets against the
       original body text (needed for the frontend to highlight the right spans).
    d. Compute verdict tier:
       - Any hard flag (e.g. domain mismatch) → "Likely Scam"
       - No hard flags, but ≥1 soft flag → "Suspicious"
       - No flags at all → "Legitimate"
    e. Return { verdict, flags: [{ type, severity: "hard"|"soft", span_start, span_end,
       reason }], checked_at }.
```

## Data model

### Flag / verdict response (backend → task pane)

```ts
type Severity = "hard" | "soft";
type FlagType = "domain_mismatch" | "misspelling" | "llm_tone" | "llm_plausibility";

interface Flag {
  type: FlagType;
  severity: Severity;
  span_start: number;   // char offset into the body text sent to /scan
  span_end: number;
  reason: string;        // short human-readable explanation shown on hover/click
}

interface ScanResult {
  verdict: "Legitimate" | "Suspicious" | "Likely Scam";
  flags: Flag[];
  verified: { span_start: number; span_end: number; note: string }[]; // "green" highlights,
    // e.g. the sender-domain span when it DOES match the known-company domain
  checked_at: string; // ISO timestamp
}
```

### Known-companies data (`data/known-companies.json`)

```json
[
  { "company": "Tesla", "domains": ["tesla.com"] },
  { "company": "Amazon", "domains": ["amazon.com"] },
  { "company": "Acme Robotics", "domains": ["acmerobotics.example.com"] }
]
```
~10-20 entries covering whatever companies appear in the demo's synthetic emails. Fictional
companies (like "Acme Robotics") are fine and preferred where we need a "legit" example with a
domain we don't need to fabricate carefully — see Decisions on impersonation-avoidance below.

### Synthetic email schema (shared with Abhiram — full detail in `AbhiramAgentHandoff.md`)

```json
{
  "id": "string",
  "label": "legit" | "scam",
  "sender_name": "string",
  "sender_email": "string",
  "claimed_company": "string",
  "subject": "string",
  "body": "string",
  "injected_flaws": ["domain_mismatch", "misspelling", "urgency_pressure", "..."]
}
```
Empty `injected_flaws` for `"label": "legit"` entries. This JSON is the input to the `.eml`
generation step below.

## Seeding the demo mailbox (synthetic emails, no real impersonation)

We do **not** send real email over the internet pretending to be Tesla/Amazon/etc — that would
be actual domain impersonation of real companies. Instead:

1. Generate each synthetic email (from the JSON schema above) as a raw RFC822 `.eml` file with
   fully custom headers (From, Subject, Date, Message-ID, body) — this is just a text file, no
   network delivery involved.
2. Insert each `.eml` directly into the test mailbox's Inbox via **IMAP APPEND** (a script using
   an IMAP library authenticates to the mailbox and appends the raw message bytes into the
   Inbox folder). This is a local-mailbox write, not an internet send — no SMTP relay, no real
   sender server, nothing transits any other company's mail infrastructure. This is the same
   technique phishing-simulation/security-training tools use to populate test inboxes.
3. Demo mailbox: **slhj1208@outlook.com** (fresh account created for this project). IMAP APPEND
   will need an app password generated on that account (Outlook.com supports IMAP with an
   app-specific password when the account isn't behind an org policy — this is a personal
   account, so it should be straightforward; confirm during implementation).

## Decisions made during brainstorming (recap)

- **Track:** B (impersonation/offer verification), decided 2026-09-19.
- **Build target:** real Office JS add-in (not a mockup), Outlook on the web surface.
- **Detection:** hybrid — deterministic rules (domain lookup + spellcheck) + one LLM call per
  scan for fuzzy signals.
- **Domain source:** small hardcoded `known-companies.json`, not a live lookup.
- **LLM:** Thor (NVIDIA Jetson AGX Thor devkit, 122GB unified memory, reachable over Tailscale
  at `enverthor`), model `llama3:70b` (already resident, general-purpose, non-coder-biased —
  deliberately not `slhj:latest`/`slhj-coder`, which are tuned as a coding-assistant persona).
  **Known risk:** this is a live network dependency on Tailscale during the judged demo;
  accepted by Shrikar given Thor's proven reliability for a prior project. Fallback documented:
  swap the backend's Ollama base URL to `http://localhost:11434` and use the Mac's local
  `qwen2.5vl:7b` if Thor becomes unreachable.
- **Verdict model:** 3-tier (Legitimate / Suspicious / Likely Scam) rather than a numeric score.
- **Stack:** Node/TypeScript + React for the add-in (Yeoman `office-addin-taskpane` scaffold),
  Node/TypeScript + Express for the backend.
- **Repo:** subfolder in this repo, `email-scanner/`, alongside Abhiram's `job-posting-verifier/`
  (his repo/folder, separate design doc).
- **UX:** highlighting happens in the task pane's own rendered copy of the email (Outlook does
  not allow injecting highlights into the native Read-surface reading pane), with a blue
  sweep-line animation revealing red/green highlights as it passes, ending on the verdict
  banner.

## Open items for implementation planning

- Exact Office JS APIs for reading the open item's body as both plain text (for offset-based
  highlighting) and safely re-rendering a formatted copy.
- Thor prompt design + JSON-parsing robustness (model may not always return valid JSON —
  need a retry/fallback path).
- IMAP APPEND library choice (Node: e.g. `imapflow`) and app-password setup steps for
  `slhj1208@outlook.com`.
- Sweep animation implementation (CSS/JS timing keyed off flag positions once data returns —
  not a literal token-by-token stream from the backend).
- Spellcheck library choice and false-positive tuning (proper nouns, company names, jargon
  shouldn't trip it).
