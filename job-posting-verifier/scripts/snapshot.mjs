// Refreshes data/cache/{token}.json from the live Greenhouse plain /jobs list.
// Usage: node scripts/snapshot.mjs [token...]   (default: coinbase stripe airbnb)
import { mkdir, writeFile } from "node:fs/promises";

const tokens = process.argv.slice(2).length ? process.argv.slice(2) : ["coinbase", "stripe", "airbnb"];
await mkdir("data/cache", { recursive: true });
for (const token of tokens) {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`);
  if (!res.ok) {
    console.error(token, "HTTP", res.status);
    continue;
  }
  const { jobs } = await res.json();
  const roles = jobs.map((j) => ({
    id: String(j.id),
    title: j.title,
    location: j.location?.name ?? "",
    department: j.departments?.[0]?.name ?? null,
    url: j.absolute_url,
    provider: "greenhouse",
  }));
  const name = token[0].toUpperCase() + token.slice(1);
  await writeFile(
    `data/cache/${token}.json`,
    JSON.stringify({ company: name, provider: "greenhouse", token, roles, source: "cache", fetchedAt: new Date().toISOString() }),
  );
  console.log(token, roles.length, "roles");
}
