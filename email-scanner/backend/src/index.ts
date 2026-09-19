import "dotenv/config";
import { loadCompanies } from "./companies.js";
import { loadConfig } from "./config.js";
import { llmHealth, runLlmCheck, warmUp } from "./llm/client.js";
import { createApp } from "./server.js";

const cfg = loadConfig();
const app = createApp({
  companies: loadCompanies(),
  llm: cfg.llmEnabled ? (req) => runLlmCheck(req, cfg) : async () => ({ status: "disabled", flags: [], summary: null }),
  health: () => llmHealth(cfg),
});

app.listen(cfg.port, () => {
  console.log(`[backend] http://localhost:${cfg.port}  llm=${cfg.llmEnabled ? `${cfg.ollamaModel} @ ${cfg.ollamaBaseUrl}` : "disabled"}`);
  if (cfg.llmEnabled) void warmUp(cfg);
});
