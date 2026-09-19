import * as React from "react";
import { readCurrentEmail } from "../lib/office";
import { scanEmail } from "../lib/api";
import type { ScanRequest, ScanResult } from "../types";
import samples from "../samples.json";
import { EmailView } from "./EmailView";
import { VerdictBanner } from "./VerdictBanner";
import { FlagList } from "./FlagList";
import { useSweep } from "./useSweep";

type Phase = "idle" | "waiting" | "sweeping" | "done" | "error";

interface Sample {
  id: string;
  label: "legit" | "scam";
  display: string;
  request: ScanRequest;
}

const SAMPLES = samples as Sample[];
const LEGIT_SAMPLES = SAMPLES.filter((s) => s.label === "legit");
const SCAM_SAMPLES = SAMPLES.filter((s) => s.label === "scam");

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

  const runWithRequest = async (getRequest: () => Promise<ScanRequest> | ScanRequest) => {
    if (busy) return;
    setError(null);
    setResult(null);
    setPhase("waiting");
    try {
      const request = await getRequest();
      setEmail(request);
      const response = await scanEmail(request);
      setResult(response);
      setPhase("sweeping");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not scan this email. Please retry.");
      setPhase("error");
    }
  };

  const run = () => runWithRequest(readCurrentEmail);

  const onSampleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    e.target.value = ""; // reset so picking the same sample twice still fires onChange
    if (!id) return;
    const sample = SAMPLES.find((s) => s.id === id);
    if (sample) void runWithRequest(() => sample.request);
  };

  return <div className="app">
    <header className="bar">
      <div className="brand">Trust Scanner</div>
      <select className="sample-picker" aria-label="Load a sample email" onChange={onSampleChange} disabled={busy} defaultValue="">
        <option value="" disabled>Load sample…</option>
        <optgroup label="Legitimate">
          {LEGIT_SAMPLES.map((s) => <option key={s.id} value={s.id}>{s.display}</option>)}
        </optgroup>
        <optgroup label="Scam examples">
          {SCAM_SAMPLES.map((s) => <option key={s.id} value={s.id}>{s.display}</option>)}
        </optgroup>
      </select>
      <button className="scan-btn" type="button" onClick={run} disabled={busy}>{busy ? "Scanning…" : phase === "done" ? "Rescan" : "Scan email"}</button>
    </header>
    {phase === "done" && result && <VerdictBanner result={result} />}
    {error && <div className="error" role="alert">{error}</div>}
    <div className={`scroller phase-${phase}`} ref={scrollRef} aria-busy={busy}>
      {email ? <EmailView email={email} result={result} scanning={phase === "waiting"} contentRef={contentRef} lineRef={lineRef} /> : <p className="hint">Open a recruiting email and press <strong>Scan email</strong>, or pick a sample above, to check it for impersonation and scam signals.</p>}
    </div>
    {phase === "done" && result && <FlagList result={result} />}
  </div>;
}
