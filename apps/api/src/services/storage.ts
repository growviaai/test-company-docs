import { getDb } from "../db/supabase.js";

export const ATTACHMENTS_BUCKET = "attachments";

// 07-docs-editor.md §5: allowed types. SVG, HTML, JS, and executables are
// explicitly disallowed (SVG/HTML can carry script; JS/executables are an
// obvious malware vector) — the allowlist below is therefore closed, not
// an "everything except…" denylist.
const ALLOWED: Record<string, { mime: readonly string[]; magic?: (bytes: Uint8Array) => boolean }> = {
  png: { mime: ["image/png"], magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  jpg: { mime: ["image/jpeg", "image/jpg"], magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  jpeg: { mime: ["image/jpeg", "image/jpg"], magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  gif: { mime: ["image/gif"], magic: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  webp: {
    mime: ["image/webp"],
    magic: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  pdf: { mime: ["application/pdf"], magic: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  // These formats have no reliable magic number (plain text) or are a zip
  // container (docx/xlsx/pptx) whose first bytes are just the generic zip
  // signature — accept the zip signature for those, and skip the magic
  // check entirely for genuinely plain-text formats.
  txt: { mime: ["text/plain"] },
  csv: { mime: ["text/csv", "application/vnd.ms-excel"] },
  md: { mime: ["text/markdown", "text/plain"] },
  zip: { mime: ["application/zip", "application/x-zip-compressed"], magic: (b) => b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07) },
  docx: {
    mime: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    magic: (b) => b[0] === 0x50 && b[1] === 0x4b,
  },
  xlsx: {
    mime: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    magic: (b) => b[0] === 0x50 && b[1] === 0x4b,
  },
  pptx: {
    mime: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    magic: (b) => b[0] === 0x50 && b[1] === 0x4b,
  },
};

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/** Strips path characters and limits length — 07-docs-editor.md §5:
 * "File names are sanitized (strip path characters, limit length)." */
export function sanitizeFileName(fileName: string): string {
  const base = fileName.replace(/[/\\]/g, "_").replace(/[\u0000-\u001f]/g, "").trim();
  const ext = extensionOf(base);
  const stem = ext ? base.slice(0, base.length - ext.length - 1) : base;
  const truncatedStem = stem.slice(0, 180) || "file";
  return ext ? `${truncatedStem}.${ext}` : truncatedStem;
}

export function isAllowedUpload(fileName: string, mimeType: string): boolean {
  const ext = extensionOf(fileName);
  const rule = ALLOWED[ext];
  if (!rule) return false;
  return rule.mime.includes(mimeType.toLowerCase());
}

/** Checks the first bytes of a downloaded file against the magic number for
 * its claimed extension. Formats with no reliable signature (txt/csv/md)
 * pass trivially — their risk is covered by the allowlist + extension
 * check, not by content sniffing. */
export function matchesMagicNumber(fileName: string, bytes: Uint8Array): boolean {
  const ext = extensionOf(fileName);
  const rule = ALLOWED[ext];
  if (!rule) return false;
  if (!rule.magic) return true;
  return rule.magic(bytes);
}

export function storagePathFor(spaceId: string, attachmentId: string, fileName: string): string {
  return `${spaceId}/${attachmentId}/${sanitizeFileName(fileName)}`;
}

/** 07-docs-editor.md §5 cleanup job: delete `pending` attachments (and
 * their storage objects, if any made it that far) older than 24 hours. An
 * admin can also trigger this on demand from the Trash/maintenance screen. */
export async function purgeStalePendingAttachments(): Promise<number> {
  const db = getDb();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: stale } = await db
    .from("attachments")
    .select("id, storage_path")
    .eq("status", "pending")
    .lt("created_at", cutoff);
  if (!stale || stale.length === 0) return 0;

  const paths = stale.map((a) => a.storage_path as string);
  await db.storage.from(ATTACHMENTS_BUCKET).remove(paths).catch(() => undefined);
  await db
    .from("attachments")
    .delete()
    .in("id", stale.map((a) => a.id as string));
  return stale.length;
}
