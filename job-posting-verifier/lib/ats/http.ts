/** Unauthenticated GET with a 5s timeout. Returns parsed JSON or null; never throws. */
export async function getJson(url: string, timeoutMs = 5000): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
