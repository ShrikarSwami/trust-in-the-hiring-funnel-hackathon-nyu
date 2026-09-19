# Handoff for Abhiram's Coding Agent(s)

If you're an AI coding agent reading this because Abhiram uploaded/pasted it: welcome. This
file is your onboarding. Read it in full before doing anything else, then follow the
"Your tasks" section at the bottom.

## The project, in one paragraph

We (Shrikar Swami + Abhiram Reddy "Ready" Kandadi) are building a two-part submission for the
**Trust in the Hiring Funnel Hackathon @ NYU** (Sep 19, 2026), targeting **Track B: trust going
out — impersonation and candidate scams**. Full event brief:
[docs/event-brief.md](docs/event-brief.md). Repo:
https://github.com/ShrikarSwami/trust-in-the-hiring-funnel-hackathon-nyu — you (or Abhiram)
should already have write access; if not, that's the first thing to sort out with Shrikar.

**This repo is a shared source of truth across multiple agents** (two Claude Code instances, a
ChatGPT/Codex instance, and now you). Before any task: read [Progress.md](Progress.md) in full
and skim `git log --oneline -20`. After any unit of work: update Progress.md (Current State,
Next Steps, a dated Log entry) and commit it alongside your changes. See [CLAUDE.md](CLAUDE.md)
and [AGENTS.md](AGENTS.md) for the exact rules other agents are following — follow the same
ones.

## The two components

### 1. Email trust scanner (Shrikar's component, in progress)

A real Outlook Office-JS add-in. A candidate opens a received email, clicks "Scan," and a blue
sweep-line animation passes over a re-rendered copy of the email in a task-pane sidebar,
highlighting suspicious spans red (sender-domain mismatch, misspellings, suspicious phrasing)
and clean/verified spans green, ending on a verdict: Legitimate / Suspicious / Likely Scam.
Detection is hybrid: deterministic rules (known-company-domain lookup + spellcheck) plus one
LLM call per scan to a local model (Thor, a Jetson AGX Thor devkit on Tailscale) for fuzzier
signals like tone and plausibility. Full design:
[docs/superpowers/specs/2026-09-19-email-scanner-design.md](docs/superpowers/specs/2026-09-19-email-scanner-design.md).
Lives in `email-scanner/` once scaffolded.

### 2. Job-posting verification tool (Abhiram's component — this is yours to design/build)

Abhiram's own framing, verbatim from his message to his agent:

> The problem. Scammers post fake jobs pretending to be real companies. A job seeker sees
> "Software Engineer at Acme," applies, gets a fake offer, and gets scammed out of money or
> personal data. Acme has no idea this is happening.
>
> How everyone else solves it. They look at the fake posting and try to guess: does this seem
> fake? Weird grammar, sketchy email, suspicious domain. It's guesswork, and it gets harder as
> AI makes fakes look better.
>
> What we do instead. Acme already publishes a list of its actual open jobs, and that list is
> publicly readable by anyone. So we don't guess. We just check the list.
>
> Someone shows you a posting for "Software Engineer at Acme." We look at Acme's real list. If
> that job isn't on it, Acme isn't hiring for it. It's fake. Done. No guessing involved.
>
> The analogy. Everyone else is examining a $20 bill under a magnifying glass trying to spot a
> forgery. We're calling the bank and asking whether that serial number exists.
>
> The demo. Two columns on screen. Left: every job posting on the internet claiming to be from
> Acme. Right: Acme's actual job list. Most of the left column matches the right. The handful
> that don't match light up red. Those are the scams, and we found them in seconds with
> certainty instead of probability.

