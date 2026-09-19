import * as React from "react";
import type { ScanResult } from "../types";

function ShieldCheck() {
  return <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M12 2.5 4.5 5.5v6c0 5 3.2 8.6 7.5 10 4.3-1.4 7.5-5 7.5-10v-6L12 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="m8.5 12.2 2.4 2.4 4.6-4.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function ShieldExclamation() {
  return <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M12 2.5 4.5 5.5v6c0 5 3.2 8.6 7.5 10 4.3-1.4 7.5-5 7.5-10v-6L12 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><line x1="12" y1="7.5" x2="12" y2="12.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="12" cy="15.7" r="1" fill="currentColor" /></svg>;
}
function ShieldX() {
  return <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M12 2.5 4.5 5.5v6c0 5 3.2 8.6 7.5 10 4.3-1.4 7.5-5 7.5-10v-6L12 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="m9.3 9.3 5.4 5.4M14.7 9.3l-5.4 5.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

const COPY = {
  Legitimate: { cls: "v-ok", Icon: ShieldCheck, title: "No threats found", sub: "This message did not match any known impersonation or scam patterns." },
  Suspicious: { cls: "v-warn", Icon: ShieldExclamation, title: "Potential threat detected", sub: "Some signals here are inconsistent with a genuine message. Verify with the company directly before responding." },
  "Likely Scam": { cls: "v-bad", Icon: ShieldX, title: "Threat detected", sub: "Strong indicators of impersonation. Do not reply, click links, or share personal information." },
} as const;

export function VerdictBanner({ result }: { result: ScanResult }) {
  const copy = COPY[result.verdict];
  return <div className={`verdict ${copy.cls}`} role="status">
    <div className="verdict-main">
      <span className="verdict-icon" aria-hidden="true"><copy.Icon /></span>
      <div className="verdict-text">
        <div className="verdict-title">{copy.title}</div>
        <div className="verdict-sub">{copy.sub}</div>
      </div>
    </div>
    <div className="verdict-meta">
      <span>Scan completed {new Date(result.checked_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>
      {result.llm_status === "unavailable" && <span className="verdict-note">· Cloud analysis unavailable, rule-based detection only</span>}
    </div>
    {result.llm_summary && <div className="verdict-ai"><span className="verdict-ai-label">Analysis</span>{result.llm_summary}</div>}
  </div>;
}
