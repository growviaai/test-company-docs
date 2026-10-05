import { handle } from "hono/vercel";
import { buildApp } from "../src/app.js";

const app = buildApp();

export const config = { runtime: "nodejs" };

export default handle(app);
