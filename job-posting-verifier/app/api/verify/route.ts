import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { resolveCompany } from "@/lib/ats";
import { matchPosting, type ClaimedPosting } from "@/lib/match";

export const dynamic = "force-dynamic";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

async function loadClaimed(company: string): Promise<ClaimedPosting[]> {
  try {
    const raw = await readFile(path.join(process.cwd(), "data", "claimed-postings.json"), "utf8");
    const all = JSON.parse(raw) as ClaimedPosting[];
    return all.filter((p) => norm(p.claimed_company) === norm(company));
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const company = new URL(req.url).searchParams.get("company")?.trim() ?? "";
  if (!company) return NextResponse.json({ error: "company is required" }, { status: 400 });

  const resolved = await resolveCompany(company);
  if (!resolved) {
    return NextResponse.json({ error: `No public ATS board found for "${company}"` }, { status: 404 });
  }
  const claimed = await loadClaimed(company);
  const results = claimed.map((posting) => ({ posting, match: matchPosting(posting, resolved.roles) }));
  return NextResponse.json({
    company: resolved.company,
    provider: resolved.provider,
    token: resolved.token,
    source: resolved.source,
    fetchedAt: resolved.fetchedAt,
    roles: resolved.roles,
    results,
  });
}
