import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadCompanies } from "../src/companies.js";
import { loadConfig } from "../src/config.js";
import { runLlmCheck } from "../src/llm/client.js";
import { scanEmail } from "../src/scan.js";
import type { ScanRequest, Verdict } from "../src/types.js";

interface SyntheticEmail {
  id: string;
  label: "legit" | "scam";
  sender_name: string;
  sender_email: string;
  claimed_company: string;
  subject: string;
  body: string;
  injected_flaws: string[];
}

const dataPath = fileURLToPath(new URL("../../data/synthetic-emails.json", import.meta.url));
const emails: SyntheticEmail[] = JSON.parse(readFileSync(dataPath, "utf8"));

const cfg = loadConfig();
const companies = loadCompanies();

function isAcceptable(label: "legit" | "scam", verdict: Verdict): boolean {
  if (label === "legit") return verdict === "Legitimate";
  return verdict === "Suspicious" || verdict === "Likely Scam";
}

let pass = 0;
let fail = 0;
const failures: { id: string; label: string; verdict: Verdict; flags: string[] }[] = [];

console.log(`Calibrating ${emails.length} synthetic emails against ${cfg.ollamaModel} @ ${cfg.ollamaBaseUrl} (llmEnabled=${cfg.llmEnabled})\n`);

for (const email of emails) {
  const req: ScanRequest = {
    sender_name: email.sender_name,
    sender_email: email.sender_email,
    subject: email.subject,
    body: email.body,
  };
  const t0 = Date.now();
  const result = await scanEmail(req, {
    companies,
    llm: cfg.llmEnabled ? (r) => runLlmCheck(r, cfg) : async () => ({ status: "disabled" as const, flags: [], summary: null }),
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const ok = isAcceptable(email.label, result.verdict);
  ok ? pass++ : fail++;
  const flagSummary = result.flags.map((f) => f.type).join(",") || "none";
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${email.id.padEnd(10)} expected=${email.label.padEnd(6)} got=${result.verdict.padEnd(12)} flags=[${flagSummary}] llm=${result.llm_status} (${elapsed}s)`,
  );
  if (!ok) failures.push({ id: email.id, label: email.label, verdict: result.verdict, flags: result.flags.map((f) => `${f.type}:${f.reason}`) });
}

console.log(`\n${pass}/${emails.length} passed, ${fail} failed`);
if (failures.length > 0) {
  console.log("\nFailures (tune the LLM prompt wording or spell-allowlist, not the verdict rule):");
  for (const f of failures) {
    console.log(`  ${f.id} (expected ${f.label}, got ${f.verdict})`);
    for (const flag of f.flags) console.log(`    - ${flag}`);
  }
}

process.exit(fail === 0 ? 0 : 1);
