import { z } from "zod";

// The TipTap document schema for `pages.content`, per 07-docs-editor.md §4.
// Lists exactly the node and mark types the v1 editor can produce. The API
// validates every save against this (RULES.md: "validate content against a
// schema (allowed node and mark types only). Reject unknown nodes.") so a
// request can never smuggle in arbitrary node types, HTML, or scripts.
//
// This file is mirrored byte-for-byte at apps/api/src/content-schema.ts
// (apps/api duplicates packages/shared rather than depending on it, so it
// can deploy to Vercel standalone — see apps/api/src/shared.ts). Keep both
// copies identical when editing either one.

export const HINT_VARIANTS = ["info", "success", "warning", "danger"] as const;
export type HintVariant = (typeof HINT_VARIANTS)[number];

/** Per 07-docs-editor.md §4: "Links accept only http, https, and mailto." */
export function isAllowedLinkHref(href: string): boolean {
  return /^(https?:\/\/|mailto:)\S+$/i.test(href);
}

const linkMarkSchema = z.object({
  type: z.literal("link"),
  attrs: z
    .object({
      href: z.string().refine(isAllowedLinkHref, "Links must be http, https, or mailto"),
      target: z.string().nullable().optional(),
      rel: z.string().nullable().optional(),
      class: z.string().nullable().optional(),
    })
    .strict(),
});

const markSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }).strict(),
  z.object({ type: z.literal("italic") }).strict(),
  z.object({ type: z.literal("strike") }).strict(),
  z.object({ type: z.literal("code") }).strict(),
  linkMarkSchema,
]);

const textNodeSchema = z
  .object({
    type: z.literal("text"),
    text: z.string().min(1),
    marks: z.array(markSchema).max(10).optional(),
  })
  .strict();

const hardBreakNodeSchema = z.object({ type: z.literal("hardBreak") }).strict();

const inlineNodeSchema = z.union([textNodeSchema, hardBreakNodeSchema]);
const inlineContentSchema = z.array(inlineNodeSchema).max(2000).optional();

// Block, listItem, tableCell and hint content all recurse back into "any
// allowed block", so they are declared with z.lazy against this forward ref.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- recursive schema, see z.lazy below
let blockNodeSchema: z.ZodType<any>;

const paragraphNodeSchema = z.lazy(() =>
  z
    .object({
      type: z.literal("paragraph"),
      content: inlineContentSchema,
    })
    .strict()
);

const headingNodeSchema = z.lazy(() =>
  z
    .object({
      type: z.literal("heading"),
      attrs: z.object({ level: z.union([z.literal(1), z.literal(2), z.literal(3)]) }).strict(),
      content: inlineContentSchema,
    })
    .strict()
);

const listItemNodeSchema = z.lazy(() =>
  z
    .object({
      type: z.literal("listItem"),
      content: z.array(blockNodeSchema).min(1).max(500),
    })
    .strict()
);

const bulletListNodeSchema = z.lazy(() =>
  z
    .object({
      type: z.literal("bulletList"),
      content: z.array(listItemNodeSchema).min(1).max(500),
    })
    .strict()
);

const orderedListNodeSchema = z.lazy(() =>
  z
    .object({
      type: z.literal("orderedList"),
      attrs: z.object({ start: z.number().int().min(1).max(9999) }).strict().optional(),
      content: z.array(listItemNodeSchema).min(1).max(500),
    })
    .strict()
);

const taskItemNodeSchema = z.lazy(() =>
  z
    .object({
      type: z.literal("taskItem"),
      attrs: z.object({ checked: z.boolean() }).strict(),
      content: z.array(blockNodeSchema).min(1).max(500),
    })
    .strict()
);

const taskListNodeSchema = z.lazy(() =>
  z
    .object({
      type: z.literal("taskList"),
      content: z.array(taskItemNodeSchema).min(1).max(500),
    })
    .strict()
);

// Code blocks hold plain text only: TipTap's CodeBlock node forbids marks.
const codeTextNodeSchema = z.object({ type: z.literal("text"), text: z.string().min(1) }).strict();

