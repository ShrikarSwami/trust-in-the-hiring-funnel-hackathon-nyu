import { describe, it, expect } from "vitest";
import { buildSegments, marksFor, type Mark } from "./segments";

const m = (o: Partial<Mark>): Mark => ({ id: "x", start: 0, end: 1, kind: "flag", severity: "soft", reason: "r", ...o });

describe("buildSegments", () => {
  it("returns one plain segment with no marks", () => {
    expect(buildSegments("hello", [])).toEqual([{ text: "hello", start: 0, mark: null }]);
  });
  it("splits around a mark and tiles the text exactly", () => {
    const segs = buildSegments("abc def ghi", [m({ id: "a", start: 4, end: 7 })]);
    expect(segs.map((s) => s.text)).toEqual(["abc ", "def", " ghi"]);
    expect(segs[1].mark?.id).toBe("a");
    expect(segs.map((s) => s.text).join("")).toBe("abc def ghi");
  });
  it("resolves overlaps: hard beats soft, later mark clipped", () => {
    const segs = buildSegments("0123456789", [m({ id: "soft", start: 2, end: 6 }), m({ id: "hard", severity: "hard", start: 2, end: 4 })]);
    expect(segs.map((s) => [s.text, s.mark?.id ?? null])).toEqual([["01", null], ["23", "hard"], ["45", "soft"], ["6789", null]]);
  });
  it("drops out-of-range and empty marks", () => {
    expect(buildSegments("abc", [m({ start: 5, end: 9 }), m({ start: 1, end: 1 })])).toEqual([{ text: "abc", start: 0, mark: null }]);
  });
});

describe("marksFor", () => {
  it("collects flags and verified entries for one field", () => {
    const marks = marksFor({
      verdict: "Likely Scam", llm_status: "ok", llm_summary: null, checked_at: "",
      flags: [{ type: "domain_mismatch", severity: "hard", field: "sender", span_start: 1, span_end: 3, reason: "r" },
              { type: "misspelling", severity: "soft", field: "body", span_start: 0, span_end: 2, reason: "r" }],
      verified: [{ field: "body", span_start: 5, span_end: 6, note: "ok" }],
    }, "body");
    expect(marks.map((x) => [x.kind, x.severity])).toEqual([["flag", "soft"], ["verified", null]]);
  });
});
