import { domainMatches, emailDomain, findClaimedCompany, type KnownCompany } from "../companies.js";
import { senderLine, type Flag, type ScanRequest, type Verified } from "../types.js";

const FREEMAIL = new Set(["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "proton.me", "protonmail.com", "aol.com"]);

export function checkSenderDomain(req: ScanRequest, companies: KnownCompany[]): { flags: Flag[]; verified: Verified[] } {
  const claimed = findClaimedCompany(req, companies);
  const domain = emailDomain(req.sender_email);
  if (!claimed || !domain) return { flags: [], verified: [] };

  const line = senderLine(req);
  const span_start = line.lastIndexOf("@") + 1;
  const span_end = span_start + domain.length;

  if (domainMatches(domain, claimed.domains)) {
    return {
      flags: [],
      verified: [{ field: "sender", span_start, span_end, note: `Sender domain matches ${claimed.company}'s official domain.` }],
    };
  }
  const why = FREEMAIL.has(domain) ? "a personal email provider" : "a domain the company does not use";
  return {
    flags: [{
      type: "domain_mismatch", severity: "hard", field: "sender", span_start, span_end,
      reason: `Claims to be from ${claimed.company}, but was sent from ${domain} (${why}). Real ${claimed.company} email comes from ${claimed.domains.join(", ")}.`,
    }],
    verified: [],
  };
}
