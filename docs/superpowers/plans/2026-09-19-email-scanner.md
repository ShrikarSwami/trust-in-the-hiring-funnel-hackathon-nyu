# Outlook Email Trust Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working Outlook-on-the-web task-pane add-in that sends the open email to a local backend, which runs deterministic rules (known-company domain check + spellcheck) plus one LLM call on Thor, and returns a 3-tier verdict. The pane shows it with a sweep-line animation that lights up red/green highlights.

**Architecture:** Two npm packages under `email-scanner/`: `backend/` (Express + TypeScript, pure-function rules engine, Ollama client, and the seeding/calibration scripts) and `addin/` (Yeoman `office-addin-taskpane` React+TS scaffold). The add-in is served from `https://localhost:3000`, and webpack-dev-server proxies `/api/*` to the backend on `http://localhost:3001`. That keeps the backend's `POST /scan` route from the spec and avoids mixed-content blocking. Shared data (`known-companies.json`, `synthetic-emails.json`, `spell-allowlist.txt`) lives in `email-scanner/data/`.

**Tech Stack:** Node 22, TypeScript (ESM), Express 4, zod 3, vitest + supertest, nspell + dictionary-en, Ollama HTTP API (0.32.6 on Thor), React 18 + Office.js (Yeoman `generator-office`), nodemailer MailComposer (.eml), imapflow (IMAP APPEND), @azure/msal-node (only if IMAP OAuth is required).

**Spec:** `docs/superpowers/specs/2026-09-19-email-scanner-design.md`

## Global Constraints

- All code lives under `email-scanner/` at the repo root. Do not touch `job-posting-verifier/`.
- Verdict tiers are exactly `"Legitimate" | "Suspicious" | "Likely Scam"`: any hard flag → Likely Scam; else ≥1 soft flag → Suspicious; else Legitimate.
- Severities are exactly `"hard" | "soft"`. FlagTypes are exactly `"domain_mismatch" | "misspelling" | "llm_tone" | "llm_plausibility"`. `domain_mismatch` is the only hard flag.
- The Ollama base URL, model, timeout and enable switch come from env vars (`OLLAMA_BASE_URL`, default `http://enverthor:11434`; `OLLAMA_MODEL`, default `llama3:70b`). `enverthor` must never be hardcoded outside `config.ts` defaults.
- Documented fallback: `OLLAMA_BASE_URL=http://localhost:11434 OLLAMA_MODEL=qwen2.5vl:7b`.
- Never send email over the internet as any company. Demo mail enters `slhj1208@outlook.com` only via IMAP APPEND.
- Commits are made as git user `SLHJ1208` and pushed with the `slhj1208` gh account. Every task's commit also updates `Progress.md` (re-read it immediately before editing; add a Log entry marked "Claude (email-scanner)"; keep other agents' entries intact).
- Hackathon clock: submissions are due 4:30 PM. Tasks marked **(demo-critical)** come before anything optional.

## Additions to the spec's data model (flagged to Shrikar; proceed with these unless overruled)

1. **`field: "sender" | "subject" | "body"` on every `Flag` and `Verified`.** The spec defines offsets only into the body, but the domain-mismatch flag and the green "verified" highlight both sit on the *sender address*, which is not in the body. Offsets for `sender` index into `senderLine(req)` (see Task 1).
2. **`llm_status: "ok" | "unavailable" | "disabled"` and `llm_summary: string | null` on `ScanResult`.** These let the pane say "AI check unavailable, rules only" instead of silently showing a rules-only verdict, and they surface the LLM's one-line overall impression, which the spec asks the model to produce but gives no field for.
3. **LLM findings whose quote can't be located in the subject/body are dropped** (logged server-side). The verdict counts only flags the user can actually see highlighted.

## File Structure

```
email-scanner/
  README.md                      # run/demo runbook (Task 15)
  data/
    known-companies.json         # Task 2
    spell-allowlist.txt          # Task 4
    synthetic-emails.json        # Task 12 (or from Abhiram's agent, if already present)
  backend/
    package.json, tsconfig.json, vitest.config.ts, .env.example
    src/
      types.ts        # shared types + senderLine()           (Task 1)
      config.ts       # env → Config                          (Task 1)
      companies.ts    # load + claimed-company detection      (Task 2)
      rules/domain.ts # domain mismatch / verified rule       (Task 3)
      rules/spell.ts  # spellcheck rule                       (Task 4)
      verdict.ts      # computeVerdict + sortFlags            (Task 5)
      llm/prompt.ts   # prompt + JSON schema                  (Task 6)
      llm/parse.ts    # tolerant parse + span location        (Task 6)
      llm/client.ts   # Ollama HTTP: check, warmup, health    (Task 7)
      scan.ts         # orchestrator                          (Task 8)
      server.ts       # createApp(deps)                       (Task 8)
      index.ts        # entrypoint                            (Task 8)
      seed/eml.ts     # SyntheticEmail → RFC822 Buffer        (Task 13)
    scripts/
      llm-smoke.ts        # one live Thor call               (Task 7)
      calibrate.ts        # synthetic set → verdict table    (Task 12)
      seed-mailbox.ts     # IMAP APPEND                      (Task 14)
      get-outlook-token.ts# OAuth device-code (fallback)     (Task 14)
    test/*.test.ts
  addin/                          # Yeoman scaffold, then:
    webpack.config.js             # + /api proxy              (Task 9)
    manifest.xml                  # renamed button/pane       (Task 9)
    src/taskpane/
      types.ts        # copy of backend types (keep in sync by hand)
      lib/segments.ts # text+marks → segments (pure)          (Task 10)
      lib/segments.test.ts
      lib/office.ts   # readCurrentEmail()                    (Task 11)
      lib/api.ts      # scanEmail() → /api/scan               (Task 11)
      components/App.tsx, EmailView.tsx, VerdictBanner.tsx, FlagList.tsx, useSweep.ts
      taskpane.css
```

---

## Phase 1: Backend rules engine (standalone, TDD)

### Task 1: Backend scaffold, shared types, config (demo-critical)

**Files:**
- Create: `email-scanner/backend/package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `.gitignore`
- Create: `email-scanner/backend/src/types.ts`, `src/config.ts`
- Test: `email-scanner/backend/test/config.test.ts`

**Interfaces:**
- Produces: every type in `types.ts`; `senderLine(req: ScanRequest): string`; `loadConfig(env?): Config`.

- [ ] **Step 1: Create package files**

`email-scanner/backend/package.json`:
```json
{
  "name": "email-scanner-backend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "llm-smoke": "tsx scripts/llm-smoke.ts",
    "calibrate": "tsx scripts/calibrate.ts",
    "seed": "tsx scripts/seed-mailbox.ts",
    "token": "tsx scripts/get-outlook-token.ts"
  }
}
```
Then run:
```bash
cd email-scanner/backend
npm i express cors zod dotenv nspell dictionary-en nodemailer imapflow
npm i -D typescript tsx vitest supertest @types/express @types/cors @types/node @types/nspell @types/nodemailer @types/supertest
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "NodeNext", "moduleResolution": "NodeNext",
    "strict": true, "esModuleInterop": true, "skipLibCheck": true,
    "resolveJsonModule": true, "noEmit": true, "types": ["node"]
  },
  "include": ["src", "test", "scripts"]
}
```
`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["test/**/*.test.ts"], testTimeout: 20000 } });
```
`.env.example`:
```
PORT=3001
OLLAMA_BASE_URL=http://enverthor:11434
OLLAMA_MODEL=llama3:70b
LLM_TIMEOUT_MS=90000
LLM_ENABLED=true
OLLAMA_KEEP_ALIVE=60m
# Fallback if Thor/Tailscale is down:
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=qwen2.5vl:7b
IMAP_USER=slhj1208@outlook.com
IMAP_PASSWORD=
IMAP_ACCESS_TOKEN=
AZURE_CLIENT_ID=
```
`.gitignore`: `node_modules/`, `.env`, `out/`.

- [ ] **Step 2: Write `src/types.ts`**

```ts
export type Severity = "hard" | "soft";
export type FlagType = "domain_mismatch" | "misspelling" | "llm_tone" | "llm_plausibility";
export type Field = "sender" | "subject" | "body";
export type Verdict = "Legitimate" | "Suspicious" | "Likely Scam";
export type LlmStatus = "ok" | "unavailable" | "disabled";

export interface ScanRequest {
  sender_name: string;
  sender_email: string;
  subject: string;
  body: string; // plain text, \n line endings; all body offsets index into this exact string
}

export interface Flag {
  type: FlagType;
  severity: Severity;
  field: Field;
  span_start: number;
  span_end: number;
  reason: string;
}

export interface Verified {
  field: Field;
  span_start: number;
  span_end: number;
  note: string;
}

export interface ScanResult {
  verdict: Verdict;
  flags: Flag[];
  verified: Verified[];
  llm_status: LlmStatus;
  llm_summary: string | null;
  checked_at: string;
}

/** The exact string the task pane renders for the sender row; "sender" offsets index into it. */
export function senderLine(req: Pick<ScanRequest, "sender_name" | "sender_email">): string {
  const name = req.sender_name.trim();
  return name ? `${name} <${req.sender_email}>` : req.sender_email;
}
```

- [ ] **Step 3: Write the failing test** (`test/config.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config.js";
import { senderLine } from "../src/types.js";

describe("loadConfig", () => {
  it("defaults to Thor llama3:70b", () => {
    const c = loadConfig({});
    expect(c.ollamaBaseUrl).toBe("http://enverthor:11434");
    expect(c.ollamaModel).toBe("llama3:70b");
    expect(c.port).toBe(3001);
    expect(c.llmEnabled).toBe(true);
    expect(c.llmTimeoutMs).toBe(90000);
  });
  it("lets env swap to a local fallback model and strips trailing slash", () => {
    const c = loadConfig({ OLLAMA_BASE_URL: "http://localhost:11434/", OLLAMA_MODEL: "qwen2.5vl:7b", LLM_ENABLED: "false" });
    expect(c.ollamaBaseUrl).toBe("http://localhost:11434");
    expect(c.ollamaModel).toBe("qwen2.5vl:7b");
    expect(c.llmEnabled).toBe(false);
  });
});

describe("senderLine", () => {
  it("formats name and address", () => {
    expect(senderLine({ sender_name: "John Pork", sender_email: "jp@gmail.com" })).toBe("John Pork <jp@gmail.com>");
  });
  it("falls back to bare address", () => {
    expect(senderLine({ sender_name: " ", sender_email: "jp@gmail.com" })).toBe("jp@gmail.com");
  });
});
```

- [ ] **Step 4: Run to verify failure.** Run `npx vitest run test/config.test.ts`. Expected: FAIL, cannot find `../src/config.js`.

- [ ] **Step 5: Implement `src/config.ts`**

```ts
export interface Config {
  port: number;
  ollamaBaseUrl: string;
  ollamaModel: string;
  llmTimeoutMs: number;
  llmEnabled: boolean;
  keepAlive: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT ?? 3001),
    ollamaBaseUrl: (env.OLLAMA_BASE_URL ?? "http://enverthor:11434").replace(/\/+$/, ""),
    ollamaModel: env.OLLAMA_MODEL ?? "llama3:70b",
    llmTimeoutMs: Number(env.LLM_TIMEOUT_MS ?? 90000),
    llmEnabled: env.LLM_ENABLED !== "false",
    keepAlive: env.OLLAMA_KEEP_ALIVE ?? "60m",
  };
}
```

- [ ] **Step 6: Run tests.** `npx vitest run` → PASS (4 tests). `npx tsc --noEmit` → no errors.

- [ ] **Step 7: Commit** (with Progress.md update)
```bash
git add email-scanner/backend Progress.md
git commit -m "email-scanner: scaffold backend package, shared types, env config"
```

### Task 2: Known companies + claimed-company detection (demo-critical)

**Files:**
- Create: `email-scanner/data/known-companies.json`, `email-scanner/backend/src/companies.ts`
- Test: `email-scanner/backend/test/companies.test.ts`

**Interfaces:**
- Consumes: `ScanRequest` (Task 1)
- Produces:
  - `interface KnownCompany { company: string; domains: string[] }`
  - `loadCompanies(path?: string): KnownCompany[]`
  - `emailDomain(email: string): string` (lowercased part after last `@`, `""` if none)
  - `domainMatches(domain: string, allowed: string[]): boolean` (exact or subdomain)
  - `findClaimedCompany(req: ScanRequest, companies: KnownCompany[]): KnownCompany | null`

- [ ] **Step 1: Write `email-scanner/data/known-companies.json`**

```json
[
  { "company": "Tesla", "domains": ["tesla.com"] },
  { "company": "Amazon", "domains": ["amazon.com", "amazon.jobs"] },
  { "company": "Google", "domains": ["google.com"] },
  { "company": "Microsoft", "domains": ["microsoft.com"] },
  { "company": "Meta", "domains": ["meta.com", "fb.com"] },
  { "company": "Apple", "domains": ["apple.com"] },
  { "company": "Netflix", "domains": ["netflix.com"] },
  { "company": "JPMorgan Chase", "domains": ["jpmorgan.com", "jpmchase.com", "chase.com"] },
  { "company": "Goldman Sachs", "domains": ["gs.com"] },
  { "company": "Deloitte", "domains": ["deloitte.com"] },
  { "company": "Stripe", "domains": ["stripe.com"] },
  { "company": "Acme Robotics", "domains": ["acmerobotics.example.com"] },
  { "company": "Brightline Analytics", "domains": ["brightline-analytics.example.com"] },
  { "company": "Northwind Health", "domains": ["northwindhealth.example.com"] }
]
```

- [ ] **Step 2: Write the failing test** (`test/companies.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { loadCompanies, findClaimedCompany, domainMatches, emailDomain } from "../src/companies.js";

