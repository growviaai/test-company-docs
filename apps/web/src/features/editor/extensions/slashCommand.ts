import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import type { Editor, Range } from "@tiptap/core";

export interface SlashCommandItem {
  title: string;
  group: "Basic blocks" | "Advanced blocks";
  run: (editor: Editor, range: Range) => void;
}

// The slash menu from 07-docs-editor.md §4: typing "/" on a line opens
// "Insert block…" with a filter box, grouped into "Basic blocks" and
// "Advanced blocks". Image/File are intentionally not listed here —
// see extensions/attachments.ts: there is no upload flow yet to back them.
export const SLASH_COMMAND_ITEMS: SlashCommandItem[] = [
  {
    title: "Paragraph",
    group: "Basic blocks",
    run: (editor, range) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "Heading 1",
    group: "Basic blocks",
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "Heading 2",
    group: "Basic blocks",
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Heading 3",
    group: "Basic blocks",
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "Unordered list",
    group: "Basic blocks",
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Ordered list",
    group: "Basic blocks",
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Task list",
    group: "Basic blocks",
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Code block",
    group: "Basic blocks",
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Table",
    group: "Advanced blocks",
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run(),
  },
  {
    title: "Hint",
    group: "Advanced blocks",
    run: (editor, range) => editor.chain().focus().deleteRange(range).setHint("info").run(),
  },
];

/** Pulled out so the filtering logic has a plain, DOM-free unit test
 * (case-insensitive substring match on title). */
export function filterSlashCommands(query: string): SlashCommandItem[] {
  const q = query.toLowerCase();
  return SLASH_COMMAND_ITEMS.filter((item) => item.title.toLowerCase().includes(q));
}

export interface SlashMenuRenderProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  clientRect: (() => DOMRect | null) | null;
}

/** Built with `renderer` injected by Editor.tsx, which owns the React
 * popup (ReactRenderer + tippy) — this file stays framework-render-agnostic
 * so it has no JSX and can be unit-free-of-DOM in principle. */
export function createSlashCommandExtension(
  renderer: Pick<SuggestionOptions<SlashCommandItem>, "render">
) {
  return Extension.create({
    name: "slashCommand",

    addOptions() {
      return {
        suggestion: {
          char: "/",
          startOfLine: false,
          items: ({ query }: { query: string }) => filterSlashCommands(query),
          command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashCommandItem }) => {
            props.run(editor, range);
          },
          ...renderer,
        } satisfies Partial<SuggestionOptions<SlashCommandItem>>,
      };
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
        }),
      ];
    },
  });
}
