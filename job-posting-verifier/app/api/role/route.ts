import { NextResponse } from "next/server";
import { fetchGreenhouseJobContent } from "@/lib/ats/greenhouse";

export const dynamic = "force-dynamic";

function htmlToText(html: string): string {
  // Greenhouse returns entity-escaped HTML; unescape first, then strip tags.
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<\/(p|li|h\d|div|br)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Single-job content, fetched only when a case file is opened. Greenhouse only for now. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const token = sp.get("token");
  const id = sp.get("id");
  if (!token || !id) return NextResponse.json({ error: "token and id required" }, { status: 400 });
  const job = await fetchGreenhouseJobContent(token, id);
  if (!job) return NextResponse.json({ error: "unavailable" }, { status: 404 });
  return NextResponse.json({ title: job.title, text: htmlToText(job.contentHtml).slice(0, 1500) });
}
