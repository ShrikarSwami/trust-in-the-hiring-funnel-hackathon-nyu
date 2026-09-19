import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/server.js";
import { loadCompanies } from "../src/companies.js";

const app = createApp({ companies: loadCompanies(), llm: async () => ({ status: "disabled", flags: [], summary: null }), health: async () => ({ reachable: true }) });

describe("server", () => {
  it("POST /scan returns a ScanResult", async () => {
    const res = await request(app).post("/scan").send({ sender_name: "John Pork", sender_email: "johnpork.tesla@gmail.com", subject: "Tesla job", body: "Hello" });
    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe("Likely Scam");
    expect(res.body.llm_status).toBe("disabled");
  });
  it("POST /scan rejects malformed input with 400", async () => {
    const res = await request(app).post("/scan").send({ subject: 3 });
    expect(res.status).toBe(400);
  });
  it("GET /health reports ok + llm", async () => {
    const res = await request(app).get("/health");
    expect(res.body).toEqual({ ok: true, llm: { reachable: true } });
  });
});
