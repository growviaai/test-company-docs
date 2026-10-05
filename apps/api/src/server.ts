import { serve } from "@hono/node-server";
import { buildApp } from "./app.js";

const app = buildApp();
const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${info.port}`);
});
