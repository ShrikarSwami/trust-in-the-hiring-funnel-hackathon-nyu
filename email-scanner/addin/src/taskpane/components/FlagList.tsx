import * as React from "react";
import type { ScanResult } from "../types";

const LABEL = { domain_mismatch: "Sender domain", misspelling: "Spelling", llm_tone: "Tone", llm_plausibility: "Plausibility" } as const;

export function FlagList({ result }: { result: ScanResult }) {
  if (!result.flags.length && !result.verified.length) return null;
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
  return <ul className="flaglist" aria-label="Scan findings">
    {result.flags.map((flag, i) => <li key={`f${i}`} className={`fl-${flag.severity}`}><button type="button" onClick={() => jump(`flag-${i}`)}><span className="fl-tag">{LABEL[flag.type]}</span>{flag.reason}</button></li>)}
    {result.verified.map((item, i) => <li key={`v${i}`} className="fl-ok"><button type="button" onClick={() => jump(`ver-${i}`)}><span className="fl-tag">Verified</span>{item.note}</button></li>)}
  </ul>;
}
