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

const DEFAULT_REASON: Record<LlmFinding["category"], string> = {
  tone: "Pressure, urgency, or unprofessional wording common in recruiting scams.",
  plausibility: "A claim or request a real employer would not make at this stage.",
};

function explanatoryReason(reason: string, category: LlmFinding["category"]): string {
  const trimmed = reason.trim();
  const isEmpty = trimmed.length === 0;
  const echoesCategory = trimmed.toLowerCase() === category.toLowerCase();
  const tooShort = trimmed.split(/\s+/).filter(Boolean).length < 3;
  if (isEmpty || echoesCategory || tooShort) return DEFAULT_REASON[category];
  return reason;
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
    flags.push({
      type,
      severity: "soft",
      field: inBody ? "body" : "subject",
      span_start: loc.start,
      span_end: loc.end,
      reason: explanatoryReason(f.reason, f.category),
    });
  }
  return flags;
}
