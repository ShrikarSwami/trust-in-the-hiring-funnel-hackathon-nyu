import type { Field, ScanResult, Severity } from "../types";

export interface Mark { id: string; start: number; end: number; kind: "flag" | "verified"; severity: Severity | null; reason: string }
export interface Segment { text: string; start: number; mark: Mark | null }

const priority = (m: Mark) => (m.severity === "hard" ? 0 : m.severity === "soft" ? 1 : 2);

export function marksFor(result: ScanResult, field: Field): Mark[] {
  const flags: Mark[] = result.flags
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => f.field === field)
    .map(({ f, i }) => ({ id: `flag-${i}`, start: f.span_start, end: f.span_end, kind: "flag" as const, severity: f.severity, reason: f.reason }));
  const verified: Mark[] = result.verified
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v.field === field)
    .map(({ v, i }) => ({ id: `ver-${i}`, start: v.span_start, end: v.span_end, kind: "verified" as const, severity: null, reason: v.note }));
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
