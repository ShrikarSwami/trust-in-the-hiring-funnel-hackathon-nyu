import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ImapFlow } from "imapflow";
import { buildEml } from "../src/seed/eml.js";

interface SyntheticEmail { id: string; sender_name: string; sender_email: string; subject: string; body: string }

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const clear = args.includes("--clear");
const only = args.find((a) => a.startsWith("--only="))?.slice(7);
const user = process.env.IMAP_USER ?? "slhj1208@outlook.com";

const emails = (
  JSON.parse(readFileSync(fileURLToPath(new URL("../../data/synthetic-emails.json", import.meta.url)), "utf8")) as SyntheticEmail[]
).filter((e) => !only || e.id === only);

// Stagger dates so the inbox looks natural: newest first, ~40 min apart.
const now = Date.now();
const built = await Promise.all(
  emails.map(async (e, i) => {
    const date = new Date(now - i * 40 * 60_000);
    return { e, date, raw: await buildEml(e, { to: user, date }) };
  }),
);

if (dryRun) {
  const out = fileURLToPath(new URL("../out/", import.meta.url));
  mkdirSync(out, { recursive: true });
  for (const b of built) writeFileSync(`${out}${b.e.id}.eml`, b.raw);
  console.log(`wrote ${built.length} .eml files to ${out}`);
  process.exit(0);
}

const auth = process.env.IMAP_ACCESS_TOKEN
  ? { user, accessToken: process.env.IMAP_ACCESS_TOKEN }
  : { user, pass: process.env.IMAP_PASSWORD ?? "" };
const client = new ImapFlow({ host: "outlook.office365.com", port: 993, secure: true, auth, logger: false });
await client.connect();
const lock = await client.getMailboxLock("INBOX");
try {
  if (clear) {
    const uids = await client.search({ header: { "x-trust-scanner-synthetic": "" } }, { uid: true });
    if (uids && uids.length) await client.messageDelete(uids, { uid: true });
    console.log(`cleared ${uids ? uids.length : 0} previously seeded messages`);
  }
  for (const b of built) {
    await client.append("INBOX", b.raw, [], b.date); // no \Seen flag → shows as unread
    console.log(`appended ${b.e.id}`);
  }
} finally {
  lock.release();
  await client.logout();
}
