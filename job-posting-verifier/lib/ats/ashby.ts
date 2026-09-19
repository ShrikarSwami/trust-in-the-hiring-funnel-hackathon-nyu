import { getJson } from "./http";
import type { Role } from "./types";

interface AshbyJob {
  id: string;
  title: string;
  location?: string;
  department?: string;
  jobUrl: string;
  isListed?: boolean;
}

/** Public Ashby posting API: GET api.ashbyhq.com/posting-api/job-board/{name}. Keyless. */
export async function fetchAshby(name: string): Promise<Role[]> {
  try {
    const data = (await getJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(name)}`)) as {
      jobs?: AshbyJob[];
    } | null;
    if (!data || !Array.isArray(data.jobs)) return [];
    return data.jobs
      .filter((j) => j.isListed !== false)
      .map((j) => ({
        id: j.id,
        title: j.title ?? "",
        location: j.location ?? "",
        department: j.department ?? null,
        url: j.jobUrl,
        provider: "ashby" as const,
      }));
  } catch {
    return [];
  }
}
