import { BubbleMenu } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { useState } from "react";

/** The floating toolbar on selection, per 07-docs-editor.md §4: a "Turn
 * into" dropdown plus Bold, Italic, Strikethrough, Code, Link, Clear
 * formatting. Hidden automatically by BubbleMenu when the selection is
 * empty or inside a code block (shouldShow below). */
export function FloatingToolbar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  function applyLink() {
    const href = linkValue.trim();
    if (!href) {
      editor.chain().focus().unsetLink().run();
    } else if (/^(https?:\/\/|mailto:)\S+$/i.test(href)) {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkOpen(false);
    setLinkValue("");
  }

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100 }}
      shouldShow={({ state, from, to }) => {
        const empty = from === to;
        if (empty) return false;
        const { $from } = state.selection;
        return !$from.parent.type.spec.code;
      }}
    >
      <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1 text-sm shadow-lg">
        {!linkOpen ? (
          <>
            <select
              aria-label="Turn into"
              className="rounded-md border-none bg-transparent px-1 py-1 text-text outline-none"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                const chain = editor.chain().focus();
                if (v === "paragraph") chain.setParagraph().run();
                else if (v === "h1") chain.setNode("heading", { level: 1 }).run();
                else if (v === "h2") chain.setNode("heading", { level: 2 }).run();
                else if (v === "h3") chain.setNode("heading", { level: 3 }).run();
                else if (v === "bulletList") chain.toggleBulletList().run();
                else if (v === "orderedList") chain.toggleOrderedList().run();
                else if (v === "codeBlock") chain.toggleCodeBlock().run();
              }}
            >
              <option value="" disabled>
                Turn into
              </option>
              <option value="paragraph">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="bulletList">Bulleted list</option>
              <option value="orderedList">Numbered list</option>
              <option value="codeBlock">Code block</option>
            </select>
            <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
              B
            </ToolbarButton>
            <ToolbarButton
              label="Italic"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <span className="italic">I</span>
            </ToolbarButton>
            <ToolbarButton
              label="Strikethrough"
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <span className="line-through">S</span>
            </ToolbarButton>
            <ToolbarButton label="Code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
              {"</>"}
            </ToolbarButton>
            <ToolbarButton
              label="Link"
              active={editor.isActive("link")}
              onClick={() => {
                setLinkValue((editor.getAttributes("link").href as string) ?? "");
                setLinkOpen(true);
              }}
            >
              🔗
            </ToolbarButton>
            <ToolbarButton label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().run()}>
              ✕
            </ToolbarButton>
          </>
        ) : (
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              applyLink();
            }}
          >
            <input
              autoFocus
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setLinkOpen(false);
              }}
              placeholder="https://… or mailto:…"
              className="w-56 rounded-md border border-border bg-bg px-2 py-1 text-text outline-none"
            />
            <button type="submit" className="rounded-md bg-accent px-2 py-1 text-white">
              Apply
            </button>
          </form>
        )}
      </div>
    </BubbleMenu>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={!!active}
      onClick={onClick}
      className={`h-7 w-7 rounded-md text-sm font-medium ${active ? "bg-accent text-white" : "text-text hover:bg-bg"}`}
    >
      {children}
    </button>
  );
}