const companies = loadCompanies();
const req = (o: Partial<{ sender_name: string; sender_email: string; subject: string; body: string }>) =>
  ({ sender_name: "", sender_email: "x@y.com", subject: "", body: "", ...o });

describe("companies", () => {
  it("loads the data file", () => {
    expect(companies.find((c) => c.company === "Tesla")?.domains).toContain("tesla.com");
  });
  it("emailDomain lowercases the part after the last @", () => {
    expect(emailDomain("John.Pork@Gmail.COM")).toBe("gmail.com");
    expect(emailDomain("nope")).toBe("");
  });
  it("domainMatches exact and subdomains, not look-alikes", () => {
    expect(domainMatches("tesla.com", ["tesla.com"])).toBe(true);
    expect(domainMatches("mail.tesla.com", ["tesla.com"])).toBe(true);
    expect(domainMatches("tesla-careers.net", ["tesla.com"])).toBe(false);
    expect(domainMatches("faketesla.com", ["tesla.com"])).toBe(false);
  });
  it("finds a company in the display name", () => {
    expect(findClaimedCompany(req({ sender_name: "Jane Doe - Tesla Recruiting" }), companies)?.company).toBe("Tesla");
  });
  it("finds a company embedded in the email local part", () => {
    expect(findClaimedCompany(req({ sender_email: "johnpork.tesla@gmail.com" }), companies)?.company).toBe("Tesla");
  });
  it("finds a company in the subject", () => {
    expect(findClaimedCompany(req({ subject: "Your Amazon interview" }), companies)?.company).toBe("Amazon");
  });
  it("finds a company in the signature (end of body)", () => {
    const body = "Hi Sam,\n\nThanks for applying.\n\nBest,\nPriya\nTalent Team, Acme Robotics";
    expect(findClaimedCompany(req({ body }), companies)?.company).toBe("Acme Robotics");
  });
  it("respects word boundaries (metadata is not Meta)", () => {
    expect(findClaimedCompany(req({ subject: "metadata question" }), companies)).toBeNull();
  });
  it("falls back to the sender domain when no company is named", () => {
    expect(findClaimedCompany(req({ sender_email: "p@acmerobotics.example.com" }), companies)?.company).toBe("Acme Robotics");
  });
  it("returns null when nothing matches", () => {
    expect(findClaimedCompany(req({ subject: "hello" }), companies)).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify failure.** `npx vitest run test/companies.test.ts` → FAIL (module not found).

- [ ] **Step 4: Implement `src/companies.ts`**

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ScanRequest } from "./types.js";

export interface KnownCompany { company: string; domains: string[] }

const DEFAULT_PATH = fileURLToPath(new URL("../../data/known-companies.json", import.meta.url));
const SIGNATURE_CHARS = 600;

export function loadCompanies(path = DEFAULT_PATH): KnownCompany[] {
  return JSON.parse(readFileSync(path, "utf8")) as KnownCompany[];
}

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).trim().toLowerCase();
}

export function domainMatches(domain: string, allowed: string[]): boolean {
  const d = domain.toLowerCase();
  return allowed.some((a) => d === a.toLowerCase() || d.endsWith("." + a.toLowerCase()));
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Earliest word-boundary mention of any company in `text`. */
function firstMention(text: string, companies: KnownCompany[]): KnownCompany | null {
  let best: { c: KnownCompany; idx: number } | null = null;
  for (const c of companies) {
    const m = new RegExp(`(^|[^a-z0-9])${escape(c.company)}(?=[^a-z0-9]|$)`, "i").exec(text);
    if (m && (!best || m.index < best.idx)) best = { c, idx: m.index };
  }
  return best?.c ?? null;
}

function inLocalPart(email: string, companies: KnownCompany[]): KnownCompany | null {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  for (const c of companies) {
    const compact = c.company.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (compact.length >= 4 && local.includes(compact)) return c;
  }
  return firstMention(local.replace(/[._+-]/g, " "), companies);
}

/** Priority: display name → email local part → subject → signature → sender domain. */
export function findClaimedCompany(req: ScanRequest, companies: KnownCompany[]): KnownCompany | null {
  return (
    firstMention(req.sender_name, companies) ??
    inLocalPart(req.sender_email, companies) ??
    firstMention(req.subject, companies) ??
    firstMention(req.body.slice(-SIGNATURE_CHARS), companies) ??
    companies.find((c) => domainMatches(emailDomain(req.sender_email), c.domains)) ??
    null
  );
}
```

- [ ] **Step 5: Run tests.** `npx vitest run test/companies.test.ts` → PASS.

- [ ] **Step 6: Commit** (+ Progress.md): `git commit -m "email-scanner: known-companies data and claimed-company detection"`

### Task 3: Domain rule (demo-critical)

**Files:**
- Create: `email-scanner/backend/src/rules/domain.ts`
- Test: `email-scanner/backend/test/domain.test.ts`

**Interfaces:**
- Consumes: `findClaimedCompany`, `emailDomain`, `domainMatches`, `KnownCompany` (Task 2); `senderLine`, `Flag`, `Verified`, `ScanRequest` (Task 1)
- Produces: `checkSenderDomain(req: ScanRequest, companies: KnownCompany[]): { flags: Flag[]; verified: Verified[] }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { checkSenderDomain } from "../src/rules/domain.js";
import { loadCompanies } from "../src/companies.js";
import { senderLine } from "../src/types.js";

const companies = loadCompanies();
const base = { subject: "Opportunity", body: "Hello" };

describe("checkSenderDomain", () => {
  it("hard-flags a gmail address claiming to be Tesla, spanning the domain", () => {
    const req = { ...base, sender_name: "John Pork", sender_email: "johnpork.tesla@gmail.com" };
    const { flags, verified } = checkSenderDomain(req, companies);
    expect(verified).toEqual([]);
    expect(flags).toHaveLength(1);
    const f = flags[0];
    expect(f).toMatchObject({ type: "domain_mismatch", severity: "hard", field: "sender" });
    expect(senderLine(req).slice(f.span_start, f.span_end)).toBe("gmail.com");
    expect(f.reason).toContain("Tesla");
    expect(f.reason).toContain("tesla.com");
  });
  it("hard-flags a look-alike domain", () => {
    const req = { ...base, sender_name: "Tesla Careers", sender_email: "hr@tesla-careers.net" };
    expect(checkSenderDomain(req, companies).flags[0]?.type).toBe("domain_mismatch");
  });
  it("marks a matching domain as verified (green)", () => {
    const req = { ...base, sender_name: "Priya Shah | Acme Robotics", sender_email: "priya@acmerobotics.example.com" };
    const { flags, verified } = checkSenderDomain(req, companies);
    expect(flags).toEqual([]);
    expect(verified).toHaveLength(1);
    expect(senderLine(req).slice(verified[0].span_start, verified[0].span_end)).toBe("acmerobotics.example.com");
    expect(verified[0].field).toBe("sender");
  });
  it("does nothing when no known company is claimed", () => {
    const req = { ...base, sender_name: "Sam", sender_email: "sam@gmail.com" };
    expect(checkSenderDomain(req, companies)).toEqual({ flags: [], verified: [] });
  });
});
```

- [ ] **Step 2: Run to verify failure.** `npx vitest run test/domain.test.ts` → FAIL.

- [ ] **Step 3: Implement `src/rules/domain.ts`**

```ts
import { domainMatches, emailDomain, findClaimedCompany, type KnownCompany } from "../companies.js";
import { senderLine, type Flag, type ScanRequest, type Verified } from "../types.js";

const FREEMAIL = new Set(["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "proton.me", "protonmail.com", "aol.com"]);

export function checkSenderDomain(req: ScanRequest, companies: KnownCompany[]): { flags: Flag[]; verified: Verified[] } {
  const claimed = findClaimedCompany(req, companies);
  const domain = emailDomain(req.sender_email);
  if (!claimed || !domain) return { flags: [], verified: [] };

  const line = senderLine(req);
  const span_start = line.lastIndexOf("@") + 1;
  const span_end = span_start + domain.length;

  if (domainMatches(domain, claimed.domains)) {
    return {
      flags: [],
      verified: [{ field: "sender", span_start, span_end, note: `Sender domain matches ${claimed.company}'s official domain.` }],
    };
  }
  const why = FREEMAIL.has(domain) ? "a personal email provider" : "a domain the company does not use";
  return {
    flags: [{
      type: "domain_mismatch", severity: "hard", field: "sender", span_start, span_end,
      reason: `Claims to be from ${claimed.company}, but was sent from ${domain} (${why}). Real ${claimed.company} email comes from ${claimed.domains.join(", ")}.`,
    }],
    verified: [],
  };
}
```

- [ ] **Step 4: Run tests.** → PASS.
- [ ] **Step 5: Commit** (+ Progress.md): `git commit -m "email-scanner: sender-domain rule (hard flag / verified)"`

### Task 4: Spellcheck rule (demo-critical)

**Files:**
- Create: `email-scanner/data/spell-allowlist.txt`, `email-scanner/backend/src/rules/spell.ts`
- Test: `email-scanner/backend/test/spell.test.ts`

**Interfaces:**
- Consumes: `Flag` (Task 1); `KnownCompany` (Task 2)
- Produces: `checkSpelling(text: string, field: "subject" | "body", extraAllowed?: string[]): Flag[]` (synchronous; loads the dictionary lazily once)

False-positive policy (from the spec's "proper nouns, company names, jargon shouldn't trip it"):
- skip any word starting with an uppercase letter (proper nouns; this also skips sentence-initial typos, an accepted tradeoff)
- skip words under 3 letters, words containing digits, and anything inside a URL or email address
- skip allowlisted words (file + company-name words passed as `extraAllowed`)
- strip a trailing `'s`; treat `’` as `'`
- report at most 12 misspellings and compute a suggestion only for the first 5 (`nspell.suggest` is slow)

- [ ] **Step 1: Write `email-scanner/data/spell-allowlist.txt`** (one lowercase word per line)

```
onboarding
offboarding
recruiter
recruiters
recruiting
hr
hiring
fullstack
frontend
backend
devops
linkedin
zoom
teams
webex
hackathon
internship
interns
remote
hybrid
wfh
ssn
w2
w-2
i-9
ats
resume
résumé
cv
sde
swe
kubernetes
typescript
javascript
startup
startups
signon
sign-on
telegram
whatsapp
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { checkSpelling } from "../src/rules/spell.js";

describe("checkSpelling", () => {
  it("flags misspellings with exact offsets", () => {
    const text = "Please recieve the ofer letter today.";
    const flags = checkSpelling(text, "body");
    const words = flags.map((f) => text.slice(f.span_start, f.span_end));
    expect(words).toEqual(["recieve", "ofer"]);
    expect(flags[0]).toMatchObject({ type: "misspelling", severity: "soft", field: "body" });
    expect(flags[0].reason).toMatch(/recieve/);
  });
  it("ignores capitalized words, URLs, emails, digits and short words", () => {
    const text = "Contact Xyzzor at hr@qwrtpx.com or https://qwrtpx.com/aplly with code ab12cd ok";
    expect(checkSpelling(text, "body")).toEqual([]);
  });
  it("respects the allowlist file and extra allowed words", () => {
    expect(checkSpelling("your onboarding starts monday", "body")).toEqual([]);
    expect(checkSpelling("welcome to brightline", "body", ["brightline"])).toEqual([]);
  });
  it("handles possessives and curly apostrophes", () => {
    expect(checkSpelling("the team’s schedule and company's policy", "body")).toEqual([]);
  });
  it("returns no flags for clean text", () => {
    expect(checkSpelling("We would like to schedule an interview next week.", "body")).toEqual([]);
  });
});
```

- [ ] **Step 3: Run to verify failure.** → FAIL.

- [ ] **Step 4: Implement `src/rules/spell.ts`**

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import nspell from "nspell";
import dictionary from "dictionary-en";
import type { Flag } from "../types.js";

const ALLOWLIST_PATH = fileURLToPath(new URL("../../../data/spell-allowlist.txt", import.meta.url));
const MAX_FLAGS = 12;
const MAX_SUGGESTIONS = 5;

let speller: ReturnType<typeof nspell> | null = null;
let allow: Set<string> | null = null;

function init() {
  if (!speller) speller = nspell(Buffer.from(dictionary.aff), Buffer.from(dictionary.dic));
  if (!allow) {
    allow = new Set(readFileSync(ALLOWLIST_PATH, "utf8").split(/\r?\n/).map((w) => w.trim().toLowerCase()).filter(Boolean));
  }
  return { speller, allow };
}

const SKIP_RANGES = /\b(?:https?:\/\/|www\.)\S+|\S+@\S+/g;
const WORD = /[A-Za-z0-9][A-Za-z0-9'’-]*[A-Za-z0-9]|[A-Za-z]/g;

export function checkSpelling(text: string, field: "subject" | "body", extraAllowed: string[] = []): Flag[] {
  const { speller, allow } = init();
  const extra = new Set(extraAllowed.map((w) => w.toLowerCase()));
  const skips: [number, number][] = [...text.matchAll(SKIP_RANGES)].map((m) => [m.index!, m.index! + m[0].length]);
  const flags: Flag[] = [];

  for (const m of text.matchAll(WORD)) {
    if (flags.length >= MAX_FLAGS) break;
    const start = m.index!;
    let word = m[0].replace(/’/g, "'");
    if (skips.some(([a, b]) => start < b && start + word.length > a)) continue;
    if (/[0-9]/.test(word) || /^[A-Z]/.test(word)) continue;
    word = word.replace(/'s$/i, "").replace(/-+$/, "");
    if (word.length < 3) continue;
    const lower = word.toLowerCase();
    if (allow.has(lower) || extra.has(lower)) continue;
    if (speller.correct(word) || speller.correct(lower)) continue;
    if (word.includes("-") && word.split("-").every((p) => p.length < 3 || speller.correct(p))) continue;

    const suggestion = flags.length < MAX_SUGGESTIONS ? speller.suggest(lower)[0] : undefined;
    flags.push({
      type: "misspelling", severity: "soft", field,
      span_start: start, span_end: start + word.length,
      reason: suggestion ? `Possible misspelling: "${word}" (did you mean "${suggestion}"?)` : `Possible misspelling: "${word}"`,
    });
  }
  return flags;
}
```

If `import dictionary from "dictionary-en"` has a different shape at runtime, `console.log(Object.keys(dictionary))` and adapt: v4 exports `{ aff, dic }` as Uint8Array.

- [ ] **Step 5: Run tests.** → PASS. If a real English word in the tests is flagged, add it to the allowlist rather than weakening the check.
- [ ] **Step 6: Commit** (+ Progress.md): `git commit -m "email-scanner: spellcheck rule with false-positive guards"`

### Task 5: Verdict computation (demo-critical)

**Files:**
- Create: `email-scanner/backend/src/verdict.ts`
- Test: `email-scanner/backend/test/verdict.test.ts`

**Interfaces:**
- Produces: `computeVerdict(flags: Flag[]): Verdict`; `sortFlags(flags: Flag[]): Flag[]` (order sender → subject → body, then by `span_start`)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { computeVerdict, sortFlags } from "../src/verdict.js";
import type { Flag } from "../src/types.js";

const f = (o: Partial<Flag>): Flag => ({ type: "misspelling", severity: "soft", field: "body", span_start: 0, span_end: 1, reason: "r", ...o });

describe("computeVerdict", () => {
  it("no flags → Legitimate", () => expect(computeVerdict([])).toBe("Legitimate"));
  it("only soft → Suspicious", () => expect(computeVerdict([f({}), f({ type: "llm_tone" })])).toBe("Suspicious"));
  it("any hard → Likely Scam", () =>
    expect(computeVerdict([f({}), f({ type: "domain_mismatch", severity: "hard", field: "sender" })])).toBe("Likely Scam"));
});

describe("sortFlags", () => {
  it("orders by field then offset", () => {
    const out = sortFlags([f({ field: "body", span_start: 5 }), f({ field: "sender" }), f({ field: "body", span_start: 1 }), f({ field: "subject" })]);
    expect(out.map((x) => `${x.field}:${x.span_start}`)).toEqual(["sender:0", "subject:0", "body:1", "body:5"]);
  });
});
```

- [ ] **Step 2: Run to verify failure.** → FAIL.
- [ ] **Step 3: Implement `src/verdict.ts`**

```ts
import type { Field, Flag, Verdict } from "./types.js";

export function computeVerdict(flags: Flag[]): Verdict {
  if (flags.some((f) => f.severity === "hard")) return "Likely Scam";
  if (flags.length > 0) return "Suspicious";
  return "Legitimate";
}

const ORDER: Record<Field, number> = { sender: 0, subject: 1, body: 2 };
export function sortFlags(flags: Flag[]): Flag[] {
  return [...flags].sort((a, b) => ORDER[a.field] - ORDER[b.field] || a.span_start - b.span_start);
}
```
- [ ] **Step 4: Run all tests.** `npm test` → PASS.
- [ ] **Step 5: Commit** (+ Progress.md): `git commit -m "email-scanner: verdict tiers and flag ordering"`

---

## Phase 2: Thor / Ollama LLM check

Measured 2026-09-19: Thor runs Ollama 0.32.6. `llama3:70b` is resident (`expires_at` 2318, context 8192). A tiny prompt took ~22s cold (11.5s model load) and ~10s of generation, so full emails will likely take 10–30s. The design therefore uses a 90s timeout, **no retry on timeout** (only on unparseable JSON), a warm-up call at backend start, and a looping scan-line animation in the pane while waiting.

### Task 6: Prompt, tolerant JSON parsing, span location (demo-critical)

**Files:**
- Create: `email-scanner/backend/src/llm/prompt.ts`, `src/llm/parse.ts`
- Test: `email-scanner/backend/test/llm-parse.test.ts`

**Interfaces:**
- Produces:
  - `SYSTEM_PROMPT: string`, `buildUserPrompt(req: ScanRequest): string`, `RESPONSE_SCHEMA: object` (JSON Schema for Ollama `format`)
  - `interface LlmFinding { quoted_span: string; reason: string; category: "tone" | "plausibility" }`
  - `interface LlmResponse { findings: LlmFinding[]; overall: string }`
  - `parseLlmJson(raw: string): LlmResponse | null`
  - `locateSpan(haystack: string, quote: string): { start: number; end: number } | null`
  - `findingsToFlags(req: ScanRequest, findings: LlmFinding[]): Flag[]` (searches the body first, then the subject; drops unlocatable findings)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { parseLlmJson, locateSpan, findingsToFlags } from "../src/llm/parse.js";

describe("parseLlmJson", () => {
  it("parses clean JSON", () => {
    const r = parseLlmJson('{"findings":[{"quoted_span":"send your SSN","reason":"asks for SSN","category":"plausibility"}],"overall":"Scam."}');
    expect(r?.findings[0].category).toBe("plausibility");
    expect(r?.overall).toBe("Scam.");
  });
  it("extracts JSON from code fences / surrounding prose", () => {
    expect(parseLlmJson('Sure!\n```json\n{"findings":[],"overall":"Looks fine."}\n```')?.overall).toBe("Looks fine.");
  });
  it("defaults a missing/unknown category to tone and tolerates 'flags' key", () => {
    const r = parseLlmJson('{"flags":[{"quoted_span":"act now","reason":"urgency","category":"weird"}],"overall":"x"}');
    expect(r?.findings[0].category).toBe("tone");
  });
  it("returns null for garbage", () => {
    expect(parseLlmJson("I cannot help with that")).toBeNull();
  });
});

describe("locateSpan", () => {
  const body = "Dear Applicant,\n\nYou must   reply within 24 hours to “secure your position”.";
  it("finds exact substrings", () => {
    const s = locateSpan(body, "Dear Applicant")!;
    expect(body.slice(s.start, s.end)).toBe("Dear Applicant");
  });
  it("finds quotes with different whitespace, case and curly quotes", () => {
    const s = locateSpan(body, 'you must reply within 24 hours to "secure')!;
    expect(body.slice(s.start, s.end)).toBe("You must   reply within 24 hours to “secure");
  });
  it("strips wrapping quotes and ellipses from the model's quote", () => {
    const s = locateSpan(body, '"...reply within 24 hours..."')!;
    expect(body.slice(s.start, s.end)).toBe("reply within 24 hours");
  });
  it("returns null when absent or too short", () => {
    expect(locateSpan(body, "wire transfer")).toBeNull();
    expect(locateSpan(body, "to")).toBeNull();
  });
});

describe("findingsToFlags", () => {
  const req = { sender_name: "", sender_email: "a@b.com", subject: "URGENT: offer expires today", body: "Send your bank details now." };
  it("maps categories to flag types, finds spans in body or subject, drops unlocated", () => {
    const flags = findingsToFlags(req, [
      { quoted_span: "Send your bank details", reason: "financial info", category: "plausibility" },
      { quoted_span: "offer expires today", reason: "urgency", category: "tone" },
      { quoted_span: "not in the email", reason: "x", category: "tone" },
    ]);
    expect(flags).toHaveLength(2);
    expect(flags[0]).toMatchObject({ type: "llm_plausibility", severity: "soft", field: "body", span_start: 0, span_end: 22 });
    expect(flags[1]).toMatchObject({ type: "llm_tone", field: "subject" });
  });
});
```

- [ ] **Step 2: Run to verify failure.** → FAIL.

- [ ] **Step 3: Implement `src/llm/prompt.ts`**

```ts
import { senderLine, type ScanRequest } from "../types.js";

const MAX_BODY_CHARS = 6000; // llama3:70b context is 8192 tokens on Thor

export const SYSTEM_PROMPT = `You are a fraud analyst reviewing recruiting and job-offer emails received by job seekers.
Identify specific phrases that suggest a recruiting scam, such as:
- pressure or urgency ("respond within 24 hours", "offer expires today")
- requests for money, bank details, SSN, ID documents, or equipment purchases before a formal hiring process
- unrealistic pay for little work, hiring without an interview, interviews only via Telegram/WhatsApp/Signal chat
- generic greetings ("Dear Applicant"), vague job details, unprofessional or manipulative wording
Rules:
- quoted_span MUST be copied verbatim from the email subject or body: 3 to 15 words, no paraphrasing.
- category "tone" = pressure, urgency, manipulative or unprofessional wording.
- category "plausibility" = claims or requests a real employer would not make.
- The sender address is checked separately; do not comment on it or on spelling.
- A normal, professional recruiter email must get an EMPTY findings list. Scheduling an interview,
  describing benefits, or asking for a resume is normal.
- overall: one short sentence summarizing your impression.
Respond with JSON only.`;

export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          quoted_span: { type: "string" },
          reason: { type: "string" },
          category: { type: "string", enum: ["tone", "plausibility"] },
        },
        required: ["quoted_span", "reason", "category"],
      },
    },
    overall: { type: "string" },
  },
  required: ["findings", "overall"],
} as const;

export function buildUserPrompt(req: ScanRequest): string {
  return `From: ${senderLine(req)}\nSubject: ${req.subject}\n\nBody:\n${req.body.slice(0, MAX_BODY_CHARS)}`;
}
```

- [ ] **Step 4: Implement `src/llm/parse.ts`**

```ts
import { z } from "zod";
import type { Flag, ScanRequest } from "../types.js";

export interface LlmFinding { quoted_span: string; reason: string; category: "tone" | "plausibility" }
export interface LlmResponse { findings: LlmFinding[]; overall: string }

const Finding = z.object({
  quoted_span: z.string(),
  reason: z.string().catch("Suspicious phrasing"),
  category: z.enum(["tone", "plausibility"]).catch("tone"),
});
const Response = z.object({
  findings: z.array(Finding).optional(),
  flags: z.array(Finding).optional(),
  overall: z.string().catch(""),
});

export function parseLlmJson(raw: string): LlmResponse | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let obj: unknown;
  try { obj = JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
  const r = Response.safeParse(obj);
  if (!r.success) return null;
  return { findings: r.data.findings ?? r.data.flags ?? [], overall: r.data.overall };
}

function normalizeWithMap(s: string): { out: string; map: number[] } {
  let out = "";
  const map: number[] = [];
  let prevSpace = false;
  for (let i = 0; i < s.length; i++) {
    let c = s[i];
    if (/\s/.test(c)) {
      if (prevSpace) continue;
      c = " ";
      prevSpace = true;
    } else {
      prevSpace = false;
      c = c.replace(/[‘’]/, "'").replace(/[“”]/, '"');
      const lower = c.toLowerCase();
      if (lower.length === 1) c = lower;
    }
    out += c;
    map.push(i);
  }
  return { out, map };
}

export function locateSpan(haystack: string, quote: string): { start: number; end: number } | null {
  const q = quote.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").replace(/^(\.{3}|…)\s*|\s*(\.{3}|…)$/g, "").trim();
  if (q.length < 4) return null;
  const exact = haystack.indexOf(q);
  if (exact !== -1) return { start: exact, end: exact + q.length };
  const h = normalizeWithMap(haystack);
  const nq = normalizeWithMap(q).out;
  const idx = h.out.indexOf(nq);
  if (idx === -1) return null;
  return { start: h.map[idx], end: h.map[idx + nq.length - 1] + 1 };
}

export function findingsToFlags(req: ScanRequest, findings: LlmFinding[]): Flag[] {
  const flags: Flag[] = [];
  for (const f of findings) {
    const type = f.category === "plausibility" ? "llm_plausibility" : "llm_tone";
    const inBody = locateSpan(req.body, f.quoted_span);
    const inSubject = inBody ? null : locateSpan(req.subject, f.quoted_span);
    const loc = inBody ?? inSubject;
    if (!loc) {
      console.warn(`[llm] dropping unlocatable finding: ${JSON.stringify(f.quoted_span)}`);
      continue;
    }
    flags.push({ type, severity: "soft", field: inBody ? "body" : "subject", span_start: loc.start, span_end: loc.end, reason: f.reason });
  }
  return flags;
}
```

- [ ] **Step 5: Run tests.** `npx vitest run test/llm-parse.test.ts` → PASS.
- [ ] **Step 6: Commit** (+ Progress.md): `git commit -m "email-scanner: LLM prompt, tolerant JSON parsing, span location"`

### Task 7: Ollama client (check, warm-up, health) + live smoke test (demo-critical)

**Files:**
- Create: `email-scanner/backend/src/llm/client.ts`, `email-scanner/backend/scripts/llm-smoke.ts`
- Test: `email-scanner/backend/test/llm-client.test.ts`

**Interfaces:**
- Consumes: `Config` (Task 1), prompt/parse exports (Task 6)
- Produces:
  - `interface LlmResult { status: LlmStatus; flags: Flag[]; summary: string | null }`
  - `type FetchLike = typeof fetch`
  - `runLlmCheck(req: ScanRequest, cfg: Config, fetchImpl?: FetchLike): Promise<LlmResult>` (never throws)
  - `warmUp(cfg: Config, fetchImpl?: FetchLike): Promise<void>` (never throws)
  - `llmHealth(cfg: Config, fetchImpl?: FetchLike): Promise<{ reachable: boolean; modelPresent: boolean; baseUrl: string; model: string }>`

- [ ] **Step 1: Write the failing test** (fake fetch, no network)

```ts
import { describe, it, expect, vi } from "vitest";
import { runLlmCheck, llmHealth } from "../src/llm/client.js";
import { loadConfig } from "../src/config.js";

const cfg = loadConfig({ OLLAMA_BASE_URL: "http://fake:11434", LLM_TIMEOUT_MS: "1000" });
const req = { sender_name: "HR", sender_email: "hr@x.com", subject: "Job", body: "Dear Applicant, send your SSN within 24 hours." };
const ollamaReply = (content: string) =>
  new Response(JSON.stringify({ message: { role: "assistant", content } }), { status: 200 });

describe("runLlmCheck", () => {
  it("posts to {base}/api/chat with the configured model and returns located flags", async () => {
    const fetchImpl = vi.fn(async () => ollamaReply('{"findings":[{"quoted_span":"send your SSN","reason":"asks for SSN","category":"plausibility"}],"overall":"Likely scam."}'));
    const r = await runLlmCheck(req, cfg, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl.mock.calls[0][0]).toBe("http://fake:11434/api/chat");
    const sent = JSON.parse((fetchImpl.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.model).toBe("llama3:70b");
    expect(sent.stream).toBe(false);
    expect(r.status).toBe("ok");
    expect(r.summary).toBe("Likely scam.");
    expect(r.flags[0]).toMatchObject({ type: "llm_plausibility", field: "body" });
  });
  it("retries once on unparseable output, then succeeds", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(ollamaReply("not json"))
      .mockResolvedValueOnce(ollamaReply('{"findings":[],"overall":"Fine."}'));
    const r = await runLlmCheck(req, cfg, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(r).toEqual({ status: "ok", flags: [], summary: "Fine." });
  });
  it("returns unavailable (not throw) on network error, without retrying", async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError("fetch failed"); });
    const r = await runLlmCheck(req, cfg, fetchImpl as unknown as typeof fetch);
    expect(r).toEqual({ status: "unavailable", flags: [], summary: null });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("returns unavailable after two unparseable replies", async () => {
    const fetchImpl = vi.fn(async () => ollamaReply("nope"));
    expect((await runLlmCheck(req, cfg, fetchImpl as unknown as typeof fetch)).status).toBe("unavailable");
  });
});

describe("llmHealth", () => {
  it("reports model presence from /api/tags", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ models: [{ name: "llama3:70b" }] })));
    expect(await llmHealth(cfg, fetchImpl as unknown as typeof fetch)).toMatchObject({ reachable: true, modelPresent: true });
  });
  it("reports unreachable on error", async () => {
    const fetchImpl = vi.fn(async () => { throw new Error("down"); });
    expect(await llmHealth(cfg, fetchImpl as unknown as typeof fetch)).toMatchObject({ reachable: false, modelPresent: false });
  });
});
```

- [ ] **Step 2: Run to verify failure.** → FAIL.

- [ ] **Step 3: Implement `src/llm/client.ts`**

```ts
import type { Config } from "../config.js";
import type { Flag, LlmStatus, ScanRequest } from "../types.js";
import { RESPONSE_SCHEMA, SYSTEM_PROMPT, buildUserPrompt } from "./prompt.js";
import { findingsToFlags, parseLlmJson } from "./parse.js";

export interface LlmResult { status: LlmStatus; flags: Flag[]; summary: string | null }
export type FetchLike = typeof fetch;

const UNAVAILABLE: LlmResult = { status: "unavailable", flags: [], summary: null };
const MAX_ATTEMPTS = 2;

async function chatOnce(req: ScanRequest, cfg: Config, fetchImpl: FetchLike): Promise<string> {
  const res = await fetchImpl(`${cfg.ollamaBaseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(cfg.llmTimeoutMs),
    body: JSON.stringify({
      model: cfg.ollamaModel,
      stream: false,
      format: RESPONSE_SCHEMA,
      keep_alive: cfg.keepAlive,
      options: { temperature: 0 },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(req) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`ollama HTTP ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

export async function runLlmCheck(req: ScanRequest, cfg: Config, fetchImpl: FetchLike = fetch): Promise<LlmResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let raw: string;
    try {
      raw = await chatOnce(req, cfg, fetchImpl);
    } catch (err) {
      console.warn(`[llm] request failed (${cfg.ollamaBaseUrl}, ${cfg.ollamaModel}):`, (err as Error).message);
      return UNAVAILABLE; // network/timeout: don't burn another 90s retrying
    }
    const parsed = parseLlmJson(raw);
    if (parsed) return { status: "ok", flags: findingsToFlags(req, parsed.findings), summary: parsed.overall || null };
    console.warn(`[llm] unparseable output (attempt ${attempt}):`, raw.slice(0, 200));
  }
  return UNAVAILABLE;
}

export async function warmUp(cfg: Config, fetchImpl: FetchLike = fetch): Promise<void> {
  try {
    await fetchImpl(`${cfg.ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({ model: cfg.ollamaModel, prompt: "", keep_alive: cfg.keepAlive }),
    });
    console.log(`[llm] warmed ${cfg.ollamaModel} at ${cfg.ollamaBaseUrl}`);
  } catch (err) {
    console.warn(`[llm] warm-up failed:`, (err as Error).message);
  }
}

export async function llmHealth(cfg: Config, fetchImpl: FetchLike = fetch) {
  const base = { baseUrl: cfg.ollamaBaseUrl, model: cfg.ollamaModel };
  try {
    const res = await fetchImpl(`${cfg.ollamaBaseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    const data = (await res.json()) as { models?: { name: string }[] };
    return { ...base, reachable: true, modelPresent: !!data.models?.some((m) => m.name === cfg.ollamaModel) };
  } catch {
    return { ...base, reachable: false, modelPresent: false };
  }
}
```

- [ ] **Step 4: Run tests.** → PASS.

- [ ] **Step 5: Write `scripts/llm-smoke.ts` (live call; not part of `npm test`)**

```ts
import "dotenv/config";
import { loadConfig } from "../src/config.js";
import { runLlmCheck } from "../src/llm/client.js";

const cfg = loadConfig();
const req = {
  sender_name: "John Pork - Tesla Recruiting",
  sender_email: "johnpork.tesla@gmail.com",
  subject: "URGENT: Remote position offer - respond today",
  body: "Dear Applicant,\n\nCongratulations! You have been selected for a remote data entry role at $45/hr with no interview required. To secure your position, reply within 24 hours with your SSN and bank account details for direct deposit setup.\n\nRegards,\nJohn Pork\nTesla HR",
};
const t0 = Date.now();
const r = await runLlmCheck(req, cfg);
console.log(JSON.stringify(r, null, 2));
console.log(`${cfg.ollamaModel} @ ${cfg.ollamaBaseUrl}: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exit(r.status === "ok" ? 0 : 1);
```

- [ ] **Step 6: Run it against Thor.** Run `cd email-scanner/backend && npm run llm-smoke`. Expected: `status: "ok"`, ≥2 body-located flags (e.g. "reply within 24 hours", "SSN and bank account details"), and the elapsed time printed. Record the time in the Progress.md log. If `status` is `unavailable`, read the `[llm]` warnings. A validation error on `format` means the schema format isn't accepted; switch `format: RESPONSE_SCHEMA` to `format: "json"`.

- [ ] **Step 7: Verify the fallback swap works in config.** Run `OLLAMA_BASE_URL=http://localhost:11434 OLLAMA_MODEL=qwen2.5vl:7b npm run llm-smoke`. This requires `ollama serve` running locally and `ollama pull qwen2.5vl:7b`. Local Ollama was **not running** on 2026-09-19, so if it's still down, record that as a demo-readiness gap in Progress.md rather than blocking.

- [ ] **Step 8: Commit** (+ Progress.md with the measured latency): `git commit -m "email-scanner: Ollama client with retry/timeout/warm-up and live smoke script"`

### Task 8: Scan orchestrator + Express server (demo-critical)

**Files:**
- Create: `email-scanner/backend/src/scan.ts`, `src/server.ts`, `src/index.ts`
- Test: `email-scanner/backend/test/scan.test.ts`, `test/server.test.ts`

**Interfaces:**
- Consumes: `checkSenderDomain` (T3), `checkSpelling` (T4), `computeVerdict`/`sortFlags` (T5), `runLlmCheck`/`warmUp`/`llmHealth`/`LlmResult` (T7), `loadCompanies`/`KnownCompany` (T2), `loadConfig` (T1)
- Produces:
  - `interface ScanDeps { companies: KnownCompany[]; llm: (req: ScanRequest) => Promise<LlmResult>; now?: () => Date }`
  - `scanEmail(req: ScanRequest, deps: ScanDeps): Promise<ScanResult>`
  - `createApp(deps: ScanDeps & { health?: () => Promise<unknown> }): express.Express` with `POST /scan` and `GET /health`

- [ ] **Step 1: Write the failing tests**

`test/scan.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { scanEmail } from "../src/scan.js";
import { loadCompanies } from "../src/companies.js";
import type { LlmResult } from "../src/llm/client.js";

const companies = loadCompanies();
const now = () => new Date("2026-09-19T15:00:00Z");
const llm = (r: LlmResult) => async () => r;
const okEmpty = llm({ status: "ok", flags: [], summary: "Looks normal." });

describe("scanEmail", () => {
  it("legit Acme email → Legitimate with a verified sender", async () => {
    const r = await scanEmail({ sender_name: "Priya Shah", sender_email: "priya@acmerobotics.example.com", subject: "Interview availability", body: "Hi Sam,\n\nCould you share your availability next week?\n\nBest,\nPriya\nAcme Robotics" }, { companies, llm: okEmpty, now });
    expect(r.verdict).toBe("Legitimate");
    expect(r.verified).toHaveLength(1);
    expect(r.llm_status).toBe("ok");
    expect(r.llm_summary).toBe("Looks normal.");
    expect(r.checked_at).toBe("2026-09-19T15:00:00.000Z");
  });
  it("gmail claiming Tesla → Likely Scam", async () => {
    const r = await scanEmail({ sender_name: "John Pork", sender_email: "johnpork.tesla@gmail.com", subject: "Tesla offer", body: "Hello there." }, { companies, llm: okEmpty, now });
    expect(r.verdict).toBe("Likely Scam");
  });
  it("misspelling only → Suspicious; LLM unavailable is reported, not fatal", async () => {
    const r = await scanEmail({ sender_name: "Sam", sender_email: "sam@example.org", subject: "hi", body: "please recieve this" }, { companies, llm: llm({ status: "unavailable", flags: [], summary: null }), now });
    expect(r.verdict).toBe("Suspicious");
    expect(r.llm_status).toBe("unavailable");
  });
  it("merges LLM flags into the verdict", async () => {
    const r = await scanEmail({ sender_name: "Sam", sender_email: "sam@example.org", subject: "hi", body: "Act now." }, {
      companies, now,
      llm: llm({ status: "ok", summary: "x", flags: [{ type: "llm_tone", severity: "soft", field: "body", span_start: 0, span_end: 7, reason: "urgency" }] }),
    });
    expect(r.verdict).toBe("Suspicious");
    expect(r.flags.map((f) => f.type)).toContain("llm_tone");
  });
});
```

`test/server.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/server.js";
import { loadCompanies } from "../src/companies.js";

const app = createApp({ companies: loadCompanies(), llm: async () => ({ status: "disabled", flags: [], summary: null }), health: async () => ({ reachable: true }) });

describe("server", () => {
  it("POST /scan returns a ScanResult", async () => {
    const res = await request(app).post("/scan").send({ sender_name: "John Pork", sender_email: "johnpork.tesla@gmail.com", subject: "Tesla job", body: "Hello" });
    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe("Likely Scam");
    expect(res.body.llm_status).toBe("disabled");
  });
  it("POST /scan rejects malformed input with 400", async () => {
    const res = await request(app).post("/scan").send({ subject: 3 });
    expect(res.status).toBe(400);
  });
  it("GET /health reports ok + llm", async () => {
    const res = await request(app).get("/health");
    expect(res.body).toEqual({ ok: true, llm: { reachable: true } });
  });
});
```

- [ ] **Step 2: Run to verify failure.** → FAIL.

- [ ] **Step 3: Implement `src/scan.ts`**

```ts
import type { KnownCompany } from "./companies.js";
import type { LlmResult } from "./llm/client.js";
import { checkSenderDomain } from "./rules/domain.js";
import { checkSpelling } from "./rules/spell.js";
import type { ScanRequest, ScanResult } from "./types.js";
import { computeVerdict, sortFlags } from "./verdict.js";

export interface ScanDeps {
  companies: KnownCompany[];
  llm: (req: ScanRequest) => Promise<LlmResult>;
  now?: () => Date;
}

export async function scanEmail(req: ScanRequest, deps: ScanDeps): Promise<ScanResult> {
  const llmPromise = deps.llm(req); // start the slow call first; rules run while it's in flight
  const companyWords = deps.companies.flatMap((c) => c.company.toLowerCase().split(/\s+/));
  const domain = checkSenderDomain(req, deps.companies);
  const spelling = [...checkSpelling(req.subject, "subject", companyWords), ...checkSpelling(req.body, "body", companyWords)];
  const llm = await llmPromise;

  const flags = sortFlags([...domain.flags, ...spelling, ...llm.flags]);
  return {
    verdict: computeVerdict(flags),
    flags,
    verified: domain.verified,
    llm_status: llm.status,
    llm_summary: llm.summary,
    checked_at: (deps.now ?? (() => new Date()))().toISOString(),
  };
}
```

- [ ] **Step 4: Implement `src/server.ts`**

```ts
import cors from "cors";
import express from "express";
import { z } from "zod";
import { scanEmail, type ScanDeps } from "./scan.js";

const ScanRequestSchema = z.object({
  sender_name: z.string().max(500).default(""),
  sender_email: z.string().max(500),
  subject: z.string().max(2000).default(""),
  body: z.string().max(100_000),
});

export function createApp(deps: ScanDeps & { health?: () => Promise<unknown> }) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.post("/scan", async (req, res) => {
    const parsed = ScanRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const t0 = Date.now();
    const result = await scanEmail(parsed.data, deps);
    console.log(`[scan] ${result.verdict} flags=${result.flags.length} llm=${result.llm_status} ${Date.now() - t0}ms`);
    res.json(result);
  });

  app.get("/health", async (_req, res) => {
    res.json({ ok: true, llm: deps.health ? await deps.health() : null });
  });

  return app;
}
```

- [ ] **Step 5: Implement `src/index.ts`**

```ts
import "dotenv/config";
import { loadCompanies } from "./companies.js";
import { loadConfig } from "./config.js";
import { llmHealth, runLlmCheck, warmUp } from "./llm/client.js";
import { createApp } from "./server.js";

const cfg = loadConfig();
const app = createApp({
  companies: loadCompanies(),
  llm: cfg.llmEnabled ? (req) => runLlmCheck(req, cfg) : async () => ({ status: "disabled", flags: [], summary: null }),
  health: () => llmHealth(cfg),
});

app.listen(cfg.port, () => {
  console.log(`[backend] http://localhost:${cfg.port}  llm=${cfg.llmEnabled ? `${cfg.ollamaModel} @ ${cfg.ollamaBaseUrl}` : "disabled"}`);
  if (cfg.llmEnabled) void warmUp(cfg);
});
```

- [ ] **Step 6: Run all tests + typecheck.** `npm test && npm run typecheck` → all PASS.

- [ ] **Step 7: Manual end-to-end against Thor**
```bash
cp .env.example .env && npm start &
curl -s localhost:3001/health
curl -s localhost:3001/scan -H 'Content-Type: application/json' -d '{"sender_name":"John Pork - Tesla Recruiting","sender_email":"johnpork.tesla@gmail.com","subject":"URGENT offer","body":"Dear Applicant, you have been selected. Send your SSN and bank detials within 24 hours."}'
```
Expected: health shows `reachable: true, modelPresent: true`; scan returns `"verdict":"Likely Scam"` with `domain_mismatch`, a `misspelling` on "detials", and ≥1 `llm_*` flag, `llm_status: "ok"`.

- [ ] **Step 8: Commit** (+ Progress.md): `git commit -m "email-scanner: /scan orchestrator and Express server"`

---

## Phase 3: Office Add-in scaffold + task pane UI

### Task 9: Scaffold the add-in, proxy, sideload smoke test (demo-critical)

**Files:**
- Create: `email-scanner/addin/**` (Yeoman output)
- Modify: `email-scanner/addin/webpack.config.js` (devServer proxy), `email-scanner/addin/manifest.xml` (names)

- [ ] **Step 1: Scaffold.** From `email-scanner/`:
```bash
npx --yes --package yo --package generator-office -- yo office react "Trust Scanner" outlook xml --ts --output addin --skip-cache
```
If positional args are rejected, run `yo office --details` (same npx prefix) and use the listed values. Required answers: project type **React**, TypeScript, host **Outlook**, manifest **XML** ("Add-in only manifest"; the unified JSON manifest needs Teams tooling to sideload). If Outlook isn't offered for React, scaffold `taskpane` (TypeScript), then `npm i react react-dom @types/react @types/react-dom` and render React from `src/taskpane/index.tsx`.

- [ ] **Step 2: Install and trust dev certs.** `cd addin && npm install && npx office-addin-dev-certs install` (macOS keychain prompt: Shrikar approves it).

- [ ] **Step 3: Add the `/api` proxy** to the `devServer` block in `webpack.config.js`:
```js
proxy: [
  { context: ["/api"], target: "http://localhost:3001", pathRewrite: { "^/api": "" } },
],
```

- [ ] **Step 4: Rename in `manifest.xml`.** Set `DisplayName` to "Trust Scanner", `Description` to "Scan recruiting emails for impersonation and scam signals", and the ribbon button label/tooltip to "Scan for scams". Keep `ReadItem` permission and the `MessageReadCommandSurface` extension point from the scaffold.

- [ ] **Step 5: Start and sideload.** `npm run dev-server` (serves `https://localhost:3000`). Open `https://localhost:3000/taskpane.html` in the browser once and confirm there's no cert warning. Sideload by signing in to Outlook on the web as `slhj1208@outlook.com`, opening `https://aka.ms/olksideload`, then My add-ins → Custom Add-ins → Add a custom add-in → Add from file → `email-scanner/addin/manifest.xml`. Open any email and click the add-in button (it may be under the "…" / Apps menu).
Expected: the scaffold's default pane renders inside Outlook. With the backend running, `fetch("/api/health")` from the pane's devtools console returns JSON (proves the proxy works; open devtools on the pane iframe).

- [ ] **Step 6: Commit** (+ Progress.md, noting the sideload steps that worked): `git commit -m "email-scanner: scaffold Outlook React add-in with /api proxy"`. Confirm `addin/.gitignore` excludes `node_modules` and `dist`.

### Task 10: Segment builder (pure, TDD)

**Files:**
- Create: `email-scanner/addin/src/taskpane/types.ts` (verbatim copy of `backend/src/types.ts`, top comment: `// Copy of email-scanner/backend/src/types.ts: keep in sync.`)
- Create: `email-scanner/addin/src/taskpane/lib/segments.ts`, `lib/segments.test.ts`
- Modify: `email-scanner/addin/package.json` (add `vitest` devDependency and `"test:unit": "vitest run src/taskpane/lib"`)

**Interfaces:**
- Consumes: `ScanResult`, `Field`, `Severity` (types copy)
- Produces:
  - `interface Mark { id: string; start: number; end: number; kind: "flag" | "verified"; severity: Severity | null; reason: string }`
  - `interface Segment { text: string; start: number; mark: Mark | null }`
  - `marksFor(result: ScanResult, field: Field): Mark[]`
  - `buildSegments(text: string, marks: Mark[]): Segment[]`. Segments tile the text exactly. On overlap, the higher-priority mark (hard > soft > verified, then earlier start) wins, and a later mark is clipped to start where the previous one ends.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildSegments, marksFor, type Mark } from "./segments";

const m = (o: Partial<Mark>): Mark => ({ id: "x", start: 0, end: 1, kind: "flag", severity: "soft", reason: "r", ...o });

describe("buildSegments", () => {
  it("returns one plain segment with no marks", () => {
    expect(buildSegments("hello", [])).toEqual([{ text: "hello", start: 0, mark: null }]);
  });
  it("splits around a mark and tiles the text exactly", () => {
    const segs = buildSegments("abc def ghi", [m({ id: "a", start: 4, end: 7 })]);
    expect(segs.map((s) => s.text)).toEqual(["abc ", "def", " ghi"]);
    expect(segs[1].mark?.id).toBe("a");
    expect(segs.map((s) => s.text).join("")).toBe("abc def ghi");
  });
  it("resolves overlaps: hard beats soft, later mark clipped", () => {
    const segs = buildSegments("0123456789", [m({ id: "soft", start: 2, end: 6 }), m({ id: "hard", severity: "hard", start: 2, end: 4 })]);
    expect(segs.map((s) => [s.text, s.mark?.id ?? null])).toEqual([["01", null], ["23", "hard"], ["45", "soft"], ["6789", null]]);
  });
  it("drops out-of-range and empty marks", () => {
    expect(buildSegments("abc", [m({ start: 5, end: 9 }), m({ start: 1, end: 1 })])).toEqual([{ text: "abc", start: 0, mark: null }]);
  });
});

describe("marksFor", () => {
  it("collects flags and verified entries for one field", () => {
    const marks = marksFor({
      verdict: "Likely Scam", llm_status: "ok", llm_summary: null, checked_at: "",
      flags: [{ type: "domain_mismatch", severity: "hard", field: "sender", span_start: 1, span_end: 3, reason: "r" },
              { type: "misspelling", severity: "soft", field: "body", span_start: 0, span_end: 2, reason: "r" }],
      verified: [{ field: "body", span_start: 5, span_end: 6, note: "ok" }],
    }, "body");
    expect(marks.map((x) => [x.kind, x.severity])).toEqual([["flag", "soft"], ["verified", null]]);
  });
});
```

- [ ] **Step 2: Run to verify failure.** `npm run test:unit` → FAIL.

- [ ] **Step 3: Implement `lib/segments.ts`**

```ts
import type { Field, ScanResult, Severity } from "../types";

export interface Mark { id: string; start: number; end: number; kind: "flag" | "verified"; severity: Severity | null; reason: string }
export interface Segment { text: string; start: number; mark: Mark | null }

const priority = (m: Mark) => (m.severity === "hard" ? 0 : m.severity === "soft" ? 1 : 2);

export function marksFor(result: ScanResult, field: Field): Mark[] {
  const flags: Mark[] = result.flags
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => f.field === field)
    .map(({ f, i }) => ({ id: `flag-${i}`, start: f.span_start, end: f.span_end, kind: "flag", severity: f.severity, reason: f.reason }));
  const verified: Mark[] = result.verified
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v.field === field)
    .map(({ v, i }) => ({ id: `ver-${i}`, start: v.span_start, end: v.span_end, kind: "verified", severity: null, reason: v.note }));
  return [...flags, ...verified];
}

export function buildSegments(text: string, marks: Mark[]): Segment[] {
  const valid = marks
    .map((m) => ({ ...m, start: Math.max(0, m.start), end: Math.min(text.length, m.end) }))
    .filter((m) => m.end > m.start)
    .sort((a, b) => a.start - b.start || priority(a) - priority(b));

  const segs: Segment[] = [];
  let cursor = 0;
  for (const m of valid) {
    if (m.end <= cursor) continue;
    const start = Math.max(m.start, cursor);
    if (start > cursor) segs.push({ text: text.slice(cursor, start), start: cursor, mark: null });
    segs.push({ text: text.slice(start, m.end), start, mark: m });
    cursor = m.end;
  }
  if (cursor < text.length || segs.length === 0) segs.push({ text: text.slice(cursor), start: cursor, mark: null });
  return segs;
}
```

- [ ] **Step 4: Run tests.** → PASS.
- [ ] **Step 5: Commit** (+ Progress.md): `git commit -m "email-scanner: highlight segment builder for task pane"`

### Task 11: Task pane UI: read email, call backend, sweep animation, verdict (demo-critical)

UI behavior is verified manually in Outlook (see Step 7), not unit-tested.

**Files:**
- Create: `addin/src/taskpane/lib/office.ts`, `lib/api.ts`, `components/EmailView.tsx`, `components/useSweep.ts`, `components/VerdictBanner.tsx`, `components/FlagList.tsx`, `taskpane.css`
- Replace: `addin/src/taskpane/components/App.tsx`; delete the scaffold's demo components (e.g. `HeroList.tsx`, `TextInsertion.tsx`) and their imports
- Modify: `addin/src/taskpane/index.tsx` only to import `./taskpane.css`, if the scaffold doesn't already load CSS that way

**Interfaces:**
- Consumes: `buildSegments`, `marksFor`, `Mark` (T10); types copy; backend `POST /scan` via `/api/scan` (T8, T9)
- Produces: `readCurrentEmail(): Promise<ScanRequest>`, `scanEmail(req: ScanRequest): Promise<ScanResult>` (frontend), `<App/>`

- [ ] **Step 1: `lib/office.ts`**

```ts
/* global Office */
import type { ScanRequest } from "../types";

export function readCurrentEmail(): Promise<ScanRequest> {
  const item = Office.context.mailbox.item as Office.MessageRead;
  return new Promise((resolve, reject) => {
    item.body.getAsync(Office.CoercionType.Text, (r) => {
      if (r.status !== Office.AsyncResultStatus.Succeeded) return reject(new Error(r.error.message));
      resolve({
        sender_name: item.from?.displayName ?? "",
        sender_email: item.from?.emailAddress ?? "",
        subject: item.subject ?? "",
        body: r.value.replace(/\r\n/g, "\n").trim(),
      });
    });
  });
}
```

- [ ] **Step 2: `lib/api.ts`**

```ts
import type { ScanRequest, ScanResult } from "../types";

export async function scanEmail(req: ScanRequest): Promise<ScanResult> {
  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal: AbortSignal.timeout(150_000),
  });
  if (!res.ok) throw new Error(`Scan failed (HTTP ${res.status})`);
  return (await res.json()) as ScanResult;
}
```

- [ ] **Step 3: `components/useSweep.ts`.** A rAF-driven sweep: moves the line, lights marks as the line passes them, keeps the line in view, and calls `onDone` at the end.

```ts
import { useEffect } from "react";

/**
 * When `active`, sweeps `lineRef` from top to bottom of `contentRef` over a duration scaled by content
 * height (1.8–4.5s). Any element with [data-mark] gets class "lit" once the line passes its top edge.
 */
export function useSweep(
  active: boolean,
  contentRef: React.RefObject<HTMLElement>,
  lineRef: React.RefObject<HTMLElement>,
  scrollRef: React.RefObject<HTMLElement>,
  onDone: () => void
) {
  useEffect(() => {
    const content = contentRef.current, line = lineRef.current, scroller = scrollRef.current;
    if (!active || !content || !line || !scroller) return;
    const height = content.scrollHeight;
    const duration = Math.min(4500, Math.max(1800, (height / 400) * 1000));
    const marks = Array.from(content.querySelectorAll<HTMLElement>("[data-mark]")).map((el) => ({ el, top: el.offsetTop }));
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const y = p * height;
      line.style.transform = `translateY(${y}px)`;
      for (const m of marks) if (m.top <= y) m.el.classList.add("lit");
      scroller.scrollTop = Math.max(0, y - scroller.clientHeight / 2);
      if (p < 1) raf = requestAnimationFrame(tick);
      else { marks.forEach((m) => m.el.classList.add("lit")); onDone(); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
}
```

`contentRef` must be the positioned parent (`position: relative`) of the marks so `offsetTop` is relative to it.

- [ ] **Step 4: `components/EmailView.tsx`**

```tsx
import * as React from "react";
import { buildSegments, marksFor, type Mark } from "../lib/segments";
import { senderLine, type Field, type ScanRequest, type ScanResult } from "../types";

function Highlighted({ text, marks }: { text: string; marks: Mark[] }) {
  return (
    <>
      {buildSegments(text, marks).map((s) =>
        s.mark ? (
          <mark key={s.start} id={s.mark.id} data-mark className={`hl ${s.mark.kind === "verified" ? "hl-ok" : `hl-${s.mark.severity}`}`} title={s.mark.reason}>
            {s.text}
          </mark>
        ) : (
          <React.Fragment key={s.start}>{s.text}</React.Fragment>
        )
      )}
    </>
  );
}

export function EmailView(props: {
  email: ScanRequest;
  result: ScanResult | null;
  scanning: boolean; // true = looping idle line while waiting for the backend
  contentRef: React.RefObject<HTMLDivElement>;
  lineRef: React.RefObject<HTMLDivElement>;
}) {
  const { email, result } = props;
  const marks = (f: Field) => (result ? marksFor(result, f) : []);
  return (
    <div className="email" ref={props.contentRef}>
      <div className="email-row"><span className="label">From</span><span className="mono"><Highlighted text={senderLine(email)} marks={marks("sender")} /></span></div>
      <div className="email-row"><span className="label">Subject</span><strong><Highlighted text={email.subject} marks={marks("subject")} /></strong></div>
      <div className="email-body"><Highlighted text={email.body} marks={marks("body")} /></div>
      <div ref={props.lineRef} className={`scanline ${props.scanning ? "scanline-idle" : ""}`} />
    </div>
  );
}
```

Add `senderLine` to the addin's `types.ts` copy (it's already in the backend file you copied).

- [ ] **Step 5: `components/VerdictBanner.tsx` and `components/FlagList.tsx`**

```tsx
// VerdictBanner.tsx
import * as React from "react";
import type { ScanResult } from "../types";

const COPY = {
  "Legitimate": { cls: "v-ok", icon: "✓", sub: "No impersonation or scam signals found." },
  "Suspicious": { cls: "v-warn", icon: "!", sub: "Some warning signs. Verify with the company directly before sharing anything." },
  "Likely Scam": { cls: "v-bad", icon: "✕", sub: "Strong impersonation signals. Do not reply or send personal information." },
} as const;

export function VerdictBanner({ result }: { result: ScanResult }) {
  const c = COPY[result.verdict];
  return (
    <div className={`verdict ${c.cls}`} role="status">
      <div className="verdict-title"><span className="verdict-icon">{c.icon}</span>{result.verdict}</div>
      <div className="verdict-sub">{c.sub}</div>
      {result.llm_summary && <div className="verdict-ai">AI review: {result.llm_summary}</div>}
      {result.llm_status === "unavailable" && <div className="verdict-note">AI check unavailable. Verdict is based on rules only.</div>}
    </div>
  );
}
```
```tsx
// FlagList.tsx
import * as React from "react";
import type { ScanResult } from "../types";

const LABEL = { domain_mismatch: "Sender domain", misspelling: "Spelling", llm_tone: "Tone", llm_plausibility: "Plausibility" } as const;

export function FlagList({ result }: { result: ScanResult }) {
  if (result.flags.length === 0 && result.verified.length === 0) return null;
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  return (
    <ul className="flaglist">
      {result.flags.map((f, i) => (
        <li key={`f${i}`} className={`fl-${f.severity}`} onClick={() => jump(`flag-${i}`)}>
          <span className="fl-tag">{LABEL[f.type]}</span>{f.reason}
        </li>
      ))}
      {result.verified.map((v, i) => (
        <li key={`v${i}`} className="fl-ok" onClick={() => jump(`ver-${i}`)}><span className="fl-tag">Verified</span>{v.note}</li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 6: `components/App.tsx`**

```tsx
import * as React from "react";
import { readCurrentEmail } from "../lib/office";
import { scanEmail } from "../lib/api";
import type { ScanRequest, ScanResult } from "../types";
import { EmailView } from "./EmailView";
import { VerdictBanner } from "./VerdictBanner";
import { FlagList } from "./FlagList";
import { useSweep } from "./useSweep";

type Phase = "idle" | "waiting" | "sweeping" | "done" | "error";

export default function App() {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [email, setEmail] = React.useState<ScanRequest | null>(null);
  const [result, setResult] = React.useState<ScanResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const lineRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useSweep(phase === "sweeping", contentRef, lineRef, scrollRef, () => setPhase("done"));

  const run = async () => {
    setError(null); setResult(null);
    try {
      const req = await readCurrentEmail();
      setEmail(req);
      setPhase("waiting");
      const res = await scanEmail(req);
      setResult(res);
      setPhase("sweeping");
    } catch (e) {
      setError((e as Error).message);
      setPhase("error");
    }
  };

  return (
    <div className="app">
      <header className="bar">
        <div className="brand">Trust Scanner</div>
        <button className="scan-btn" onClick={run} disabled={phase === "waiting" || phase === "sweeping"}>
          {phase === "waiting" ? "Scanning…" : phase === "done" ? "Rescan" : "Scan email"}
        </button>
      </header>
      {phase === "done" && result && <VerdictBanner result={result} />}
      {error && <div className="error">{error}</div>}
      <div className={`scroller phase-${phase}`} ref={scrollRef}>
        {email ? (
          <EmailView email={email} result={result} scanning={phase === "waiting"} contentRef={contentRef} lineRef={lineRef} />
        ) : (
          <p className="hint">Open a recruiting email and press <b>Scan email</b> to check it for impersonation and scam signals.</p>
        )}
      </div>
      {phase === "done" && result && <FlagList result={result} />}
    </div>
  );
}
```

If the scaffold's `index.tsx` passes props (e.g. `title`) to `App`, remove them there.

- [ ] **Step 7: `taskpane.css`**

```css
:root { --blue:#2563eb; --red:#dc2626; --red-bg:#fee2e2; --amber:#b45309; --amber-bg:#fef3c7; --green:#15803d; --green-bg:#dcfce7; --ink:#111827; --muted:#6b7280; --line:#e5e7eb; }
body { margin:0; font-family:"Segoe UI",system-ui,sans-serif; color:var(--ink); background:#fff; }
.app { display:flex; flex-direction:column; height:100vh; }
.bar { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid var(--line); }
.brand { font-weight:600; }
.scan-btn { background:var(--blue); color:#fff; border:0; border-radius:6px; padding:7px 14px; font-weight:600; cursor:pointer; }
.scan-btn:disabled { opacity:.6; cursor:default; }
.hint { color:var(--muted); padding:16px; font-size:14px; }
.error { margin:8px 12px; padding:8px; background:var(--red-bg); color:var(--red); border-radius:6px; font-size:13px; }
.scroller { flex:1; overflow:auto; }
.email { position:relative; padding:12px; font-size:13px; line-height:1.55; }
.email-row { display:flex; gap:8px; margin-bottom:4px; }
.label { color:var(--muted); min-width:52px; }
.mono { font-family:ui-monospace,Menlo,monospace; font-size:12px; word-break:break-all; }
.email-body { margin-top:10px; padding-top:10px; border-top:1px solid var(--line); white-space:pre-wrap; word-wrap:break-word; }

/* highlights: invisible until the sweep line passes (.lit) */
.hl { background:transparent; color:inherit; border-radius:3px; transition:background-color .25s, box-shadow .25s; }
.hl.lit.hl-hard { background:var(--red-bg); box-shadow:inset 0 -2px 0 var(--red); }
.hl.lit.hl-soft { background:#ffedd5; box-shadow:inset 0 -2px 0 #ea580c; }
.hl.lit.hl-ok { background:var(--green-bg); box-shadow:inset 0 -2px 0 var(--green); }

/* scan line */
.scanline { position:absolute; left:0; right:0; top:0; height:3px; background:var(--blue); box-shadow:0 0 12px 3px rgba(37,99,235,.55); opacity:0; pointer-events:none; }
.phase-waiting .scanline, .phase-sweeping .scanline { opacity:1; }
.scanline-idle { animation:idle-scan 1.6s ease-in-out infinite alternate; }
@keyframes idle-scan { from { transform:translateY(0); } to { transform:translateY(140px); } }
.phase-done .scanline { opacity:0; transition:opacity .4s; }

/* verdict */
.verdict { margin:10px 12px 0; padding:10px 12px; border-radius:8px; animation:pop .35s ease-out; }
@keyframes pop { from { transform:scale(.96); opacity:0; } to { transform:scale(1); opacity:1; } }
.verdict-title { font-size:18px; font-weight:700; display:flex; align-items:center; gap:8px; }
.verdict-icon { display:inline-grid; place-items:center; width:24px; height:24px; border-radius:50%; color:#fff; font-size:14px; }
.verdict-sub, .verdict-ai, .verdict-note { font-size:12px; margin-top:4px; }
.verdict-note { color:var(--muted); font-style:italic; }
.v-ok { background:var(--green-bg); color:var(--green); } .v-ok .verdict-icon { background:var(--green); }
.v-warn { background:var(--amber-bg); color:var(--amber); } .v-warn .verdict-icon { background:var(--amber); }
.v-bad { background:var(--red-bg); color:var(--red); } .v-bad .verdict-icon { background:var(--red); }

/* flag list */
.flaglist { list-style:none; margin:0; padding:8px 12px 12px; border-top:1px solid var(--line); max-height:35vh; overflow:auto; font-size:12px; }
.flaglist li { padding:6px 8px; margin-bottom:4px; border-radius:6px; border-left:3px solid; cursor:pointer; }
.fl-hard { border-color:var(--red); background:#fef2f2; } .fl-soft { border-color:#ea580c; background:#fff7ed; } .fl-ok { border-color:var(--green); background:#f0fdf4; }
.fl-tag { font-weight:600; margin-right:6px; }
```

Note: the idle animation sets `transform` via CSS, and `useSweep` sets it inline. `scanning` becomes false when the phase moves to "sweeping", which removes `.scanline-idle`, so the inline transform takes over.

- [ ] **Step 8: Typecheck + build.** Run `cd email-scanner/addin && npx tsc --noEmit && npm run build`. Expected: no errors.

- [ ] **Step 9: Manual verification in Outlook** (with the backend running). Open any email in `slhj1208@outlook.com`, open the pane, click **Scan email**. Expect the email re-rendered, the blue line looping while waiting, then one top-to-bottom sweep that lights highlights as it passes, then the verdict banner and flag list, where clicking a flag scrolls to its highlight. Then stop the backend and rescan: an error message should show, with no crash. Run the backend with `LLM_ENABLED=false`, rescan, and confirm the verdict appears quickly. Take a screenshot for Progress.md/the demo.

- [ ] **Step 10: Commit** (+ Progress.md): `git commit -m "email-scanner: task pane UI with sweep animation and verdict"`

---

## Phase 4: End-to-end wiring check

Phase 3 Task 11 already exercises the full path (Outlook → pane → proxy → backend → Thor). This phase is a short hardening pass once real demo emails exist (after Task 14), so it's folded into **Task 15** instead of being a separate task.

---

## Phase 5: Synthetic data, calibration, mailbox seeding

> **Human action needed early (parallel to Phases 1–3):** Microsoft retired basic-auth/app-password IMAP for Outlook.com consumer accounts (announced for Sep 2024). The spec's "app password" path may therefore fail, and OAuth2 needs an app registration in Microsoft Entra (portal.azure.com), which Shrikar has to do while signed in. Try the app password first (5 min). If IMAP login is rejected, do the Entra registration (Task 14, Step 4). If both fail, the demo still works via the in-pane sample picker (Task 14b).

### Task 12: Synthetic emails + calibration run (demo-critical)

**Files:**
- Create or verify: `email-scanner/data/synthetic-emails.json`
- Create: `email-scanner/backend/scripts/calibrate.ts`
- Modify (only if needed): `email-scanner/data/known-companies.json`, `email-scanner/data/spell-allowlist.txt`, `backend/src/llm/prompt.ts`

**Interfaces:**
- Consumes: `scanEmail`, `ScanDeps` (T8), `runLlmCheck` (T7), `loadCompanies` (T2), `loadConfig` (T1)
- Produces: `interface SyntheticEmail { id: string; label: "legit" | "scam"; sender_name: string; sender_email: string; claimed_company: string; subject: string; body: string; injected_flaws: string[] }` (exported from `scripts/calibrate.ts`; the seed script redeclares it)

- [ ] **Step 1: Check for Abhiram's agent's output.** Run `git pull && ls email-scanner/data/`. If `synthetic-emails.json` exists, validate it against the schema (Step 2 does this automatically) and skip to Step 3. Otherwise write it yourself with **exactly these 16 entries** (body text of 80–200 words each, realistic recruiter voice). Every `claimed_company` must exist in `known-companies.json`.

| id | label | sender_name / sender_email | claimed_company | injected_flaws | gist |
|---|---|---|---|---|---|
| legit-001 | legit | Priya Shah / priya.shah@acmerobotics.example.com | Acme Robotics | [] | schedule a 30-min phone screen, links careers page |
| legit-002 | legit | Marcus Lee / m.lee@brightline-analytics.example.com | Brightline Analytics | [] | onsite interview logistics, badge at front desk |
| legit-003 | legit | Northwind Health Talent / talent@northwindhealth.example.com | Northwind Health | [] | application received, next steps in 1–2 weeks |
| legit-004 | legit | Dana Ortiz / dortiz@acmerobotics.example.com | Acme Robotics | [] | formal offer letter attached, HR portal to sign, background check via official portal |
| legit-005 | legit | Ken Watanabe / kwatanabe@brightline-analytics.example.com | Brightline Analytics | [] | take-home assessment, 5 days, questions welcome |
| legit-006 | legit | Aisha Bello / abello@tesla.com | Tesla | [] | recruiter intro for a manufacturing-engineering role, asks for a good time to talk |
| scam-001 | scam | John Pork / johnpork.tesla@gmail.com | Tesla | [domain_mismatch, urgency_pressure] | "selected" for remote role, reply within 24h |
| scam-002 | scam | Amazon Hiring Team / hr@amazon-careers-portal.net | Amazon | [domain_mismatch, financial_request] | pay $150 "equipment deposit", refunded later |
| scam-003 | scam | Sarah Kim - Acme Robotics / acme.robotics.hr@outlook.com | Acme Robotics | [domain_mismatch, misspelling] | offer letter with 4–5 typos (recieve, oppertunity, sucessful, benifits) |
| scam-004 | scam | Recruitment Desk / careers@brightline-analytics.example.com | Brightline Analytics | [urgency_pressure, generic_greeting] | correct domain, but "Dear Applicant", act today; subtle scam (expected Suspicious, not Likely Scam) |
| scam-005 | scam | Google Talent Acquisition / talent.google.hr@gmail.com | Google | [domain_mismatch, generic_greeting, personal_info_request] | asks for SSN + DOB "for payroll" before interview |
| scam-006 | scam | Michael Grant / mgrant@deloitte-recruiting.co | Deloitte | [domain_mismatch, chat_interview] | interview only via Telegram chat |
| scam-007 | scam | Northwind Health HR / hr@northwindhealth.example.com | Northwind Health | [misspelling, unrealistic_offer] | correct domain, $60/hr for 10hrs/wk "no experience", 3 typos (expected Suspicious) |
| scam-008 | scam | JPMorgan Chase Careers / jpmc.careers@hotmail.com | JPMorgan Chase | [domain_mismatch, check_fraud] | "we'll mail you a check, deposit it and buy equipment" |
| scam-009 | scam | Stripe People Team / people@str1pe.com | Stripe | [domain_mismatch] | polished, plausible offer, only the look-alike domain gives it away |
| scam-010 | scam | Emily Chen / emily.chen.microsoft@gmail.com | Microsoft | [domain_mismatch, urgency_pressure, financial_request] | pay for "certification training" to be onboarded |

Note: scam-004 and scam-007 intentionally use the real domain of a fictional company, to demo that soft signals alone yield **Suspicious**. That represents a compromised or spoofed-display case and keeps the demo from being "domain check only".

- [ ] **Step 2: Write `scripts/calibrate.ts`**

```ts
import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadCompanies } from "../src/companies.js";
import { loadConfig } from "../src/config.js";
import { runLlmCheck } from "../src/llm/client.js";
import { scanEmail } from "../src/scan.js";

export interface SyntheticEmail {
  id: string; label: "legit" | "scam"; sender_name: string; sender_email: string;
  claimed_company: string; subject: string; body: string; injected_flaws: string[];
}

const path = fileURLToPath(new URL("../../data/synthetic-emails.json", import.meta.url));
const emails = JSON.parse(readFileSync(path, "utf8")) as SyntheticEmail[];
const cfg = loadConfig();
const companies = loadCompanies();
const names = new Set(companies.map((c) => c.company));
const useLlm = cfg.llmEnabled && !process.argv.includes("--no-llm");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

let bad = 0;
for (const e of emails) {
  if (only && e.id !== only) continue;
  if (!names.has(e.claimed_company)) console.warn(`! ${e.id}: claimed_company "${e.claimed_company}" not in known-companies.json`);
  const r = await scanEmail(e, {
    companies,
    llm: useLlm ? (req) => runLlmCheck(req, cfg) : async () => ({ status: "disabled", flags: [], summary: null }),
  });
  const ok = e.label === "legit" ? r.verdict === "Legitimate"
    : e.injected_flaws.includes("domain_mismatch") ? r.verdict === "Likely Scam" : r.verdict !== "Legitimate";
  if (!ok) bad++;
  console.log(`${ok ? "✓" : "✗"} ${e.id.padEnd(10)} ${e.label.padEnd(5)} → ${r.verdict.padEnd(11)} llm=${r.llm_status}`);
  if (!ok || process.argv.includes("-v")) for (const f of r.flags) {
    const src = f.field === "body" ? e.body : f.field === "subject" ? e.subject : `${e.sender_name} <${e.sender_email}>`;
    console.log(`     ${f.type.padEnd(16)} "${src.slice(f.span_start, f.span_end)}" (${f.reason})`);
  }
}
console.log(`\n${bad} mismatches`);
process.exit(bad ? 1 : 0);
```

- [ ] **Step 3: Rules-only calibration.** Run `npm run calibrate -- --no-llm`. Every legit email should be Legitimate. A legit email flagged only for spelling means a real word is being caught: add it to `spell-allowlist.txt` (not the email) and rerun until 0 legit mismatches. Scams without LLM may show Legitimate for scam-004 (tone-only); that's expected here.

- [ ] **Step 4: Full calibration with Thor.** Run `npm run calibrate -- -v`. It takes ~16 × 10–30s, so run it in the background. Expected: all rows ✓.
  - **If a legit email comes back Suspicious because of `llm_*` flags:** first tighten `SYSTEM_PROMPT` (add the flagged normal phrase as a "normal, don't flag" example) and rerun `--only=<id>`. **Do not change the verdict rule** (≥1 soft → Suspicious is a spec decision). If prompt tuning can't get legit emails clean, stop and report the false-positive rate to Shrikar with options, e.g. requiring ≥2 soft flags or ignoring LLM flags when the domain is verified.

- [ ] **Step 5: Commit** (+ Progress.md with the final calibration table): `git commit -m "email-scanner: synthetic demo emails and calibration script"`

### Task 13: .eml builder (TDD)

**Files:**
- Create: `email-scanner/backend/src/seed/eml.ts`
- Test: `email-scanner/backend/test/eml.test.ts`

**Interfaces:**
- Produces: `buildEml(email: { id: string; sender_name: string; sender_email: string; subject: string; body: string }, opts: { to: string; date: Date }): Promise<Buffer>`. The output has a `X-Trust-Scanner-Synthetic: <id>` header (used by `--clear`).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildEml } from "../src/seed/eml.js";

describe("buildEml", () => {
  it("produces RFC822 with custom From, Subject, Date, marker header and body", async () => {
    const raw = (await buildEml(
      { id: "scam-001", sender_name: "John Pork", sender_email: "johnpork.tesla@gmail.com", subject: "Offer", body: "Hello there" },
      { to: "slhj1208@outlook.com", date: new Date("2026-09-19T14:00:00Z") }
    )).toString("utf8");
    expect(raw).toMatch(/^From: John Pork <johnpork\.tesla@gmail\.com>$/m);
    expect(raw).toMatch(/^To: slhj1208@outlook\.com$/m);
    expect(raw).toMatch(/^Subject: Offer$/m);
    expect(raw).toMatch(/^Date: Sat, 19 Sep 2026 14:00:00 \+0000$/m);
    expect(raw).toMatch(/^X-Trust-Scanner-Synthetic: scam-001$/m);
    expect(raw).toMatch(/^Message-ID: <scam-001\.\d+@trust-scanner\.local>$/m);
    expect(raw).toContain("Hello there");
  });
});
```

- [ ] **Step 2: Run to verify failure.** → FAIL.
- [ ] **Step 3: Implement `src/seed/eml.ts`**

```ts
import MailComposer from "nodemailer/lib/mail-composer/index.js";

export function buildEml(
  email: { id: string; sender_name: string; sender_email: string; subject: string; body: string },
  opts: { to: string; date: Date }
): Promise<Buffer> {
  const mail = new MailComposer({
    from: { name: email.sender_name, address: email.sender_email },
    to: opts.to,
    subject: email.subject,
    text: email.body,
    date: opts.date,
    messageId: `<${email.id}.${opts.date.getTime()}@trust-scanner.local>`,
    headers: { "X-Trust-Scanner-Synthetic": email.id },
  });
  return new Promise((resolve, reject) => mail.compile().build((err, msg) => (err ? reject(err) : resolve(msg))));
}
```
If the `From:` regex fails only because nodemailer quotes the name (`"John Pork" <...>`), loosen the test regex to `/^From: "?John Pork"? <johnpork\.tesla@gmail\.com>$/m`. That's valid RFC822 either way.

- [ ] **Step 4: Run tests.** → PASS.
- [ ] **Step 5: Commit** (+ Progress.md): `git commit -m "email-scanner: RFC822 .eml builder for synthetic emails"`

### Task 14: IMAP APPEND seeding script (demo-critical, human-in-the-loop auth)

**Files:**
- Create: `email-scanner/backend/scripts/seed-mailbox.ts`, `scripts/get-outlook-token.ts`
- Modify: `email-scanner/backend/package.json` (add `@azure/msal-node` only if Step 4 is needed)

**Interfaces:**
- Consumes: `buildEml` (T13), `SyntheticEmail` shape (T12)
- CLI: `npm run seed -- [--dry-run] [--clear] [--only=<id>]`

- [ ] **Step 1: Write `scripts/seed-mailbox.ts`**

```ts
import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ImapFlow } from "imapflow";
import { buildEml } from "../src/seed/eml.js";

interface SyntheticEmail { id: string; sender_name: string; sender_email: string; subject: string; body: string }

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const clear = args.includes("--clear");
const only = args.find((a) => a.startsWith("--only="))?.slice(7);
const user = process.env.IMAP_USER ?? "slhj1208@outlook.com";

const emails = (JSON.parse(readFileSync(fileURLToPath(new URL("../../data/synthetic-emails.json", import.meta.url)), "utf8")) as SyntheticEmail[])
  .filter((e) => !only || e.id === only);

// Stagger dates so the inbox looks natural: newest first, ~40 min apart.
const now = Date.now();
const built = await Promise.all(emails.map(async (e, i) => {
  const date = new Date(now - i * 40 * 60_000);
  return { e, date, raw: await buildEml(e, { to: user, date }) };
}));

if (dryRun) {
  const out = fileURLToPath(new URL("../out/", import.meta.url));
  mkdirSync(out, { recursive: true });
  for (const b of built) writeFileSync(`${out}${b.e.id}.eml`, b.raw);
  console.log(`wrote ${built.length} .eml files to ${out}`);
  process.exit(0);
}

const auth = process.env.IMAP_ACCESS_TOKEN
  ? { user, accessToken: process.env.IMAP_ACCESS_TOKEN }
  : { user, pass: process.env.IMAP_PASSWORD ?? "" };
const client = new ImapFlow({ host: "outlook.office365.com", port: 993, secure: true, auth, logger: false });
await client.connect();
const lock = await client.getMailboxLock("INBOX");
try {
  if (clear) {
    const uids = await client.search({ header: { "x-trust-scanner-synthetic": "" } }, { uid: true });
    if (uids && uids.length) await client.messageDelete(uids, { uid: true });
    console.log(`cleared ${uids ? uids.length : 0} previously seeded messages`);
  }
  for (const b of built) {
    await client.append("INBOX", b.raw, [], b.date); // no \Seen flag → shows as unread
    console.log(`appended ${b.e.id}`);
  }
} finally {
  lock.release();
  await client.logout();
}
```

- [ ] **Step 2: Dry run.** Run `npm run seed -- --dry-run` and open one `out/*.eml` in a text editor or Mail.app to check the headers look right.

- [ ] **Step 3: Try app-password auth (Shrikar).** Sign in to account.microsoft.com as `slhj1208@outlook.com` → Security → Advanced security options → App passwords (requires 2-step verification). Put the password in `backend/.env` as `IMAP_PASSWORD`, then run `npm run seed -- --only=legit-001`. Expected: `appended legit-001`, and the email appears in Outlook web. If the result is `AUTHENTICATE failed` / `LOGIN failed`, go to Step 4.

- [ ] **Step 4 (only if Step 3 fails): OAuth2 device-code.** Shrikar goes to portal.azure.com → Microsoft Entra ID → App registrations → New registration: name "trust-scanner-seed", supported account types "Personal Microsoft accounts only". Under Authentication, set "Allow public client flows" to Yes. Copy the Application (client) ID into `.env` as `AZURE_CLIENT_ID`. Then `npm i @azure/msal-node` and write `scripts/get-outlook-token.ts`:

```ts
import "dotenv/config";
import { PublicClientApplication } from "@azure/msal-node";

const pca = new PublicClientApplication({
  auth: { clientId: process.env.AZURE_CLIENT_ID!, authority: "https://login.microsoftonline.com/consumers" },
});
const res = await pca.acquireTokenByDeviceCode({
  scopes: ["https://outlook.office.com/IMAP.AccessAsUser.All", "offline_access"],
  deviceCodeCallback: (r) => console.error(r.message),
});
console.log(res?.accessToken);
```
Run `IMAP_ACCESS_TOKEN=$(npm run -s token) npm run seed -- --only=legit-001` and have Shrikar complete the device-code login as `slhj1208@outlook.com`. Tokens last ~1h, which is enough for seeding.

- [ ] **Step 5: Seed everything.** Run `npm run seed -- --clear`. Expected: 16 appended, visible in Outlook web Inbox with the right sender names and addresses. (Outlook may route some to Junk; if so, move them to Inbox manually and note it in Progress.md.)

- [ ] **Step 6: Commit** (+ Progress.md with which auth path worked): `git commit -m "email-scanner: IMAP APPEND seeding for demo mailbox"`

### Task 14b (fallback, only if seeding is blocked by ~3:00 PM): In-pane sample picker

**Files:** Modify `addin/src/taskpane/components/App.tsx`; copy `data/synthetic-emails.json` to `addin/src/taskpane/samples.json`.

- [ ] **Step 1:** In `App.tsx`, `import samples from "../samples.json";` and add a `<select>` in the header listing `samples.map(s => s.id + ": " + s.subject)`. On change, set `email` to `{ sender_name, sender_email, subject, body }` from the sample. Make `run` take an optional `ScanRequest` and skip `readCurrentEmail()` when one is given.
- [ ] **Step 2:** Verify in Outlook: pick scam-001, scan, and get the Likely Scam sweep. Commit (+ Progress.md): `git commit -m "email-scanner: sample picker fallback for demo"`

### Task 15: Demo hardening + runbook (demo-critical)

**Files:**
- Create: `email-scanner/README.md`
- Modify: `Progress.md`

- [ ] **Step 1: Full dry run of the demo in Outlook.** Scan legit-001 (Legitimate, green sender domain), scam-001 (Likely Scam, red gmail.com + tone flags), scam-004 (Suspicious, correct domain but pressure wording), and scam-003 (Likely Scam with misspellings lit). Time each scan. Fix anything visibly broken (overlapping highlights, sweep not reaching the bottom, banner copy).
- [ ] **Step 2: Thor-down drill.** Run `OLLAMA_BASE_URL=http://10.255.255.1:11434 LLM_TIMEOUT_MS=5000 npm start` (unroutable address) and scan scam-001. Expected: Likely Scam, with the "AI check unavailable" note after ~5s. This proves the demo survives a Tailscale drop.
- [ ] **Step 3: Write `email-scanner/README.md`**. Cover: prerequisites (Node 22, Tailscale up, `npx office-addin-dev-certs install`); start order (`backend: npm start`, then `addin: npm run dev-server`); sideload steps (aka.ms/olksideload → Add from file → manifest.xml); env vars table (from `.env.example`); the Thor fallback swap (`OLLAMA_BASE_URL=http://localhost:11434 OLLAMA_MODEL=qwen2.5vl:7b`, requires `ollama serve` + `ollama pull qwen2.5vl:7b`) and the no-LLM mode (`LLM_ENABLED=false`); seeding commands; `npm test` / `npm run calibrate`; a 60-second demo script (the four emails from Step 1).
- [ ] **Step 4: Final checks.** Run `cd email-scanner/backend && npm test && npm run typecheck` and `cd ../addin && npm run test:unit && npx tsc --noEmit`. All green.
- [ ] **Step 5: Commit + push** (+ Progress.md Current State: "email scanner demo-ready", Next Steps: remaining polish): `git commit -m "email-scanner: demo runbook and hardening" && git push`

---

## Suggested ordering against the clock

1. Start Phase 5's human auth attempt (Task 14 Step 3) in parallel **now**, since it only needs Shrikar for 5 minutes.
2. Tasks 1→8 (backend, ~75 min).
3. Task 9 (scaffold + sideload, ~30 min, and the riskiest environment step), then 10→11 (~60 min).
4. Task 12 (data + calibration) → 13 → 14 (or 14b) → 15.
