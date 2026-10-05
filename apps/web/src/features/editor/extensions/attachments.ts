import { Node, mergeAttributes } from "@tiptap/core";

// Leaf nodes for the "Image" and "File" blocks from 07-docs-editor.md §4/§5.
// They store only `attachmentId` (never a URL — viewing goes through
// GET /api/v1/attachments/:id/url, per the spec), matching
// packages/shared/src/content-schema.ts's imageNodeSchema/fileNodeSchema.
//
// ASSUMPTION: the uploads flow (07-docs-editor.md §5: sign/upload/complete)
// is not implemented yet (see docs/14-build-plan.md Phase 8), so these nodes
// are not yet reachable from the slash menu or floating toolbar — there is
// no way to produce an attachmentId today. They are registered now so (a)
// the editor can load and round-trip a page whose content already contains
// one without crashing, and (b) the upload feature can be wired onto this
// node later without a schema change. Both render a plain placeholder.

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
      dom.className =
        "my-2 flex items-center gap-2 rounded-md border border-dashed border-border bg-surface px-3 py-6 text-sm text-muted";
      dom.textContent = node.attrs.caption || node.attrs.alt || "Image attachment (uploads not yet available)";
      return { dom };
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
      dom.className = "my-2 flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm";
      dom.textContent = `📎 ${node.attrs.fileName || "File attachment (uploads not yet available)"}`;
      return { dom };
    };
  },
});
