import { describe, expect, it } from "vitest";
import { MAX_CONTENT_BYTES, validatePageContent } from "./content-schema.js";

function doc(content: unknown[]) {
  return { type: "doc", content };
}

describe("validatePageContent", () => {
  it("accepts an empty document", () => {
    const result = validatePageContent(doc([]));
    expect(result.ok).toBe(true);
  });

  it("accepts a paragraph with marks, a heading, lists, a task list, a code block, a table, and a hint", () => {
    const result = validatePageContent(
      doc([
        { type: "paragraph", content: [{ type: "text", text: "Hello ", marks: [{ type: "bold" }] }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Title" }] },
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }] }],
        },
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [{ type: "paragraph", content: [{ type: "text", text: "done" }] }],
            },
          ],
        },
        { type: "codeBlock", attrs: { language: "ts" }, content: [{ type: "text", text: "const x = 1;" }] },
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "H" }] }] },
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "C" }] }] },
              ],
            },
          ],
        },
        {
          type: "hint",
          attrs: { variant: "warning" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "careful" }] }],
        },
      ])
    );
    expect(result.ok).toBe(true);
  });

  it("accepts an http, https, and mailto link", () => {
    for (const href of ["https://example.com", "http://example.com", "mailto:a@example.com"]) {
      const result = validatePageContent(
        doc([{ type: "paragraph", content: [{ type: "text", text: "link", marks: [{ type: "link", attrs: { href } }] }] }])
      );
      expect(result.ok).toBe(true);
    }
  });

  it("rejects a javascript: link (the one thing the mark allowlist exists to stop)", () => {
    const result = validatePageContent(
      doc([
        {
          type: "paragraph",
          content: [{ type: "text", text: "link", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }],
        },
      ])
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a node type outside the allowlist", () => {
    const result = validatePageContent(doc([{ type: "rawHtml", html: "<script>1</script>" }]));
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown attribute (extra, unexpected field) on a known node", () => {
    const result = validatePageContent(
      doc([{ type: "heading", attrs: { level: 1, onClick: "alert(1)" }, content: [] }])
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a heading level outside 1-3", () => {
    const result = validatePageContent(doc([{ type: "heading", attrs: { level: 4 }, content: [] }]));
    expect(result.ok).toBe(false);
  });

  it("rejects content over the 1 MB limit", () => {
    const big = doc([{ type: "paragraph", content: [{ type: "text", text: "x".repeat(MAX_CONTENT_BYTES + 1) }] }]);
    const result = validatePageContent(big);
    expect(result.ok).toBe(false);
  });

  it("rejects marks on code block text (code blocks are plain text only)", () => {
    const result = validatePageContent(
      doc([{ type: "codeBlock", content: [{ type: "text", text: "x", marks: [{ type: "bold" }] }] }])
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an image/file node with a non-uuid attachmentId", () => {
    const result = validatePageContent(doc([{ type: "image", attrs: { attachmentId: "not-a-uuid" } }]));
    expect(result.ok).toBe(false);
  });

  it("accepts a valid image node", () => {
    const result = validatePageContent(
      doc([{ type: "image", attrs: { attachmentId: "123e4567-e89b-12d3-a456-426614174000", alt: "a cat" } }])
    );
    expect(result.ok).toBe(true);
  });
});
