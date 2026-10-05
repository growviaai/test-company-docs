import { Hono } from "hono";
import { getDb } from "../db/supabase.js";
import { requireAuth } from "../middleware/session.js";
import { canAccessSpace } from "../services/permissions.js";
import { signUploadSchema } from "../shared.js";
import { writeAudit } from "../services/audit.js";
import {
  ATTACHMENTS_BUCKET,
  isAllowedUpload,
  matchesMagicNumber,
  sanitizeFileName,
  storagePathFor,
} from "../services/storage.js";

export const uploadRoutes = new Hono();

// 07-docs-editor.md §5 step 1-2: client asks the API to sign an upload.
// The API checks space access, size, and type, writes a `pending`
// attachments row, then hands back a direct-to-storage signed upload URL
// (Vercel functions cannot accept a 25 MB request body).
uploadRoutes.post("/sign", async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json().catch(() => null);
  const parsed = signUploadSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: { code: "validation_error", message: "Invalid upload request" } }, 400);
  const { spaceId, pageId, fileName, mimeType, sizeBytes } = parsed.data;

  if (!(await canAccessSpace(user, spaceId))) {
    return c.json({ error: { code: "forbidden", message: "No access to this space" } }, 403);
  }
  if (!isAllowedUpload(fileName, mimeType)) {
    return c.json({ error: { code: "validation_error", message: "This file type is not allowed" } }, 400);
  }

  const db = getDb();
  if (pageId) {
    const { data: page } = await db.from("pages").select("id, space_id").eq("id", pageId).maybeSingle();
    if (!page || page.space_id !== spaceId) {
      return c.json({ error: { code: "validation_error", message: "Page does not belong to this space" } }, 400);
    }
  }

  const safeName = sanitizeFileName(fileName);
  const { data: attachment, error: insertError } = await db
    .from("attachments")
    .insert({
      space_id: spaceId,
      page_id: pageId ?? null,
      uploaded_by: user.id,
      storage_path: "", // filled in once we know the generated id, below
      file_name: safeName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      status: "pending",
    })
    .select("id")
    .single();
  if (insertError) throw Object.assign(new Error(insertError.message), { status: 500 });

  const storagePath = storagePathFor(spaceId, attachment.id as string, safeName);
  await db.from("attachments").update({ storage_path: storagePath }).eq("id", attachment.id as string);

  const { data: signed, error: signError } = await db.storage.from(ATTACHMENTS_BUCKET).createSignedUploadUrl(storagePath);
  if (signError) {
    await db.from("attachments").delete().eq("id", attachment.id as string);
    throw Object.assign(new Error(signError.message), { status: 500 });
  }

  return c.json({
    data: {
      attachmentId: attachment.id,
      uploadUrl: signed.signedUrl,
      token: signed.token,
      path: storagePath,
    },
  });
});

// Step 4-5: after the client has PUT the file straight to Storage using the
// signed URL, it tells us it's done. We re-download the first bytes,
// verify the magic number matches the claimed type, confirm the stored
// size, and only then flip status to 'ready'. Anything wrong -> delete the
// object and 422, per spec.
uploadRoutes.post("/:id/complete", async (c) => {
  const user = requireAuth(c);
  const id = c.req.param("id");
  const db = getDb();

  const { data: attachment } = await db
    .from("attachments")
    .select("id, space_id, storage_path, file_name, size_bytes, status, uploaded_by")
    .eq("id", id)
    .maybeSingle();
  if (!attachment || attachment.uploaded_by !== user.id) {
    return c.json({ error: { code: "not_found", message: "Upload not found" } }, 404);
  }
  if (attachment.status === "ready") {
    return c.json({ data: { id: attachment.id, status: "ready" } });
  }

  const path = attachment.storage_path as string;
  const { data: fileBlob, error: downloadError } = await db.storage.from(ATTACHMENTS_BUCKET).download(path);
  if (downloadError || !fileBlob) {
    await db.from("attachments").delete().eq("id", id);
    return c.json({ error: { code: "validation_error", message: "Upload did not complete" } }, 422);
  }

  const bytes = new Uint8Array(await fileBlob.arrayBuffer());
  const actualSize = bytes.byteLength;
  const sizeOk = actualSize > 0 && actualSize === attachment.size_bytes;
  const magicOk = matchesMagicNumber(attachment.file_name as string, bytes);

  if (!sizeOk || !magicOk) {
    await db.storage.from(ATTACHMENTS_BUCKET).remove([path]);
    await db.from("attachments").delete().eq("id", id);
    return c.json({ error: { code: "validation_error", message: "File content did not match its declared type or size" } }, 422);
  }

  await db.from("attachments").update({ status: "ready" }).eq("id", id);
  await writeAudit({ actorId: user.id, actorEmail: user.email, action: "attachment.uploaded", targetType: "attachment", targetId: id as string, metadata: { fileName: attachment.file_name } });
  return c.json({ data: { id: attachment.id, status: "ready" } });
});

export const attachmentRoutes = new Hono();

// Viewing: a signed URL valid for 60 seconds, per spec. Non-images get
// Content-Disposition: attachment via the `download` option so they save
// instead of rendering inline.
attachmentRoutes.get("/:id/url", async (c) => {
  const user = requireAuth(c);
  const id = c.req.param("id");
  const db = getDb();
  const { data: attachment } = await db
    .from("attachments")
    .select("id, space_id, storage_path, file_name, mime_type, status, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!attachment || attachment.status !== "ready" || attachment.deleted_at) {
    return c.json({ error: { code: "not_found", message: "Attachment not found" } }, 404);
  }
  if (!(await canAccessSpace(user, attachment.space_id as string))) {
    return c.json({ error: { code: "forbidden", message: "No access to this attachment" } }, 403);
  }

  const isImage = (attachment.mime_type as string).startsWith("image/");
  const { data: signed, error } = await db.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(attachment.storage_path as string, 60, isImage ? undefined : { download: attachment.file_name as string });
  if (error || !signed) throw Object.assign(new Error(error?.message ?? "Could not sign URL"), { status: 500 });

  return c.json({ data: { url: signed.signedUrl, fileName: attachment.file_name, mimeType: attachment.mime_type } });
});
