import { readFile } from "node:fs/promises";
import path from "node:path";
import { fetchAshby } from "./ashby";
import { fetchGreenhouse } from "./greenhouse";
import { fetchLever } from "./lever";
import type { CompanyRoles, Provider, Role } from "./types";

export * from "./types";

const FETCHERS: Record<Provider, (token: string) => Promise<Role[]>> = {
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  ashby: fetchAshby,
};
const ORDER: Provider[] = ["greenhouse", "lever", "ashby"];

/** Candidate board tokens for a display name: "Coinbase Inc." -> coinbase, coinbase-inc, coinbaseinc */
export function tokenCandidates(name: string): string[] {
  const base = name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9\s-]/g, "").trim();
  const noSuffix = base.replace(/\b(inc|llc|ltd|corp|corporation|co|company)\b/g, "").trim();
  const out = [noSuffix.replace(/[\s-]+/g, ""), noSuffix.replace(/\s+/g, "-"), base.replace(/[\s-]+/g, "")];
  return [...new Set(out.filter(Boolean))];
}

const memo = new Map<string, { at: number; value: CompanyRoles }>();
const TTL_MS = 5 * 60_000;

async function readSnapshot(slug: string): Promise<CompanyRoles | null> {
  try {
    const raw = await readFile(path.join(process.cwd(), "data", "cache", `${slug}.json`), "utf8");
    const snap = JSON.parse(raw) as CompanyRoles;
    return { ...snap, source: "cache" };
  } catch {
    return null;
  }
}

/**
 * Tries each provider (and each token candidate) until one returns roles.
 * Falls back to the committed snapshot in data/cache/ if every live fetch fails.
 * Never throws; returns null only if nothing at all is available.
 */
export async function resolveCompany(name: string): Promise<CompanyRoles | null> {
  try {
    const key = name.trim().toLowerCase();
    if (!key) return null;
    const hit = memo.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

    const tokens = tokenCandidates(name);
    for (const token of tokens) {
      for (const provider of ORDER) {
        const roles = await FETCHERS[provider](token);
        if (roles.length > 0) {
          const value: CompanyRoles = {
            company: name.trim(),
            provider,
            token,
            roles,
            source: "live",
            fetchedAt: new Date().toISOString(),
          };
          memo.set(key, { at: Date.now(), value });
          return value;
        }
      }
    }
    for (const token of tokens) {
      const snap = await readSnapshot(token);
      if (snap) return snap;
    }
    return null;
  } catch {
    return null;
  }
}
