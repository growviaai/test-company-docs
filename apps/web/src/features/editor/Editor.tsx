import { forwardRef, useImperativeHandle, useMemo } from "react";
import { EditorContent, ReactRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { Hint } from "./extensions/hint";
import { ImageNode, FileNode } from "./extensions/attachments";
import { createSlashCommandExtension, type SlashCommandItem } from "./extensions/slashCommand";
import { SlashMenuList, type SlashMenuListHandle } from "./SlashMenuList";
import { FloatingToolbar } from "./FloatingToolbar";
import "./editor.css";

const lowlight = createLowlight(common);

export interface EditorHandle {
  getJSON: () => Record<string, unknown>;
  focus: () => void;
  insertHeading: () => void;
  insertHint: () => void;
  insertCodeBlock: () => void;
  insertTable: () => void;
}

interface Props {
  content: Record<string, unknown>;
  editable: boolean;
  onUpdate: (json: Record<string, unknown>) => void;
  onBlur?: () => void;
}

function buildSlashSuggestionRender(): Pick<SuggestionOptions<SlashCommandItem>, "render"> {
  return {
    render: () => {
      let component: ReactRenderer<SlashMenuListHandle> | null = null;
      let popup: TippyInstance[] = [];
      return {
        onStart: (props) => {
          component = new ReactRenderer(SlashMenuList, { props, editor: props.editor });
          popup = tippy("body", {
            getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },
        onUpdate(props) {
          component?.updateProps(props);
          popup[0]?.setProps({ getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect() });
        },
        onKeyDown(props) {
          if (props.event.key === "Escape") {
            popup[0]?.hide();
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },
        onExit() {
          popup[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };
}

/** The TipTap editor for a page, per 07-docs-editor.md §4. Content and
 * editability are controlled by the parent (PageView), which owns
 * load/save/autosave; this component only ever reports JSON changes up via
 * onUpdate and never fetches anything itself. */
export const Editor = forwardRef<EditorHandle, Props>(({ content, editable, onUpdate, onBlur }, ref) => {
  const slashCommand = useMemo(() => createSlashCommandExtension(buildSlashSuggestionRender()), []);

  const editor = useEditor({
    editable,
    content,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        validate: (href) => /^(https?:\/\/|mailto:)\S+$/i.test(href),
      }),
      Placeholder.configure({ placeholder: "Enter your content here…" }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Hint,
      ImageNode,
      FileNode,
      slashCommand,
    ],
    onUpdate: ({ editor: e }) => onUpdate(e.getJSON()),
    onBlur: () => onBlur?.(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- content is only the initial doc; later prop changes are applied via setContent in PageView, not here, to avoid fighting the user's cursor.
  }, []);

  useImperativeHandle(ref, () => ({
    getJSON: () => editor?.getJSON() ?? { type: "doc", content: [] },
    focus: () => editor?.commands.focus(),
    insertHeading: () => editor?.chain().focus().setNode("heading", { level: 1 }).run(),
    insertHint: () => editor?.chain().focus().setHint("info").run(),
    insertCodeBlock: () => editor?.chain().focus().toggleCodeBlock().run(),
    insertTable: () => editor?.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run(),
  }));

  if (!editor) return null;

  return (
    <div>
      <FloatingToolbar editor={editor} />
      <EditorContent editor={editor} className="tiptap" />
    </div>
  );
});
Editor.displayName = "Editor";
