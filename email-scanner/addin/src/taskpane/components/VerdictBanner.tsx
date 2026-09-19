import * as React from "react";
import type { ScanResult } from "../types";

const COPY = {
  Legitimate: { cls: "v-ok", icon: "✓", sub: "No impersonation or scam signals found." },
  Suspicious: { cls: "v-warn", icon: "!", sub: "Some warning signs. Verify with the company directly before sharing anything." },
  "Likely Scam": { cls: "v-bad", icon: "×", sub: "Strong impersonation signals. Do not reply or send personal information." },
} as const;

export function VerdictBanner({ result }: { result: ScanResult }) {
  const copy = COPY[result.verdict];
  return <div className={`verdict ${copy.cls}`} role="status">
    <div className="verdict-title"><span className="verdict-icon" aria-hidden="true">{copy.icon}</span>{result.verdict}</div>
    <div className="verdict-sub">{copy.sub}</div>
    {result.llm_summary && <div className="verdict-ai">AI review: {result.llm_summary}</div>}
    {result.llm_status === "unavailable" && <div className="verdict-note">AI check unavailable. Verdict is based on rules only.</div>}
  </div>;
}
