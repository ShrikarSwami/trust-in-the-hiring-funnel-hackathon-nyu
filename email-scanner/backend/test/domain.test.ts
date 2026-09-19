import { describe, it, expect } from "vitest";
import { checkSenderDomain } from "../src/rules/domain.js";
import { loadCompanies } from "../src/companies.js";
import { senderLine } from "../src/types.js";

const companies = loadCompanies();
const base = { subject: "Opportunity", body: "Hello" };

describe("checkSenderDomain", () => {
  it("hard-flags a gmail address claiming to be Tesla, spanning the domain", () => {
    const req = { ...base, sender_name: "John Pork", sender_email: "johnpork.tesla@gmail.com" };
    const { flags, verified } = checkSenderDomain(req, companies);
    expect(verified).toEqual([]);
    expect(flags).toHaveLength(1);
    const f = flags[0];
    expect(f).toMatchObject({ type: "domain_mismatch", severity: "hard", field: "sender" });
    expect(senderLine(req).slice(f.span_start, f.span_end)).toBe("gmail.com");
    expect(f.reason).toContain("Tesla");
    expect(f.reason).toContain("tesla.com");
  });
  it("hard-flags a look-alike domain", () => {
    const req = { ...base, sender_name: "Tesla Careers", sender_email: "hr@tesla-careers.net" };
    expect(checkSenderDomain(req, companies).flags[0]?.type).toBe("domain_mismatch");
  });
  it("marks a matching domain as verified (green)", () => {
    const req = { ...base, sender_name: "Priya Shah | Acme Robotics", sender_email: "priya@acmerobotics.example.com" };
    const { flags, verified } = checkSenderDomain(req, companies);
    expect(flags).toEqual([]);
    expect(verified).toHaveLength(1);
    expect(senderLine(req).slice(verified[0].span_start, verified[0].span_end)).toBe("acmerobotics.example.com");
    expect(verified[0].field).toBe("sender");
  });
  it("does nothing when no known company is claimed", () => {
    const req = { ...base, sender_name: "Sam", sender_email: "sam@gmail.com" };
    expect(checkSenderDomain(req, companies)).toEqual({ flags: [], verified: [] });
  });
});
