import { Node, mergeAttributes } from "@tiptap/core";
import { getAttachmentUrl } from "../../../lib/uploads";

// Leaf nodes for the "Image" and "File" blocks from 07-docs-editor.md §4/§5.
// They store only `attachmentId` (never a URL — viewing goes through
// GET /api/v1/attachments/:id/url, per the spec), matching
// packages/shared/src/content-schema.ts's imageNodeSchema/fileNodeSchema
// EXACTLY — those schemas are `.strict()` with a required (non-nullable)
// `attachmentId`, so these nodes carry no extra attrs (no "uploading"/
// "error" in-document state) and are only ever inserted into the document
// once a real attachmentId exists. See Editor.tsx's upload handling: the
// in-flight "Uploading…" state lives in React state outside the document,
// not as a placeholder node, specifically so autosave can never serialize
// an attrs shape the server would reject.

export const ImageNode = Node.create({
  name: "image",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      attachmentId: { default: null },
      alt: { default: null },
      caption: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-attachment-image]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-attachment-image": "" })];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.setAttribute("data-attachment-image", "");
      render();

      function render() {
        if (!node.attrs.attachmentId) {
          dom.className = "my-2 rounded-md border border-dashed border-border bg-surface px-3 py-6 text-center text-sm text-muted";
          dom.textContent = "Image (empty)";
          return;
        }
        dom.className = "my-2";
        dom.textContent = "Loading image…";
        getAttachmentUrl(node.attrs.attachmentId)
          .then(({ url }) => {
            const img = document.createElement("img");
            img.src = url;
            img.alt = node.attrs.alt ?? "";
            img.className = "max-w-full rounded-md border border-border";
            dom.replaceChildren(img);
            if (node.attrs.caption) {
              const caption = document.createElement("div");
              caption.className = "mt-1 text-center text-xs text-muted";
              caption.textContent = node.attrs.caption;
              dom.appendChild(caption);
            }
          })
          .catch(() => {
            dom.className = "my-2 rounded-md border border-border bg-surface px-3 py-6 text-center text-sm text-muted";
            dom.textContent = "Could not load this image.";
          });
      }

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== "image") return false;
          Object.assign(node.attrs, updatedNode.attrs);
          render();
          return true;
        },
      };
    };
  },
});

export const FileNode = Node.create({
  name: "file",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      attachmentId: { default: null },
      fileName: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-attachment-file]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-attachment-file": "" })];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.setAttribute("data-attachment-file", "");
      render();

      function render() {
        if (!node.attrs.attachmentId) {
          dom.className = "my-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted";
          dom.textContent = "File (empty)";
          return;
        }
        dom.className = "my-2 flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm";
        const label = document.createElement("a");
        label.textContent = `\u{1F4CE} ${node.attrs.fileName || "Download"}`;
        label.className = "cursor-pointer text-accent hover:underline";
        label.href = "#";
        label.onclick = (e) => {
          e.preventDefault();
          getAttachmentUrl(node.attrs.attachmentId)
            .then(({ url }) => window.open(url, "_blank", "noopener"))
            .catch(() => dom.append(" — could not get a download link"));
        };
        dom.replaceChildren(label);
      }

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== "file") return false;
          Object.assign(node.attrs, updatedNode.attrs);
          render();
          return true;
        },
      };
    };
  },
});
