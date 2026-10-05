// IMPORTANT: this function runs on Vercel's Node.js runtime (config.runtime
// below), which invokes handlers as (IncomingMessage, ServerResponse), not
// as a Fetch API Request/Response pair. `hono/vercel`'s `handle` assumes the
// latter (it targets Vercel's *Edge* runtime) and crashes with
// "this.raw.headers.get is not a function" plus a hung 300s timeout when fed
// a Node request instead. `@hono/node-server/vercel` is the adapter built
// for the Node.js runtime: it wraps the IncomingMessage/ServerResponse pair
// into a real Fetch API Request/Response before calling into the Hono app.
import { handle } from "@hono/node-server/vercel";
import { buildApp } from "../src/app.js";

const app = buildApp();

export const config = { runtime: "nodejs" };

export default handle(app);
