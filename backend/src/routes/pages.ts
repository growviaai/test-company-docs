import { Hono } from "hono";
import { getDb } from "../db/supabase.js";
import { requireAuth } from "../middleware/session.js";
import { canAccessSpace } from "../services/permissions.js";
import { createPageSchema, updatePageContentSchema } from "../shared.js";
import { validatePageContent } from "../content-schema.js";
import { writeAudit } from "../services/audit.js";

export const pageRoutes = new Hono();

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base.length > 0 ? base.slice(0, 180) : `untitled-${Date.now()}`;
}

/** Plain-text extraction from TipTap JSON, used for content_text/search. */
function extractText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { text?: string; content?: unknown[] };
  let out = n.text ?? "";
  if (Array.isArray(n.content)) {
    out += " " + n.content.map(extractText).join(" ");
  }
  return out;
}

pageRoutes.get("/tree", async (c) => {
  const user = requireAuth(c);
  const spaceId = c.req.query("space_id");
  if (!spaceId) return c.json({ error: { code: "validation_error", message: "space_id required" } }, 400);
  if (!(await canAccessSpace(user, spaceId))) {
    return c.json({ error: { code: "forbidden", message: "No access to this space" } }, 403);
  }
  const db = getDb();
  const { data, error } = await db
    .from("pages")
    .select("id, space_id, parent_id, kind, title, slug, emoji, position, updated_at")
    .eq("space_id", spaceId)
    .is("deleted_at", null)
    .order("position", { ascending: true });
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return c.json({ data });
});

pageRoutes.get("/:id", async (c) => {
  const user = requireAuth(c);
  const id = c.req.param("id");
  const db = getDb();
  const { data: page } = await db
    .from("pages")
    .select("id, space_id, parent_id, kind, title, slug, description, emoji, content, revision, updated_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!page) return c.json({ error: { code: "not_found", message: "Page not found" } }, 404);
  if (!(await canAccessSpace(user, page.space_id as string))) {
    return c.json({ error: { code: "forbidden", message: "No access to this page" } }, 403);
  }
  return c.json({ data: page });
});

pageRoutes.post("/", async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json().catch(() => null);
  const parsed = createPageSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: { code: "validation_error", message: "Invalid page" } }, 400);
  if (!(await canAccessSpace(user, parsed.data.space_id))) {
    return c.json({ error: { code: "forbidden", message: "No access to this space" } }, 403);
  }
  const db = getDb();
  const { data: siblings } = await db
    .from("pages")
    .select("position")
    .eq("space_id", parsed.data.space_id)
    .eq("parent_id", parsed.data.parent_id ?? null)
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = siblings && siblings.length > 0 ? (siblings[0].position as number) + 1 : 0;

  const { data, error } = await db
    .from("pages")
    .insert({
      space_id: parsed.data.space_id,
      parent_id: parsed.data.parent_id ?? null,
      kind: parsed.data.kind,
      title: parsed.data.title,
      slug: slugify(parsed.data.title),
      position: nextPosition,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id, space_id, parent_id, kind, title, slug, position")
    .single();
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  await writeAudit({ actorId: user.id, actorEmail: user.email, action: "page.create", targetType: "page", targetId: data.id as string });
  return c.json({ data }, 201);
});

pageRoutes.patch("/:id", async (c) => {
  const user = requireAuth(c);
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updatePageContentSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: { code: "validation_error", message: "Invalid payload" } }, 400);

  const db = getDb();
  const { data: existing } = await db
    .from("pages")
    .select("id, space_id, revision")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existing) return c.json({ error: { code: "not_found", message: "Page not found" } }, 404);
  if (!(await canAccessSpace(user, existing.space_id as string))) {
    return c.json({ error: { code: "forbidden", message: "No access to this page" } }, 403);
  }
  if (existing.revision !== parsed.data.revision) {
    return c.json({ error: { code: "revision_conflict", message: "Page was changed elsewhere. Reload and retry." } }, 409);
  }

  // Per 07-docs-editor.md §4 and RULES.md §2.8: validate content against an
  // allowlisted node/mark schema and a 1 MB size cap before it ever reaches
  // the database. Never trust the shape of client-sent TipTap JSON.
  const contentCheck = validatePageContent(parsed.data.content);
  if (!contentCheck.ok) {
    return c.json({ error: { code: "validation_error", message: contentCheck.error } }, 400);
  }

  const contentText = extractText(contentCheck.content).trim().slice(0, 100000);
  const { data, error } = await db
    .from("pages")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      content: contentCheck.content,
      content_text: contentText,
      revision: existing.revision + 1,
      updated_by: user.id,
    })
    .eq("id", id)
    .eq("revision", existing.revision)
    .select("id, title, description, content, revision, updated_at")
    .single();
  if (error) throw Object.assign(new Error(error.message), { status: 500 });

  await db.from("page_versions").insert({
    page_id: id,
    version_no: data.revision as number,
    title: data.title as string,
    description: (data.description as string) ?? null,
    content: data.content,
    reason: "manual",
    created_by: user.id,
  });
  await writeAudit({ actorId: user.id, actorEmail: user.email, action: "page.update", targetType: "page", targetId: id });

  return c.json({ data });
});
