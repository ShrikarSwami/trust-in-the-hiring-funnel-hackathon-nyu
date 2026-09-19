import { describe, it, expect } from "vitest";
import { loadCompanies, findClaimedCompany, domainMatches, emailDomain } from "../src/companies.js";

const companies = loadCompanies();
const req = (o: Partial<{ sender_name: string; sender_email: string; subject: string; body: string }>) =>
  ({ sender_name: "", sender_email: "x@y.com", subject: "", body: "", ...o });

describe("companies", () => {
  it("loads the data file", () => {
    expect(companies.find((c) => c.company === "Tesla")?.domains).toContain("tesla.com");
  });
  it("emailDomain lowercases the part after the last @", () => {
    expect(emailDomain("John.Pork@Gmail.COM")).toBe("gmail.com");
    expect(emailDomain("nope")).toBe("");
  });
  it("domainMatches exact and subdomains, not look-alikes", () => {
    expect(domainMatches("tesla.com", ["tesla.com"])).toBe(true);
    expect(domainMatches("mail.tesla.com", ["tesla.com"])).toBe(true);
    expect(domainMatches("tesla-careers.net", ["tesla.com"])).toBe(false);
    expect(domainMatches("faketesla.com", ["tesla.com"])).toBe(false);
  });
  it("finds a company in the display name", () => {
    expect(findClaimedCompany(req({ sender_name: "Jane Doe - Tesla Recruiting" }), companies)?.company).toBe("Tesla");
  });
  it("finds a company embedded in the email local part", () => {
    expect(findClaimedCompany(req({ sender_email: "johnpork.tesla@gmail.com" }), companies)?.company).toBe("Tesla");
  });
  it("finds a company in the subject", () => {
    expect(findClaimedCompany(req({ subject: "Your Amazon interview" }), companies)?.company).toBe("Amazon");
  });
  it("finds a company in the signature (end of body)", () => {
    const body = "Hi Sam,\n\nThanks for applying.\n\nBest,\nPriya\nTalent Team, Acme Robotics";
    expect(findClaimedCompany(req({ body }), companies)?.company).toBe("Acme Robotics");
  });
  it("respects word boundaries (metadata is not Meta)", () => {
    expect(findClaimedCompany(req({ subject: "metadata question" }), companies)).toBeNull();
  });
  it("falls back to the sender domain when no company is named", () => {
    expect(findClaimedCompany(req({ sender_email: "p@acmerobotics.example.com" }), companies)?.company).toBe("Acme Robotics");
  });
  it("returns null when nothing matches", () => {
    expect(findClaimedCompany(req({ subject: "hello" }), companies)).toBeNull();
  });
});
