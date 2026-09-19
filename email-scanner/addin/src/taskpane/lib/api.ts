import type { ScanRequest, ScanResult } from "../types";

export async function scanEmail(req: ScanRequest): Promise<ScanResult> {
  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal: AbortSignal.timeout(150_000),
  });
  if (!res.ok) throw new Error(`Scan failed (HTTP ${res.status}). Check that the scanner is running, then retry.`);
  return (await res.json()) as ScanResult;
}
