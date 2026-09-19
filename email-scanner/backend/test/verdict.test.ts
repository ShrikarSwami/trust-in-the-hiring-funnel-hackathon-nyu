import { describe, it, expect } from "vitest";
import { computeVerdict, sortFlags } from "../src/verdict.js";
import type { Flag } from "../src/types.js";

const f = (o: Partial<Flag>): Flag => ({ type: "misspelling", severity: "soft", field: "body", span_start: 0, span_end: 1, reason: "r", ...o });

describe("computeVerdict", () => {
  it("no flags → Legitimate", () => expect(computeVerdict([])).toBe("Legitimate"));
  it("only soft → Suspicious", () => expect(computeVerdict([f({}), f({ type: "llm_tone" })])).toBe("Suspicious"));
  it("any hard → Likely Scam", () =>
    expect(computeVerdict([f({}), f({ type: "domain_mismatch", severity: "hard", field: "sender" })])).toBe("Likely Scam"));
});

describe("sortFlags", () => {
  it("orders by field then offset", () => {
    const out = sortFlags([f({ field: "body", span_start: 5 }), f({ field: "sender" }), f({ field: "body", span_start: 1 }), f({ field: "subject" })]);
    expect(out.map((x) => `${x.field}:${x.span_start}`)).toEqual(["sender:0", "subject:0", "body:1", "body:5"]);
  });
});
