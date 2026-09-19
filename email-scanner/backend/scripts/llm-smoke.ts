import "dotenv/config";
import { loadConfig } from "../src/config.js";
import { runLlmCheck } from "../src/llm/client.js";

const cfg = loadConfig();
const req = {
  sender_name: "John Pork - Tesla Recruiting",
  sender_email: "johnpork.tesla@gmail.com",
  subject: "URGENT: Remote position offer - respond today",
  body: "Dear Applicant,\n\nCongratulations! You have been selected for a remote data entry role at $45/hr with no interview required. To secure your position, reply within 24 hours with your SSN and bank account details for direct deposit setup.\n\nRegards,\nJohn Pork\nTesla HR",
};
const t0 = Date.now();
const r = await runLlmCheck(req, cfg);
console.log(JSON.stringify(r, null, 2));
console.log(`${cfg.ollamaModel} @ ${cfg.ollamaBaseUrl}: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exit(r.status === "ok" ? 0 : 1);
