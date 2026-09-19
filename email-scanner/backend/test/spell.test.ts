import { describe, it, expect } from "vitest";
import { checkSpelling } from "../src/rules/spell.js";

describe("checkSpelling", () => {
  it("flags misspellings with exact offsets", () => {
    const text = "Please recieve the ofer letter today.";
    const flags = checkSpelling(text, "body");
    const words = flags.map((f) => text.slice(f.span_start, f.span_end));
    expect(words).toEqual(["recieve", "ofer"]);
    expect(flags[0]).toMatchObject({ type: "misspelling", severity: "soft", field: "body" });
    expect(flags[0].reason).toMatch(/recieve/);
  });
  it("ignores capitalized words, URLs, emails, digits and short words", () => {
    const text = "Contact Xyzzor at hr@qwrtpx.com or https://qwrtpx.com/aplly with code ab12cd ok";
    expect(checkSpelling(text, "body")).toEqual([]);
  });
  it("respects the allowlist file and extra allowed words", () => {
    expect(checkSpelling("your onboarding starts monday", "body")).toEqual([]);
    expect(checkSpelling("welcome to brightline", "body", ["brightline"])).toEqual([]);
  });
  it("handles possessives and curly apostrophes", () => {
    expect(checkSpelling("the team’s schedule and company's policy", "body")).toEqual([]);
  });
  it("returns no flags for clean text", () => {
    expect(checkSpelling("We would like to schedule an interview next week.", "body")).toEqual([]);
  });
});
