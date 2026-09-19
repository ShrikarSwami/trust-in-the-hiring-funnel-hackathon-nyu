import type { Config } from "../config.js";
import type { Flag, LlmStatus, ScanRequest } from "../types.js";
import { RESPONSE_SCHEMA, SYSTEM_PROMPT, buildUserPrompt } from "./prompt.js";
import { findingsToFlags, parseLlmJson } from "./parse.js";

export interface LlmResult { status: LlmStatus; flags: Flag[]; summary: string | null }
export type FetchLike = typeof fetch;

const UNAVAILABLE: LlmResult = { status: "unavailable", flags: [], summary: null };
const MAX_ATTEMPTS = 2;

async function chatOnce(req: ScanRequest, cfg: Config, fetchImpl: FetchLike): Promise<string> {
  const res = await fetchImpl(`${cfg.ollamaBaseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(cfg.llmTimeoutMs),
    body: JSON.stringify({
      model: cfg.ollamaModel,
      stream: false,
      format: RESPONSE_SCHEMA,
      keep_alive: cfg.keepAlive,
      options: { temperature: 0 },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(req) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`ollama HTTP ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

export async function runLlmCheck(req: ScanRequest, cfg: Config, fetchImpl: FetchLike = fetch): Promise<LlmResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let raw: string;
    try {
      raw = await chatOnce(req, cfg, fetchImpl);
    } catch (err) {
      console.warn(`[llm] request failed (${cfg.ollamaBaseUrl}, ${cfg.ollamaModel}):`, (err as Error).message);
      return UNAVAILABLE; // network/timeout: don't burn another 90s retrying
    }
    const parsed = parseLlmJson(raw);
    if (parsed) return { status: "ok", flags: findingsToFlags(req, parsed.findings), summary: parsed.overall || null };
    console.warn(`[llm] unparseable output (attempt ${attempt}):`, raw.slice(0, 200));
  }
  return UNAVAILABLE;
}

export async function warmUp(cfg: Config, fetchImpl: FetchLike = fetch): Promise<void> {
  try {
    await fetchImpl(`${cfg.ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({ model: cfg.ollamaModel, prompt: "", keep_alive: cfg.keepAlive }),
    });
    console.log(`[llm] warmed ${cfg.ollamaModel} at ${cfg.ollamaBaseUrl}`);
  } catch (err) {
    console.warn(`[llm] warm-up failed:`, (err as Error).message);
  }
}

export async function llmHealth(cfg: Config, fetchImpl: FetchLike = fetch) {
  const base = { baseUrl: cfg.ollamaBaseUrl, model: cfg.ollamaModel };
  try {
    const res = await fetchImpl(`${cfg.ollamaBaseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    const data = (await res.json()) as { models?: { name: string }[] };
    return { ...base, reachable: true, modelPresent: !!data.models?.some((m) => m.name === cfg.ollamaModel) };
  } catch {
    return { ...base, reachable: false, modelPresent: false };
  }
}
