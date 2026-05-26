import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) =>
  c.json({ ok: true, data: { status: "alive", version: "v2-dev" } }),
);

const port = Number(process.env.PORT) || 8000;
console.log(`[ddalkkak/api] listening on :${port}`);
serve({ fetch: app.fetch, port });