This repo does **not** yet have a design or plan for this component — that's intentionally left
for Abhiram + his agent to work out, the same way the email scanner went through a brainstorm →
design spec → implementation plan flow (see
[docs/superpowers/specs/2026-09-19-email-scanner-design.md](docs/superpowers/specs/2026-09-19-email-scanner-design.md)
for what that looked like). Recommend the same process here: clarify scope with Abhiram first
(which companies' job lists to demo against — most large companies publish a careers API or a
scrapeable careers page; how postings are sourced for the "left column" — a fixed demo set of
scraped/fabricated postings is fine, doesn't need to be a live web crawl), write a short design,
get his sign-off, then build. Suggested location: `job-posting-verifier/` at the repo root,
alongside `email-scanner/`.

## Your tasks

You may be asked to do one or both of these, independently:

### Task A: Generate synthetic test emails for the email scanner

The email scanner needs realistic legit + scam recruiting emails to demo against and to seed a
test mailbox (`slhj1208@outlook.com`, a fresh throwaway account created for this project —
these are inserted directly into that mailbox via IMAP APPEND, not sent over the real internet,
so there's no actual impersonation of any real company involved — see the design spec's
"Seeding the demo mailbox" section for why).

Output format — a JSON array, one object per email:

```json
{
  "id": "string, unique, e.g. \"scam-001\"",
  "label": "legit" | "scam",
  "sender_name": "string, e.g. \"John Pork\"",
  "sender_email": "string, e.g. \"johnpork.tesla@gmail.com\"",
  "claimed_company": "string, e.g. \"Tesla\"",
  "subject": "string",
  "body": "string, the full email body text",
  "injected_flaws": ["domain_mismatch", "misspelling", "urgency_pressure", "generic_greeting", "..."]
}
```

`injected_flaws` should be empty (`[]`) for every `"label": "legit"` entry. For `"label": "scam"`
entries, pick 1-3 flaw types per email — don't make every scam email fail every check, since
that's unrealistic and makes for a boring demo (mix "obvious" and "subtle" scams).

Guidelines:
- Aim for roughly 15-25 emails total, a healthy mix of legit and scam (e.g. 60/40 scam-heavy is
  fine since that's the interesting case, but include enough legit ones to show the tool
  doesn't just flag everything).
- Reuse companies already in `email-scanner/data/known-companies.json` once that file exists
  (check the repo — if it's not there yet, coordinate with Shrikar on which companies to use;
  Tesla and Amazon were mentioned as examples, plus at least one fictional company like "Acme
  Robotics" is fine too).
- For `domain_mismatch` scams: the giveaway pattern from Shrikar's original framing is a
  personal-email-provider address claiming a corporate identity, e.g.
  `johnpork.tesla@gmail.com` claiming to be a Tesla recruiter (real Tesla recruiters would be
  `@tesla.com`). Vary the specific mismatch pattern (gmail, outlook, look-alike domains like
  `tesla-careers.net`) rather than always using the same one.
- For `misspelling` scams: inject a handful of realistic typos/misspellings into the body, not
  so many that it reads as gibberish.
- For `urgency_pressure`/other soft signals: think about what real recruiting scams actually
  say — urgency to act fast, requests for personal/financial info early, unusually generous
  offers for minimal work, generic greetings ("Dear Applicant" instead of a real name), poor
  grammar/tone inconsistent with a real corporate recruiter.
- Save the output as `email-scanner/data/synthetic-emails.json` (create the `email-scanner/`
  and `data/` directories if they don't exist yet) and commit it. If the email-scanner
  component's own directory structure has since evolved beyond what's described here, check
  Progress.md and recent commits first and place the file wherever that structure indicates
  instead.

### Task B: Design and build the job-posting verification component

Follow the brainstorm-first approach described above under "Job-posting verification tool":
clarify scope and constraints with Abhiram (one question at a time is fine), propose an
approach, get his sign-off on a short design before writing code, then build in
`job-posting-verifier/`. Update Progress.md with what you decide and build. If anything you
decide here would affect or depend on the email scanner (e.g. wanting to share the
known-companies domain list, or a shared "verdict" UI style so the two demos look like one
product), flag it in Progress.md's "Open Decisions" section rather than assuming — Shrikar
and Abhiram should agree on any cross-component coupling explicitly.

## Questions?

If anything above is unclear or seems to conflict with something Abhiram tells you directly,
trust Abhiram's live instructions over this document (it may be stale) but flag the
discrepancy in Progress.md so other agents/sessions aren't confused later.
