export interface Config {
  port: number;
  ollamaBaseUrl: string;
  ollamaModel: string;
  llmTimeoutMs: number;
  llmEnabled: boolean;
  keepAlive: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT ?? 3001),
    ollamaBaseUrl: (env.OLLAMA_BASE_URL ?? "http://enverthor:11434").replace(/\/+$/, ""),
    ollamaModel: env.OLLAMA_MODEL ?? "llama3:70b",
    llmTimeoutMs: Number(env.LLM_TIMEOUT_MS ?? 90000),
    llmEnabled: env.LLM_ENABLED !== "false",
    keepAlive: env.OLLAMA_KEEP_ALIVE ?? "60m",
  };
}
