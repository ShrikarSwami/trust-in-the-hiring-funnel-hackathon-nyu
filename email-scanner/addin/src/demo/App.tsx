import * as React from "react";
import samples from "../taskpane/samples.json";
import scanCache from "./scan-cache.json";
import type { Field, ScanRequest, ScanResult } from "../taskpane/types";
import { senderLine } from "../taskpane/types";
import { scanEmail } from "../taskpane/lib/api";
import { Highlighted } from "../taskpane/components/EmailView";
import { marksFor } from "../taskpane/lib/segments";
import { VerdictBanner } from "../taskpane/components/VerdictBanner";
import { FlagList } from "../taskpane/components/FlagList";
import { useSweep } from "../taskpane/components/useSweep";

interface Sample { id: string; label: "legit" | "scam"; display: string; claimed_company: string; request: ScanRequest }

// Real careers pages for the companies emails claim to be from - so "cross-check" opens the
// actual employer's job listings, not a fake/local one. Omitted entirely for fictional demo
// companies (no real page exists) or where no dedicated careers page could be confirmed
// (falls back to the company's real homepage instead of guessing a URL that might 404).
const CAREERS_URL: Record<string, string> = {
  Tesla: "https://www.tesla.com/careers",
  Amazon: "https://www.amazon.jobs/",
  Google: "https://careers.google.com/",
  Microsoft: "https://careers.microsoft.com/",
  Meta: "https://www.metacareers.com/",
  Apple: "https://www.apple.com/careers/us/",
  Netflix: "https://jobs.netflix.com/",
  "JPMorgan Chase": "https://careers.jpmorgan.com/",
  "Goldman Sachs": "https://www.goldmansachs.com/careers/",
  Deloitte: "https://www2.deloitte.com/us/en/careers.html",
  Stripe: "https://stripe.com/jobs",
  Solari: "https://www.getsolari.com/",
  "Block Convey": "https://blockconvey.com/",
  Visionbrew: "https://www.visionbrew.app/",
  "Integral Recruiting": "https://integralrecruiting.com/",
  "localhost:nyc": "https://localhost-nyc.com/",
  NYU: "https://www.nyu.edu/about/careers-at-nyu.html",
};

const CACHE = scanCache as Record<string, ScanResult>;
const CACHED_SWEEP_DELAY_MS = 650; // keeps the "waiting" beat feeling intentional even from cache

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const SAMPLES = samples as Sample[];

// Sponsor/event-themed emails float to the top of the inbox for the demo.
const FEATURED_ORDER = [
  "legit-007", "scam-011", "legit-008", "scam-012", "legit-009", "scam-013",
  "legit-010", "scam-014", "legit-011", "scam-015", "legit-012", "scam-016",
  "legit-013", "scam-017",
];
const featuredIdx = new Map(FEATURED_ORDER.map((id, i) => [id, i]));
const ORDERED_SAMPLES = [...SAMPLES].sort((a, b) => {
  const fa = featuredIdx.get(a.id), fb = featuredIdx.get(b.id);
  if (fa !== undefined && fb !== undefined) return fa - fb;
  if (fa !== undefined) return -1;
  if (fb !== undefined) return 1;
  return 0;
});

type Phase = "idle" | "waiting" | "sweeping" | "done" | "error";

