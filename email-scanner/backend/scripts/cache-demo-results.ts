import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadCompanies } from "../src/companies.js";
import { loadConfig } from "../src/config.js";
import { runLlmCheck } from "../src/llm/client.js";
import { scanEmail } from "../src/scan.js";
import type { ScanRequest, ScanResult } from "../src/types.js";

interface SyntheticEmail { id: string; sender_name: string; sender_email: string; subject: string; body: string }

const dataPath = fileURLToPath(new URL("../../data/synthetic-emails.json", import.meta.url));
const emails: SyntheticEmail[] = JSON.parse(readFileSync(dataPath, "utf8"));
const outPath = fileURLToPath(new URL("../../addin/src/demo/scan-cache.json", import.meta.url));

const cfg = loadConfig();
const companies = loadCompanies();

const cache: Record<string, ScanResult> = {};
for (const email of emails) {
  const req: ScanRequest = { sender_name: email.sender_name, sender_email: email.sender_email, subject: email.subject, body: email.body };
  const t0 = Date.now();
  const result = await scanEmail(req, {
    companies,
    llm: cfg.llmEnabled ? (r) => runLlmCheck(r, cfg) : async () => ({ status: "disabled" as const, flags: [], summary: null }),
  });
  cache[email.id] = result;
  console.log(`${email.id}: ${result.verdict} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

writeFileSync(outPath, JSON.stringify(cache, null, 2) + "\n");
console.log(`\nWrote ${Object.keys(cache).length} cached results to ${outPath}`);
