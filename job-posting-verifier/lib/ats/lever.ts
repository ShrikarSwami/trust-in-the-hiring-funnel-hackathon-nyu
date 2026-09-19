import { getJson } from "./http";
import type { Role } from "./types";

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  categories?: { location?: string; team?: string; department?: string };
}

export async function fetchLever(company: string): Promise<Role[]> {
  try {
    const data = await getJson(`https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`);
    if (!Array.isArray(data)) return [];
    return (data as LeverPosting[]).map((p) => ({
      id: p.id,
      title: p.text ?? "",
      location: p.categories?.location ?? "",
      department: p.categories?.team ?? p.categories?.department ?? null,
      url: p.hostedUrl,
      provider: "lever" as const,
    }));
  } catch {
    return [];
  }
}
