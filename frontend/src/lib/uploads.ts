import { api } from "./api";

export interface UploadResult {
  attachmentId: string;
  fileName: string;
  mimeType: string;
}

interface SignResponse {
  attachmentId: string;
  uploadUrl: string;
  token: string;
  path: string;
}

/** 07-docs-editor.md §5: sign -> PUT straight to Storage -> complete.
 * Vercel functions can't accept a 25 MB body, so the actual bytes never
 * touch our API — only the sign/complete round trips do. */
export function uploadFile(
  file: File,
  opts: { spaceId: string; pageId?: string | null },
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    (async () => {
      const signed = await api.post<SignResponse>("/uploads/sign", {
        spaceId: opts.spaceId,
        pageId: opts.pageId ?? null,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      await new Promise<void>((res, rej) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signed.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? res() : rej(new Error(`Upload failed (${xhr.status})`)));
        xhr.onerror = () => rej(new Error("Upload failed — check your connection and try again"));
        xhr.send(file);
      });

      await api.post(`/uploads/${signed.attachmentId}/complete`);
      return { attachmentId: signed.attachmentId, fileName: file.name, mimeType: file.type || "application/octet-stream" };
    })().then(resolve, (err: unknown) => reject(err instanceof Error ? err : new Error("Upload failed")));
  });
}

const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "pdf", "txt", "csv", "md", "docx", "xlsx", "pptx", "zip"];
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function validateFileBeforeUpload(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) return `"${ext}" files aren't allowed here.`;
  if (file.size > MAX_UPLOAD_BYTES) return "Files must be 25 MB or smaller.";
  if (file.size === 0) return "That file is empty.";
  return null;
}

interface AttachmentUrlInfo {
  url: string;
  fileName: string;
  mimeType: string;
}

const urlCache = new Map<string, AttachmentUrlInfo & { expiresAt: number }>();

/** Signed URLs live 60s (per 07-docs-editor.md §5); cache and refresh a few
 * seconds before expiry so a visible image doesn't flicker on re-render. */
export async function getAttachmentUrl(attachmentId: string): Promise<AttachmentUrlInfo> {
  const cached = urlCache.get(attachmentId);
  if (cached && cached.expiresAt > Date.now() + 5000) {
    return cached;
  }
  const data = await api.get<AttachmentUrlInfo>(`/attachments/${attachmentId}/url`);
  urlCache.set(attachmentId, { ...data, expiresAt: Date.now() + 55_000 });
  return data;
}
