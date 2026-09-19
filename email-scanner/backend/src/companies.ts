import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ScanRequest } from "./types.js";

export interface KnownCompany { company: string; domains: string[] }

const DEFAULT_PATH = fileURLToPath(new URL("../../data/known-companies.json", import.meta.url));
const SIGNATURE_CHARS = 600;

export function loadCompanies(path = DEFAULT_PATH): KnownCompany[] {
  return JSON.parse(readFileSync(path, "utf8")) as KnownCompany[];
}

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).trim().toLowerCase();
}

export function domainMatches(domain: string, allowed: string[]): boolean {
  const d = domain.toLowerCase();
  return allowed.some((a) => d === a.toLowerCase() || d.endsWith("." + a.toLowerCase()));
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Earliest word-boundary mention of any company in `text`. */
function firstMention(text: string, companies: KnownCompany[]): KnownCompany | null {
  let best: { c: KnownCompany; idx: number } | null = null;
  for (const c of companies) {
    const m = new RegExp(`(^|[^a-z0-9])${escape(c.company)}(?=[^a-z0-9]|$)`, "i").exec(text);
    if (m && (!best || m.index < best.idx)) best = { c, idx: m.index };
  }
  return best?.c ?? null;
}

function inLocalPart(email: string, companies: KnownCompany[]): KnownCompany | null {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  for (const c of companies) {
    const compact = c.company.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (compact.length >= 4 && local.includes(compact)) return c;
  }
  return firstMention(local.replace(/[._+-]/g, " "), companies);
}

/** Priority: display name → email local part → subject → signature → sender domain. */
export function findClaimedCompany(req: ScanRequest, companies: KnownCompany[]): KnownCompany | null {
  return (
    firstMention(req.sender_name, companies) ??
    inLocalPart(req.sender_email, companies) ??
    firstMention(req.subject, companies) ??
    firstMention(req.body.slice(-SIGNATURE_CHARS), companies) ??
    companies.find((c) => domainMatches(emailDomain(req.sender_email), c.domains)) ??
    null
  );
}
