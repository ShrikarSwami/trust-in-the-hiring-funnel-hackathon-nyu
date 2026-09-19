import type { Role } from "./ats/types";

export interface ClaimedPosting {
  id: string;
  claimed_company: string;
  title: string;
  location: string;
  source: string;
  source_url: string;
  contact_domain: string | null;
  collected_at: string;
  origin: "real" | "fabricated";
}

export type Status = "verified" | "unverified" | "no_such_req";

export interface MatchResult {
  status: Status;
  matchedRole?: Role;
  /** 0..1. For verified/unverified: confidence the posting is a real req. For no_such_req: confidence it is not. */
  confidence: number;
  /** Closest real role even when it is not a match, for the case file. */
  closestRole?: Role;
  titleScore: number;
  locationOk: boolean;
}

// Thresholds. Deliberately conservative: 'no_such_req' requires that NOTHING
// in the ATS is even loosely similar in title. Anything in between is 'unverified'.
export const VERIFIED_TITLE = 0.85;
export const UNVERIFIED_TITLE = 0.55;

const SENIORITY = new Set([
  "senior", "sr", "staff", "principal", "junior", "jr", "lead", "associate", "entry", "level",
  "i", "ii", "iii", "iv", "v", "1", "2", "3", "4", "5",
]);
const STOP = new Set(["and", "the", "of", "a", "an", "for", "at", "in", "to"]);

export function normalizeTitle(title: string): string {
  const tokens = title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !SENIORITY.has(t) && !STOP.has(t));
  return tokens.join(" ");
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  const t = s.replace(/\s+/g, " ");
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

function bigramDice(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  let total = 0;
  for (const [, n] of A) total += n;
  for (const [, n] of B) total += n;
  for (const [g, n] of A) inter += Math.min(n, B.get(g) ?? 0);
  return total === 0 ? 0 : (2 * inter) / total;
}

function tokenDice(a: string, b: string): number {
  const A = new Set(a.split(" ").filter(Boolean));
  const B = new Set(b.split(" ").filter(Boolean));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return (2 * inter) / (A.size + B.size);
}

export function titleSimilarity(claimed: string, real: string): number {
  const a = normalizeTitle(claimed);
  const b = normalizeTitle(real);
  if (!a || !b) return 0;
  // Bigram dice forgives typos; token dice forgives word order. Take the better.
  return Math.max(bigramDice(a, b), tokenDice(a, b));
}

const LOC_NOISE = new Set(["remote", "hybrid", "onsite", "on", "site", "the", "and", "or"]);
const REGION_ALIASES: Record<string, string> = {
  us: "usa", united: "usa", states: "usa", america: "usa", uk: "uk", britain: "uk", england: "uk",
  ny: "new york", nyc: "new york", sf: "san francisco",
};

function locTokens(loc: string): Set<string> {
  const out = new Set<string>();
  for (const raw of loc.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean)) {
    if (LOC_NOISE.has(raw)) continue;
    out.add(REGION_ALIASES[raw] ?? raw);
  }
  return out;
}

/** Lenient on purpose: empty on either side, shared token, or a remote claim all pass. */
export function locationCompatible(claimed: string, real: string): boolean {
  if (!claimed.trim() || !real.trim()) return true;
  const a = locTokens(claimed);
  const b = locTokens(real);
  if (a.size === 0 || b.size === 0) return true; // e.g. plain "Remote"
  for (const t of a) if (b.has(t)) return true;
  return false;
}

export function matchPosting(claimed: ClaimedPosting, roles: Role[]): MatchResult {
  // No authoritative list => we cannot say "no such req". Never accuse without data.
  if (roles.length === 0) {
    return { status: "unverified", confidence: 0, titleScore: 0, locationOk: false };
  }

  let bestTitleOnly: { role: Role; score: number } | null = null;
  let bestFull: { role: Role; score: number } | null = null;
  for (const role of roles) {
    const score = titleSimilarity(claimed.title, role.title);
    if (!bestTitleOnly || score > bestTitleOnly.score) bestTitleOnly = { role, score };
    if (locationCompatible(claimed.location, role.location) && (!bestFull || score > bestFull.score)) {
      bestFull = { role, score };
    }
  }
  const top = bestTitleOnly!;

  if (bestFull && bestFull.score >= VERIFIED_TITLE) {
    return {
      status: "verified",
      matchedRole: bestFull.role,
      closestRole: bestFull.role,
      confidence: bestFull.score,
      titleScore: bestFull.score,
      locationOk: true,
    };
  }
  if (top.score >= UNVERIFIED_TITLE) {
    // Similar title exists but location differs or title only loosely matches.
    return {
      status: "unverified",
      closestRole: top.role,
      confidence: top.score,
      titleScore: top.score,
      locationOk: bestFull?.role === top.role,
    };
  }
  return {
    status: "no_such_req",
    closestRole: top.score > 0.3 ? top.role : undefined,
    confidence: 1 - top.score,
    titleScore: top.score,
    locationOk: false,
  };
}
