import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import nspell from "nspell";
import dictionary from "dictionary-en";
import type { Flag } from "../types.js";

const ALLOWLIST_PATH = fileURLToPath(new URL("../../../data/spell-allowlist.txt", import.meta.url));
const MAX_FLAGS = 12;
const MAX_SUGGESTIONS = 5;

let speller: ReturnType<typeof nspell> | null = null;
let allow: Set<string> | null = null;

function init() {
  if (!speller) speller = nspell(Buffer.from(dictionary.aff), Buffer.from(dictionary.dic));
  if (!allow) {
    allow = new Set(readFileSync(ALLOWLIST_PATH, "utf8").split(/\r?\n/).map((w) => w.trim().toLowerCase()).filter(Boolean));
  }
  return { speller, allow };
}

const SKIP_RANGES = /\b(?:https?:\/\/|www\.)\S+|\S+@\S+/g;
const WORD = /[A-Za-z0-9][A-Za-z0-9'’-]*[A-Za-z0-9]|[A-Za-z]/g;

export function checkSpelling(text: string, field: "subject" | "body", extraAllowed: string[] = []): Flag[] {
  const { speller, allow } = init();
  const extra = new Set(extraAllowed.map((w) => w.toLowerCase()));
  const skips: [number, number][] = [...text.matchAll(SKIP_RANGES)].map((m) => [m.index!, m.index! + m[0].length]);
  const flags: Flag[] = [];

  for (const m of text.matchAll(WORD)) {
    if (flags.length >= MAX_FLAGS) break;
    const start = m.index!;
    let word = m[0].replace(/’/g, "'");
    if (skips.some(([a, b]) => start < b && start + word.length > a)) continue;
    if (/[0-9]/.test(word) || /^[A-Z]/.test(word)) continue;
    word = word.replace(/'s$/i, "").replace(/-+$/, "");
    if (word.length < 3) continue;
    const lower = word.toLowerCase();
    if (allow.has(lower) || extra.has(lower)) continue;
    if (speller.correct(word) || speller.correct(lower)) continue;
    if (word.includes("-") && word.split("-").every((p) => p.length < 3 || speller.correct(p))) continue;

    const suggestion = flags.length < MAX_SUGGESTIONS ? speller.suggest(lower)[0] : undefined;
    flags.push({
      type: "misspelling", severity: "soft", field,
      span_start: start, span_end: start + word.length,
      reason: suggestion ? `Possible misspelling: "${word}" (did you mean "${suggestion}"?)` : `Possible misspelling: "${word}"`,
    });
  }
  return flags;
}
