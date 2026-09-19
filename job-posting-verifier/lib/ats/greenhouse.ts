import { getJson } from "./http";
import type { Role } from "./types";

const BASE = "https://boards-api.greenhouse.io/v1/boards";

interface GhJob {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  departments?: { name?: string }[];
}

/** Plain list only (no ?content=true — too large). */
export async function fetchGreenhouse(token: string): Promise<Role[]> {
  try {
    const data = (await getJson(`${BASE}/${encodeURIComponent(token)}/jobs`)) as { jobs?: GhJob[] } | null;
    if (!data || !Array.isArray(data.jobs)) return [];
    return data.jobs.map((j) => ({
      id: String(j.id),
      title: j.title ?? "",
      location: j.location?.name ?? "",
      department: j.departments?.[0]?.name ?? null,
      url: j.absolute_url,
      provider: "greenhouse" as const,
    }));
  } catch {
    return [];
  }
}

/** Single-job endpoint WITH content. Only called when a case file is opened. */
export async function fetchGreenhouseJobContent(
  token: string,
  id: string,
): Promise<{ title: string; contentHtml: string } | null> {
  try {
    const j = (await getJson(`${BASE}/${encodeURIComponent(token)}/jobs/${encodeURIComponent(id)}`)) as {
      title?: string;
      content?: string;
    } | null;
    if (!j) return null;
    return { title: j.title ?? "", contentHtml: j.content ?? "" };
  } catch {
    return null;
  }
}
