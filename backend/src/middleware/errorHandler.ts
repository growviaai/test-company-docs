import type { ErrorHandler } from "hono";

interface HttpError extends Error {
  status?: number;
  code?: string;
}

export const errorHandler: ErrorHandler = (err, c) => {
  const e = err as HttpError;
  const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
  // Never leak stack traces or internals to the client.
  const code = e.code ?? (status === 500 ? "server_error" : "error");
  if (status === 500) {
    // eslint-disable-next-line no-console
    console.error("[api] unhandled error", { message: e.message, requestId: c.get("requestId" as never) });
  }
  return c.json({ error: { code, message: status === 500 ? "Internal server error" : e.message } }, status as 400 | 401 | 403 | 404 | 409 | 429 | 500);
};
