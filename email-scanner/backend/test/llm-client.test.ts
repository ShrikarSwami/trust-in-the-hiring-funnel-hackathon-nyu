import { describe, it, expect, vi } from "vitest";
import { runLlmCheck, llmHealth } from "../src/llm/client.js";
import { loadConfig } from "../src/config.js";

const cfg = loadConfig({ OLLAMA_BASE_URL: "http://fake:11434", LLM_TIMEOUT_MS: "1000" });
const req = { sender_name: "HR", sender_email: "hr@x.com", subject: "Job", body: "Dear Applicant, send your SSN within 24 hours." };
const ollamaReply = (content: string) =>
  new Response(JSON.stringify({ message: { role: "assistant", content } }), { status: 200 });

describe("runLlmCheck", () => {
  it("posts to {base}/api/chat with the configured model and returns located flags", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ollamaReply('{"findings":[{"quoted_span":"send your SSN","reason":"asks for SSN","category":"plausibility"}],"overall":"Likely scam."}'));
    const r = await runLlmCheck(req, cfg, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl.mock.calls[0][0]).toBe("http://fake:11434/api/chat");
    const sent = JSON.parse((fetchImpl.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.model).toBe("llama3:70b");
    expect(sent.stream).toBe(false);
    expect(r.status).toBe("ok");
    expect(r.summary).toBe("Likely scam.");
    expect(r.flags[0]).toMatchObject({ type: "llm_plausibility", field: "body" });
  });
  it("retries once on unparseable output, then succeeds", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(ollamaReply("not json"))
      .mockResolvedValueOnce(ollamaReply('{"findings":[],"overall":"Fine."}'));
    const r = await runLlmCheck(req, cfg, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(r).toEqual({ status: "ok", flags: [], summary: "Fine." });
  });
  it("returns unavailable (not throw) on network error, without retrying", async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError("fetch failed"); });
    const r = await runLlmCheck(req, cfg, fetchImpl as unknown as typeof fetch);
    expect(r).toEqual({ status: "unavailable", flags: [], summary: null });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("returns unavailable after two unparseable replies", async () => {
    const fetchImpl = vi.fn(async () => ollamaReply("nope"));
    expect((await runLlmCheck(req, cfg, fetchImpl as unknown as typeof fetch)).status).toBe("unavailable");
  });
});

describe("llmHealth", () => {
  it("reports model presence from /api/tags", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ models: [{ name: "llama3:70b" }] })));
    expect(await llmHealth(cfg, fetchImpl as unknown as typeof fetch)).toMatchObject({ reachable: true, modelPresent: true });
  });
  it("reports unreachable on error", async () => {
    const fetchImpl = vi.fn(async () => { throw new Error("down"); });
    expect(await llmHealth(cfg, fetchImpl as unknown as typeof fetch)).toMatchObject({ reachable: false, modelPresent: false });
  });
});
