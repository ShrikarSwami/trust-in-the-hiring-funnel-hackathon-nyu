import type { KnownCompany } from "./companies.js";
import type { LlmResult } from "./llm/client.js";
import { checkSenderDomain } from "./rules/domain.js";
import { checkSpelling } from "./rules/spell.js";
import type { ScanRequest, ScanResult } from "./types.js";
import { computeVerdict, sortFlags } from "./verdict.js";

export interface ScanDeps {
  companies: KnownCompany[];
  llm: (req: ScanRequest) => Promise<LlmResult>;
  now?: () => Date;
}

export async function scanEmail(req: ScanRequest, deps: ScanDeps): Promise<ScanResult> {
  const llmPromise = deps.llm(req); // start the slow call first; rules run while it's in flight
  const companyWords = deps.companies.flatMap((c) => c.company.toLowerCase().split(/\s+/));
  const domain = checkSenderDomain(req, deps.companies);
  const spelling = [...checkSpelling(req.subject, "subject", companyWords), ...checkSpelling(req.body, "body", companyWords)];
  const llm = await llmPromise;

  const flags = sortFlags([...domain.flags, ...spelling, ...llm.flags]);
  return {
    verdict: computeVerdict(flags),
    flags,
    verified: domain.verified,
    llm_status: llm.status,
    llm_summary: llm.summary,
    checked_at: (deps.now ?? (() => new Date()))().toISOString(),
  };
}