const codeBlockNodeSchema = z
  .object({
    type: z.literal("codeBlock"),
    attrs: z.object({ language: z.string().max(40).nullable() }).strict().optional(),
    content: z.array(codeTextNodeSchema).max(5000).optional(),
  })
  .strict();

const imageNodeSchema = z
  .object({
    type: z.literal("image"),
    attrs: z
      .object({
        attachmentId: z.string().uuid(),
        alt: z.string().max(300).nullable().optional(),
        caption: z.string().max(300).nullable().optional(),
      })
      .strict(),
  })
  .strict();

const fileNodeSchema = z
  .object({
    type: z.literal("file"),
    attrs: z
      .object({
        attachmentId: z.string().uuid(),
        fileName: z.string().max(260).nullable().optional(),
      })
      .strict(),
  })
  .strict();

const tableCellLikeContentSchema = z.lazy(() => z.array(blockNodeSchema).min(1).max(200));

const tableCellAttrsSchema = z
  .object({
    colspan: z.number().int().min(1).max(50).optional(),
    rowspan: z.number().int().min(1).max(50).optional(),
    colwidth: z.array(z.number().int().min(1)).nullable().optional(),
  })
  .strict();

const tableCellNodeSchema = z.lazy(() =>
  z
    .object({
      type: z.literal("tableCell"),
      attrs: tableCellAttrsSchema.optional(),
      content: tableCellLikeContentSchema,
    })
    .strict()
);

const tableHeaderNodeSchema = z.lazy(() =>
  z
    .object({
      type: z.literal("tableHeader"),
      attrs: tableCellAttrsSchema.optional(),
      content: tableCellLikeContentSchema,
    })
    .strict()
);

const tableRowNodeSchema = z.lazy(() =>
  z
    .object({
      type: z.literal("tableRow"),
      content: z.array(z.union([tableCellNodeSchema, tableHeaderNodeSchema])).min(1).max(50),
    })
    .strict()
);

const tableNodeSchema = z.lazy(() =>
  z
    .object({
      type: z.literal("table"),
      content: z.array(tableRowNodeSchema).min(1).max(500),
    })
    .strict()
);

const hintNodeSchema = z.lazy(() =>
  z
    .object({
      type: z.literal("hint"),
      attrs: z.object({ variant: z.enum(HINT_VARIANTS) }).strict(),
      content: z.array(blockNodeSchema).min(1).max(500),
    })
    .strict()
);

blockNodeSchema = z.union([
  paragraphNodeSchema,
  headingNodeSchema,
  bulletListNodeSchema,
  orderedListNodeSchema,
  taskListNodeSchema,
  codeBlockNodeSchema,
  imageNodeSchema,
  fileNodeSchema,
  tableNodeSchema,
  hintNodeSchema,
]);

export const pageContentSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(blockNodeSchema).max(5000),
  })
  .strict();

export type PageContent = z.infer<typeof pageContentSchema>;

/** Per 07-docs-editor.md §4: "Maximum content size 1 MB." Measured as the
 * serialized JSON byte size, which is what is actually stored and transferred. */
export const MAX_CONTENT_BYTES = 1024 * 1024;

export type ContentValidationResult =
  | { ok: true; content: PageContent }
  | { ok: false; error: string };

/** Validates a page content payload: size limit, then the node/mark
 * allowlist above. Never throws — callers get a clear, safe-to-return error
 * string instead of a zod exception shape. */
export function validatePageContent(raw: unknown): ContentValidationResult {
  let size: number;
  try {
    // TextEncoder (not Buffer) so this file stays portable to the browser
    // bundle (apps/web imports @tcd/shared too) as well as the API's Node runtime.
    size = new TextEncoder().encode(JSON.stringify(raw ?? null)).length;
  } catch {
    return { ok: false, error: "Content is not valid JSON" };
  }
  if (size > MAX_CONTENT_BYTES) {
    return { ok: false, error: `Content exceeds the ${MAX_CONTENT_BYTES} byte limit` };
  }
  const parsed = pageContentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Content contains a disallowed node, mark, or shape" };
  }
  return { ok: true, content: parsed.data };
}
