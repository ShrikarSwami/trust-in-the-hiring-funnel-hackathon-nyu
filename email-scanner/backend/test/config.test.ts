import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config.js";
import { senderLine } from "../src/types.js";

describe("loadConfig", () => {
  it("defaults to Thor llama3:70b", () => {
    const c = loadConfig({});
    expect(c.ollamaBaseUrl).toBe("http://enverthor:11434");
    expect(c.ollamaModel).toBe("llama3:70b");
    expect(c.port).toBe(3001);
    expect(c.llmEnabled).toBe(true);
    expect(c.llmTimeoutMs).toBe(90000);
  });
  it("lets env swap to a local fallback model and strips trailing slash", () => {
    const c = loadConfig({ OLLAMA_BASE_URL: "http://localhost:11434/", OLLAMA_MODEL: "qwen2.5vl:7b", LLM_ENABLED: "false" });
    expect(c.ollamaBaseUrl).toBe("http://localhost:11434");
    expect(c.ollamaModel).toBe("qwen2.5vl:7b");
    expect(c.llmEnabled).toBe(false);
  });
});

describe("senderLine", () => {
  it("formats name and address", () => {
    expect(senderLine({ sender_name: "John Pork", sender_email: "jp@gmail.com" })).toBe("John Pork <jp@gmail.com>");
  });
  it("falls back to bare address", () => {
    expect(senderLine({ sender_name: " ", sender_email: "jp@gmail.com" })).toBe("jp@gmail.com");
  });
});
