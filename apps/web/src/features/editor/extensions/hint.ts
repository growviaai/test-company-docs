import { Node, mergeAttributes } from "@tiptap/core";

// The "Hint" block from 07-docs-editor.md §4: four styles (info, success,
// warning, danger), rendered as a colored callout. Content is any block
// content (same as a blockquote), so it round-trips as:
//   { type: "hint", attrs: { variant: "info" }, content: [...] }
// which matches packages/shared/src/content-schema.ts's hintNodeSchema.

export type HintVariant = "info" | "success" | "warning" | "danger";
export const HINT_VARIANTS: HintVariant[] = ["info", "success", "warning", "danger"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    hint: {
      setHint: (variant: HintVariant) => ReturnType;
    };
  }
}

export const Hint = Node.create({
  name: "hint",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      variant: {
        default: "info",
        parseHTML: (el) => el.getAttribute("data-variant") ?? "info",
        renderHTML: (attrs) => ({ "data-variant": attrs.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-hint]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-hint": "" }), 0];
  },

  addCommands() {
    return {
      setHint:
        (variant: HintVariant) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { variant }),
    };
  },
});
