// Matcher self-test: every real role must verify against its own ATS list.
import { readFileSync } from "node:fs";
import { matchPosting, type ClaimedPosting } from "../lib/match.ts";

const snap = JSON.parse(readFileSync("data/cache/coinbase.json", "utf8"));
const mk = (title: string, location: string): ClaimedPosting => ({
  id: "t", claimed_company: "Coinbase", title, location, source: "t", source_url: "", contact_domain: null,
  collected_at: "", origin: "fabricated",
});
let bad = 0;
for (const r of snap.roles) {
  const m = matchPosting(mk(r.title, r.location), snap.roles);
  if (m.status !== "verified") { bad++; console.log("SELF-FAIL", r.title, r.location, m.status); }
}
console.log("self-match failures:", bad, "/", snap.roles.length);
// Perturbations: none of these may come back no_such_req (real job, sloppy copy).
const perturb: [string, string][] = [
  ["Senior Credit Risk Analyst", "Remote, US"],
  ["credit risk analyst!!", "Remote - USA"],
  ["Credit Risk Analyst", "United States"],
  ["Credit Risk Analst", "Remote - USA"],
  ["Chief of Staff", "Remote"],
  ["Sr. Counsel, Commercial", "Remote - USA"],
];
for (const [t, l] of perturb) console.log(matchPosting(mk(t, l), snap.roles).status, "|", t, "|", l);
// Should be no_such_req:
for (const [t, l] of [["Crypto Support Associate (Work From Home, $85/hr)", "Remote"], ["Blockchain Payments Coordinator", "Remote - USA"]]) {
  const m = matchPosting(mk(t, l), snap.roles);
  console.log(m.status, "|", t, "| best", m.titleScore.toFixed(2), m.closestRole?.title);
}
