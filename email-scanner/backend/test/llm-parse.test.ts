import { describe, it, expect } from "vitest";
import { parseLlmJson, locateSpan, findingsToFlags } from "../src/llm/parse.js";

describe("parseLlmJson", () => {
  it("parses clean JSON", () => {
    const r = parseLlmJson('{"findings":[{"quoted_span":"send your SSN","reason":"asks for SSN","category":"plausibility"}],"overall":"Scam."}');
    expect(r?.findings[0].category).toBe("plausibility");
    expect(r?.overall).toBe("Scam.");
  });
  it("extracts JSON from code fences / surrounding prose", () => {
    expect(parseLlmJson('Sure!\n```json\n{"findings":[],"overall":"Looks fine."}\n```')?.overall).toBe("Looks fine.");
  });
  it("defaults a missing/unknown category to tone and tolerates 'flags' key", () => {
    const r = parseLlmJson('{"flags":[{"quoted_span":"act now","reason":"urgency","category":"weird"}],"overall":"x"}');
    expect(r?.findings[0].category).toBe("tone");
  });
  it("returns null for garbage", () => {
    expect(parseLlmJson("I cannot help with that")).toBeNull();
  });
});

describe("locateSpan", () => {
  const body = "Dear Applicant,\n\nYou must   reply within 24 hours to “secure your position”.";
  it("finds exact substrings", () => {
    const s = locateSpan(body, "Dear Applicant")!;
    expect(body.slice(s.start, s.end)).toBe("Dear Applicant");
  });
  it("finds quotes with different whitespace, case and curly quotes", () => {
    const s = locateSpan(body, 'you must reply within 24 hours to "secure')!;
    expect(body.slice(s.start, s.end)).toBe("You must   reply within 24 hours to “secure");
  });
  it("strips wrapping quotes and ellipses from the model's quote", () => {
    const s = locateSpan(body, '"...reply within 24 hours..."')!;
    expect(body.slice(s.start, s.end)).toBe("reply within 24 hours");
  });
  it("returns null when absent or too short", () => {
    expect(locateSpan(body, "wire transfer")).toBeNull();
    expect(locateSpan(body, "to")).toBeNull();
  });
});

describe("findingsToFlags", () => {
  const req = { sender_name: "", sender_email: "a@b.com", subject: "URGENT: offer expires today", body: "Send your bank details now." };
  it("maps categories to flag types, finds spans in body or subject, drops unlocated", () => {
    const flags = findingsToFlags(req, [
      { quoted_span: "Send your bank details", reason: "financial info", category: "plausibility" },
      { quoted_span: "offer expires today", reason: "urgency", category: "tone" },
      { quoted_span: "not in the email", reason: "x", category: "tone" },
    ]);
    expect(flags).toHaveLength(2);
    expect(flags[0]).toMatchObject({ type: "llm_plausibility", severity: "soft", field: "body", span_start: 0, span_end: 22 });
    expect(flags[1]).toMatchObject({ type: "llm_tone", field: "subject" });
  });

  it("replaces a reason that just echoes the category, is empty, or is too short with a default explanation", () => {
    const flags = findingsToFlags(req, [
      { quoted_span: "Send your bank details", reason: "plausibility", category: "plausibility" },
      { quoted_span: "offer expires today", reason: "  Tone  ", category: "tone" },
      { quoted_span: "Send your bank details", reason: "", category: "plausibility" },
      { quoted_span: "offer expires today", reason: "urgent", category: "tone" },
    ]);
    expect(flags[0].reason).toBe("A claim or request a real employer would not make at this stage.");
    expect(flags[1].reason).toBe("Pressure, urgency, or unprofessional wording common in recruiting scams.");
    expect(flags[2].reason).toBe("A claim or request a real employer would not make at this stage.");
    expect(flags[3].reason).toBe("Pressure, urgency, or unprofessional wording common in recruiting scams.");
  });

  it("keeps a genuine explanatory reason unchanged", () => {
    const flags = findingsToFlags(req, [
      { quoted_span: "Send your bank details", reason: "Real employers do not ask for bank details before an offer.", category: "plausibility" },
    ]);
    expect(flags[0].reason).toBe("Real employers do not ask for bank details before an offer.");
  });
});
