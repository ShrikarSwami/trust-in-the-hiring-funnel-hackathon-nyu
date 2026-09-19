import cors from "cors";
import express from "express";
import { z } from "zod";
import { scanEmail, type ScanDeps } from "./scan.js";

const ScanRequestSchema = z.object({
  sender_name: z.string().max(500).default(""),
  sender_email: z.string().max(500),
  subject: z.string().max(2000).default(""),
  body: z.string().max(100_000),
});

export function createApp(deps: ScanDeps & { health?: () => Promise<unknown> }) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.post("/scan", async (req, res) => {
    const parsed = ScanRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const t0 = Date.now();
    const result = await scanEmail(parsed.data, deps);
    console.log(`[scan] ${result.verdict} flags=${result.flags.length} llm=${result.llm_status} ${Date.now() - t0}ms`);
    res.json(result);
  });

  app.get("/health", async (_req, res) => {
    res.json({ ok: true, llm: deps.health ? await deps.health() : null });
  });

  return app;
}