// Minimal flat monochrome line icons (Fluent-style), so the chrome doesn't rely on
// platform-inconsistent color emoji for its glyphs.
function svg(path: React.ReactNode, viewBox = "0 0 20 20") {
  return function IconSvg(props: { size?: number }) {
    return (
      <svg width={props.size ?? 16} height={props.size ?? 16} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        {path}
      </svg>
    );
  };
}
const Icon = {
  Search: svg(<><circle cx="8.5" cy="8.5" r="5.5" /><line x1="17" y1="17" x2="12.8" y2="12.8" /></>),
  Bell: svg(<><path d="M5 8a5 5 0 0 1 10 0c0 4 1.5 5 1.5 5h-13S5 12 5 8Z" /><path d="M8 15.5a2 2 0 0 0 4 0" /></>),
  Gear: svg(<><circle cx="10" cy="10" r="2.6" /><path d="M10 3v2M10 15v2M3 10h2M15 10h2M5 5l1.4 1.4M13.6 13.6 15 15M15 5l-1.4 1.4M6.4 13.6 5 15" /></>),
  NewMail: svg(<><rect x="2.5" y="4.5" width="15" height="11" rx="1.5" /><path d="m3 5.5 7 5.5 7-5.5" /></>),
  Trash: svg(<><path d="M4.5 6h11M8 6V4.3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6M6 6l.7 9.3a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L14 6" /></>),
  Archive: svg(<><rect x="2.5" y="4" width="15" height="3.5" rx="0.8" /><path d="M4 7.5V15a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7.5" /><line x1="8.2" y1="10.5" x2="11.8" y2="10.5" /></>),
  ReplyAll: svg(<><path d="M9 6 4.5 10 9 14" /><path d="M12 6 7.5 10l4.5 4" /><path d="M7.5 10H12a4 4 0 0 1 4 4v1" /></>),
  Inbox: svg(<><path d="M3 10h4l1.2 2.2h3.6L13 10h4" /><path d="M3 10 4.6 4.9A1 1 0 0 1 5.6 4.2h8.8a1 1 0 0 1 1 .7L17 10v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5Z" /></>),
  Drafts: svg(<><path d="M11.5 3.5 15 7l-8 8H3.5v-3.5l8-8Z" /></>),
  Sent: svg(<><path d="M3 3.5 17 10 3 16.5l2-6.5-2-6.5Z" /><line x1="5" y1="10" x2="17" y2="10" /></>),
  Junk: svg(<><circle cx="10" cy="10" r="7" /><line x1="7" y1="7" x2="13" y2="13" /><line x1="13" y1="7" x2="7" y2="13" /></>),
  Chat: svg(<><path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v6A1.5 1.5 0 0 1 15.5 13H8l-3.5 3v-3H4.5A1.5 1.5 0 0 1 3 11.5v-6Z" /></>),
  Note: svg(<><rect x="3.5" y="3" width="13" height="14" rx="1.2" /><line x1="6.5" y1="7" x2="13.5" y2="7" /><line x1="6.5" y1="10.5" x2="13.5" y2="10.5" /><line x1="6.5" y1="14" x2="11" y2="14" /></>),
};

const AVATAR_COLORS = ["#5b2d8e", "#8764b8", "#c239b3", "#e3008c", "#ca5010", "#8e8cd8", "#0078d4", "#038387", "#498205", "#986f0b"];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
// Deterministic timestamps so the inbox reads naturally, newest first, staggered ~23min apart.
const NOW = new Date("2026-09-19T18:58:00");
function timeFor(i: number): Date {
  return new Date(NOW.getTime() - i * 23 * 60_000);
}
function relativeTime(i: number): string {
  const d = timeFor(i);
  const hoursAgo = (NOW.getTime() - d.getTime()) / 3_600_000;
  if (hoursAgo < 20) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const daysAgo = Math.floor(hoursAgo / 24);
  return daysAgo <= 1 ? "Yesterday" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function App() {
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [result, setResult] = React.useState<ScanResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const lineRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const busy = phase === "waiting" || phase === "sweeping";
  const finishSweep = React.useCallback(() => setPhase("done"), []);
  useSweep(phase === "sweeping", contentRef, lineRef, scrollRef, finishSweep);

  const selected = ORDERED_SAMPLES[selectedIdx];
  const email = selected.request;
  const marks = (field: Field) => (result ? marksFor(result, field) : []);

  const selectEmail = (idx: number) => {
    if (busy || idx === selectedIdx) return;
    setSelectedIdx(idx);
    setPhase("idle");
    setResult(null);
    setError(null);
  };

  const scan = async () => {
    if (busy) return;
    setError(null);
    setResult(null);
    setPhase("waiting");
    try {
      const cached = CACHE[selected.id];
      let response: ScanResult;
      if (cached) {
        await sleep(CACHED_SWEEP_DELAY_MS);
        response = cached;
      } else {
        response = await scanEmail(email);
      }
      setResult(response);
      setPhase("sweeping");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not scan this email. Please retry.");
      setPhase("error");
    }
  };

  return (
    <div className="outlook-shell">
      <header className="outlook-topbar">
        <span className="outlook-waffle" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /></span>
        <div className="outlook-brand">Outlook</div>
        <div className="outlook-search" aria-hidden="true"><Icon.Search /> Search</div>
        <div className="outlook-topbar-right">
          <span className="upsell">Buy Microsoft 365</span>
          <span aria-hidden="true"><Icon.Bell /></span>
          <span aria-hidden="true"><Icon.Gear /></span>
          <div className="outlook-account" aria-hidden="true">S</div>
        </div>
      </header>

      <div className="outlook-ribbon">
        <div className="outlook-ribbon-tabs">
          <span>File</span><span className="active">Home</span><span>View</span><span>Help</span>
        </div>
        <button type="button" className="outlook-newmail"><Icon.NewMail /> New mail</button>
        <span className="outlook-ribbon-action"><Icon.Trash /> Delete</span>
        <span className="outlook-ribbon-action"><Icon.Archive /> Archive</span>
        <span className="outlook-ribbon-action"><Icon.ReplyAll /> Reply all</span>
        <button className="outlook-ribbon-action scan" type="button" onClick={scan} disabled={busy}>
          {busy ? "Scanning…" : phase === "done" ? "Rescan for scams" : "Scan for scams"}
        </button>
      </div>

      <div className="outlook-body">
        <nav className="outlook-folders">
          <div className="outlook-folders-group">Favorites</div>
          <div className="outlook-folder active"><span className="outlook-folder-icon"><Icon.Inbox /></span><span className="outlook-folder-label">Inbox</span><span className="count">{ORDERED_SAMPLES.length}</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Drafts /></span><span className="outlook-folder-label">Drafts</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Archive /></span><span className="outlook-folder-label">Archive</span></div>
          <div className="outlook-folders-group">slhj1208@outlook....</div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Inbox /></span><span className="outlook-folder-label">Inbox</span><span className="count">{ORDERED_SAMPLES.length}</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Junk /></span><span className="outlook-folder-label">Junk Email</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Drafts /></span><span className="outlook-folder-label">Drafts</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Sent /></span><span className="outlook-folder-label">Sent Items</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Trash /></span><span className="outlook-folder-label">Deleted Items</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Archive /></span><span className="outlook-folder-label">Archive</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Chat /></span><span className="outlook-folder-label">Conversation Hist...</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Note /></span><span className="outlook-folder-label">Notes</span></div>
        </nav>

        <div className="outlook-list-pane">
          <div className="outlook-list-tabs"><span className="active">Focused</span><span>Other</span></div>
          <div className="outlook-list" role="listbox" aria-label="Inbox">
            {ORDERED_SAMPLES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={i === selectedIdx}
                className={`outlook-row unread ${i === selectedIdx ? "selected" : ""}`}
                onClick={() => selectEmail(i)}
              >
                <span className="outlook-unread-dot" aria-hidden="true" />
                <span className="outlook-avatar" style={{ background: avatarColor(s.request.sender_name) }} aria-hidden="true">{initials(s.request.sender_name)}</span>
                <span className="outlook-row-main">
                  <span className="outlook-row-top">
                    <span className="outlook-sender">{s.request.sender_name}</span>
                    <span className="outlook-time">{relativeTime(i)}</span>
                  </span>
                  <span className="outlook-subject">{s.request.subject}</span>
                  <span className="outlook-snippet">{s.request.body.slice(0, 90).replace(/\n+/g, " ")}…</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <main className="outlook-reading">
          <div className="outlook-reading-header">
            <h1 className="outlook-reading-subject"><Highlighted text={email.subject} marks={marks("subject")} /></h1>
            <div className="outlook-reading-from">
              <span className="outlook-avatar" style={{ background: avatarColor(email.sender_name) }} aria-hidden="true">{initials(email.sender_name)}</span>
              <div className="outlook-reading-fromtext">
                <div className="outlook-reading-name"><Highlighted text={senderLine(email)} marks={marks("sender")} /></div>
                <div className="outlook-reading-to">To: Somya Gupta</div>
              </div>
              <div className="outlook-reading-date">
                {timeFor(selectedIdx).toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric", year: "numeric" })}{" "}
                {timeFor(selectedIdx).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </div>
            </div>
          </div>

          {phase === "done" && result && <VerdictBanner result={result} />}
          {phase === "done" && result && CAREERS_URL[selected.claimed_company] && (
            <div className="crosscheck">
              <button
                type="button"
                className="crosscheck-btn"
                onClick={() => window.open(CAREERS_URL[selected.claimed_company], "_blank", "noopener,noreferrer")}
              >
                🔎 Check {selected.claimed_company}'s real careers page
              </button>
            </div>
          )}
          {error && <div className="error" role="alert">{error}</div>}

          <div className={`scroller phase-${phase}`} ref={scrollRef} aria-busy={busy}>
            <div className="email" ref={contentRef}>
              <div className="email-body"><Highlighted text={email.body} marks={marks("body")} /></div>
              <div ref={lineRef} className={`scanline ${phase === "waiting" ? "scanline-idle" : ""}`} aria-hidden="true" />
            </div>
          </div>

          {phase === "done" && result && <FlagList result={result} />}
        </main>
      </div>
    </div>
  );
}
