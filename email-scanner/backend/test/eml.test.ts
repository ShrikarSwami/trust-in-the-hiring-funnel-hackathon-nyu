import { describe, it, expect } from "vitest";
import { buildEml } from "../src/seed/eml.js";

describe("buildEml", () => {
  it("produces RFC822 with custom From, Subject, Date, marker header and body", async () => {
    const raw = (await buildEml(
      { id: "scam-001", sender_name: "John Pork", sender_email: "johnpork.tesla@gmail.com", subject: "Offer", body: "Hello there" },
      { to: "slhj1208@outlook.com", date: new Date("2026-09-19T14:00:00Z") },
    )).toString("utf8");
    expect(raw).toMatch(/^From: "?John Pork"? <johnpork\.tesla@gmail\.com>$/m);
    expect(raw).toMatch(/^To: slhj1208@outlook\.com$/m);
    expect(raw).toMatch(/^Subject: Offer$/m);
    expect(raw).toMatch(/^Date: Sat, 19 Sep 2026 14:00:00 \+0000$/m);
    expect(raw).toMatch(/^X-Trust-Scanner-Synthetic: scam-001$/m);
    expect(raw).toMatch(/^Message-ID: <scam-001\.\d+@trust-scanner\.local>$/m);
    expect(raw).toContain("Hello there");
  });
});
