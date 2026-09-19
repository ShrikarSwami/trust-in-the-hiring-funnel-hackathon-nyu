# Email Trust Scanner

Real Outlook (Office JS) add-in for Track B of the Trust in the Hiring Funnel Hackathon @ NYU.
Scans an open email and highlights impersonation/scam signals red, verified-clean signals
green, via a sweep animation ending in a Legitimate / Suspicious / Likely Scam verdict. Full
design: [../docs/superpowers/specs/2026-09-19-email-scanner-design.md](../docs/superpowers/specs/2026-09-19-email-scanner-design.md).
Implementation plan: [../docs/superpowers/plans/2026-09-19-email-scanner.md](../docs/superpowers/plans/2026-09-19-email-scanner.md).

## Prerequisites

- Node 22+
- Tailscale connected (the backend calls Thor, a Jetson AGX Thor devkit, over Tailscale at
  `http://enverthor:11434`)
- One-time: `cd addin && npm install && npx office-addin-dev-certs install` (approve the macOS
  keychain prompt)

## Starting the demo

Two terminals, in order:

1. **Backend** (terminal 1):
   ```bash
   cd backend
   cp -n .env.example .env   # first time only, then fill in values (see table below)
   npm start
   ```
   Check: `curl -s localhost:3001/health` → `{"reachable":true,"modelPresent":true,...}`.
   Not watch mode — after editing backend code, Ctrl-C and re-run `npm start`.

2. **Add-in dev server** (terminal 2):
   ```bash
   cd addin
   npm run dev-server
   ```
   Open `https://localhost:3000/taskpane.html` — should load with no certificate warning.

## Sideloading into Outlook on the web

1. Sign in to https://outlook.live.com as `slhj1208@outlook.com`.
2. In the same browser, open https://aka.ms/olksideload.
3. **My add-ins** → **Custom Add-ins** → **+ Add a custom add-in → Add from File…**
4. Pick `addin/manifest.xml`.
5. Open any email → **Trust Scanner** / **Scan for scams** in the toolbar (may be under **Apps**
   or **…**) → click **Scan email** in the side pane.

If you changed `manifest.xml`, remove the custom add-in in **My add-ins** and re-add it from
file rather than expecting a refresh to pick it up.

## Env vars (`backend/.env`)

| Var | Purpose | Default |
|---|---|---|
| `PORT` | Backend HTTP port | `3001` |
| `OLLAMA_BASE_URL` | Ollama API base URL for the LLM check | `http://enverthor:11434` (Thor) |
| `OLLAMA_MODEL` | Model name | `llama3:70b` |
| `LLM_TIMEOUT_MS` | Per-scan LLM timeout | `90000` |
| `LLM_ENABLED` | `false` → instant rules-only verdict, no LLM call at all | `true` |
| `OLLAMA_KEEP_ALIVE` | Keeps the model resident between scans | `60m` |
| `IMAP_USER` / `IMAP_PASSWORD` | For seeding the demo mailbox (see below) | — |

### If Thor/Tailscale is down

Two options, both keep the demo running:
- **Rules-only, no wait:** set `LLM_ENABLED=false` and restart the backend. Verdicts still work
  (any hard rule flag, e.g. sender-domain mismatch, still reaches "Likely Scam"); you lose the
  tone/plausibility LLM flags.
- **Local model fallback:** `ollama serve` + `ollama pull qwen2.5vl:7b` on this Mac, then set
  `OLLAMA_BASE_URL=http://localhost:11434` and `OLLAMA_MODEL=qwen2.5vl:7b` in `.env`, restart
  the backend. Same LLM-backed behavior, just a smaller/slower local model instead of Thor.

Verified: a scan against an unreachable LLM endpoint returns `"Likely Scam"` (from the hard
domain-mismatch rule flag alone) with `llm_status: "unavailable"` in ~5s (the configured
timeout) rather than hanging — the add-in shows "AI check unavailable" instead of a weaker or
stuck verdict.

## Test data

`data/synthetic-emails.json` — 16 synthetic recruiting emails (6 legit, 10 scam, varied flaw
types/severity). Two ways to use them in the demo:

- **In-pane sample picker (always available):** in the add-in's header, the "Load sample…"
  dropdown lists all 16, grouped Legitimate / Scam examples. Picking one scans it immediately —
  no mailbox setup needed. This is the primary/fallback demo path.
- **Seeded into a real mailbox (`slhj1208@outlook.com`) via IMAP:**
  ```bash
  cd backend
  npm run seed -- --dry-run        # writes out/*.eml locally first, sanity-check headers
  npm run seed -- --only=legit-001 # test one message end-to-end against the real mailbox
  npm run seed -- --clear          # seed all 16 (clears any previously-seeded ones first)
  ```
  Needs `IMAP_USER`/`IMAP_PASSWORD` (an Outlook.com app password — Settings → Mail →
  Forwarding and IMAP → enable IMAP; account.microsoft.com → Advanced security options →
  two-step verification → App passwords) in `backend/.env`. If basic-auth IMAP is blocked for
  the account, the OAuth device-code fallback is in the implementation plan's Task 14 Step 4 —
  not needed if the sample picker covers the demo.

## Checks

```bash
cd backend && npm test && npm run typecheck && npm run calibrate
cd addin   && npm run test:unit && npx tsc --noEmit
```

`npm run calibrate` runs every synthetic email through the real scanner (rules + live Thor) and
reports pass/fail against the expected verdict tier per email.

## 60-second demo script

1. **legit-001** (sample picker) — Legitimate, sender domain verified green, no flags.
2. **scam-001** (John Pork, `johnpork.tesla@gmail.com`, claims Tesla) — Likely Scam: sender
   line highlighted red (gmail.com vs. tesla.com), plus tone/plausibility flags on the urgency
   language.
3. **scam-004** (Brightline Analytics, correct domain but heavy pressure wording) — Suspicious,
   not Likely Scam: shows the tool doesn't just check the domain, it also catches
   pressure-tactic phrasing even when the sender address itself checks out.
4. **scam-003** (Acme Robotics, wrong domain + misspellings) — Likely Scam with several
   misspelling highlights lit alongside the domain mismatch.
