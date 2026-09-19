import { describe, it, expect } from "vitest";
import { scanEmail } from "../src/scan.js";
import { loadCompanies } from "../src/companies.js";
import type { LlmResult } from "../src/llm/client.js";

const companies = loadCompanies();
const now = () => new Date("2026-09-19T15:00:00Z");
const llm = (r: LlmResult) => async () => r;
const okEmpty = llm({ status: "ok", flags: [], summary: "Looks normal." });

describe("scanEmail", () => {
  it("legit Acme email → Legitimate with a verified sender", async () => {
    const r = await scanEmail({ sender_name: "Priya Shah", sender_email: "priya@acmerobotics.example.com", subject: "Interview availability", body: "Hi Sam,\n\nCould you share your availability next week?\n\nBest,\nPriya\nAcme Robotics" }, { companies, llm: okEmpty, now });
    expect(r.verdict).toBe("Legitimate");
    expect(r.verified).toHaveLength(1);
    expect(r.llm_status).toBe("ok");
    expect(r.llm_summary).toBe("Looks normal.");
    expect(r.checked_at).toBe("2026-09-19T15:00:00.000Z");
  });
  it("gmail claiming Tesla → Likely Scam", async () => {
    const r = await scanEmail({ sender_name: "John Pork", sender_email: "johnpork.tesla@gmail.com", subject: "Tesla offer", body: "Hello there." }, { companies, llm: okEmpty, now });
    expect(r.verdict).toBe("Likely Scam");
  });
  it("misspelling only → Suspicious; LLM unavailable is reported, not fatal", async () => {
    const r = await scanEmail({ sender_name: "Sam", sender_email: "sam@example.org", subject: "hi", body: "please recieve this" }, { companies, llm: llm({ status: "unavailable", flags: [], summary: null }), now });
    expect(r.verdict).toBe("Suspicious");
    expect(r.llm_status).toBe("unavailable");
  });
  it("merges LLM flags into the verdict", async () => {
    const r = await scanEmail({ sender_name: "Sam", sender_email: "sam@example.org", subject: "hi", body: "Act now." }, {
      companies, now,
      llm: llm({ status: "ok", summary: "x", flags: [{ type: "llm_tone", severity: "soft", field: "body", span_start: 0, span_end: 7, reason: "urgency" }] }),
    });
    expect(r.verdict).toBe("Suspicious");
    expect(r.flags.map((f) => f.type)).toContain("llm_tone");
  });
});
