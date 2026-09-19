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
  const busy = phase === "waiting" || phase === "sweeping";
  const finishSweep = React.useCallback(() => setPhase("done"), []);
  useSweep(phase === "sweeping", contentRef, lineRef, scrollRef, finishSweep);

  const run = async () => {
    if (busy) return;
    setError(null);
    setResult(null);
    setPhase("waiting");
    try {
      const request = await readCurrentEmail();
      setEmail(request);
      const response = await scanEmail(request);
      setResult(response);
      setPhase("sweeping");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not scan this email. Please retry.");
      setPhase("error");
    }
  };

  return <div className="app">
    <header className="bar"><div className="brand">Trust Scanner</div><button className="scan-btn" type="button" onClick={run} disabled={busy}>{busy ? "Scanning…" : phase === "done" ? "Rescan" : "Scan email"}</button></header>
    {phase === "done" && result && <VerdictBanner result={result} />}
    {error && <div className="error" role="alert">{error}</div>}
    <div className={`scroller phase-${phase}`} ref={scrollRef} aria-busy={busy}>
      {email ? <EmailView email={email} result={result} scanning={phase === "waiting"} contentRef={contentRef} lineRef={lineRef} /> : <p className="hint">Open a recruiting email and press <strong>Scan email</strong> to check it for impersonation and scam signals.</p>}
    </div>
    {phase === "done" && result && <FlagList result={result} />}
  </div>;
}
