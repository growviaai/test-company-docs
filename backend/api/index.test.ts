import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Regression test for a production incident: the Vercel function entry
// point used `handle` from "hono/vercel", which targets Vercel's *Edge*
// runtime (where the platform already hands Hono a Fetch API Request).
// This function declares `config = { runtime: "nodejs" }`, so Vercel
// instead invokes it as (IncomingMessage, ServerResponse). Fed a Node
// request, the edge adapter crashed with "this.raw.headers.get is not a
// function" and the request hung until Vercel's hard timeout. The fix is
// `handle` from "@hono/node-server/vercel", the adapter built for the
// Node.js runtime. This test exercises the real Node http server path
// (not just the Hono app in isolation) so a regression here is caught.
describe("Vercel Node.js function entry point", () => {
  process.env.SUPABASE_URL ??= "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= "x".repeat(40);
  process.env.CORS_ORIGIN ??= "https://growviaai.github.io";
  process.env.NODE_ENV ??= "production";

  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeAll(async () => {
    const { default: handler } = await import("./index.js");
    server = createServer((req, res) => {
      void handler(req, res);
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(() => {
    server.close();
  });

  it("responds to GET /health quickly with a real Request/Response round trip", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { ok: true } });
  });

  it("handles a POST with a JSON body and an Origin header without hanging", async () => {
    // An invalid email fails zod validation before any Supabase call, so
    // this exercises the Node request/response adapter (body parsing,
    // header reads, CORS, JSON response) without depending on outbound
    // network reachability.
    const res = await fetch(`${baseUrl}/auth/sign-in`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://growviaai.github.io" },
      body: JSON.stringify({ email: "not-an-email", password: "wrongpassword123" }),
    });
    expect(res.status).toBe(400);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://growviaai.github.io");
    expect(await res.json()).toEqual({
      error: { code: "validation_error", message: "Invalid email or password" },
    });
  });
});
