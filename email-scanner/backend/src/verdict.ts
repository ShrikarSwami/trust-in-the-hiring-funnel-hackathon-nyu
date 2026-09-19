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
