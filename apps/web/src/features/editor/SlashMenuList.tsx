import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { SlashCommandItem } from "./extensions/slashCommand";

export interface SlashMenuListHandle {
  onKeyDown: (e: { event: KeyboardEvent }) => boolean;
}

interface Props {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

/** The slash menu's popup content. Grouped by "Basic blocks" / "Advanced
 * blocks" per 07-docs-editor.md §4, with up/down/enter/escape keyboard nav —
 * the imperative `onKeyDown` handle is how @tiptap/suggestion forwards the
 * editor's keydown events into this list (escape is handled by suggestion
 * itself, closing the popup, so it isn't duplicated here). */
export const SlashMenuList = forwardRef<SlashMenuListHandle, Props>(({ items, command }, ref) => {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowDown") {
        setSelected((i) => (items.length ? (i + 1) % items.length : 0));
        return true;
      }
      if (event.key === "ArrowUp") {
        setSelected((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
        return true;
      }
      if (event.key === "Enter") {
        if (items[selected]) command(items[selected]);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="w-56 rounded-md border border-border bg-surface p-2 text-sm text-muted shadow-lg">
        No matching blocks
      </div>
    );
  }

  const groups: SlashCommandItem["group"][] = ["Basic blocks", "Advanced blocks"];
  let flatIndex = -1;

  return (
    <div
      role="listbox"
      aria-label="Insert block…"
      className="max-h-80 w-56 overflow-y-auto rounded-md border border-border bg-surface p-1 shadow-lg"
    >
      {groups.map((group) => {
        const groupItems = items.filter((i) => i.group === group);
        if (groupItems.length === 0) return null;
        return (
          <div key={group}>
            <p className="px-2 pt-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted">{group}</p>
            {groupItems.map((item) => {
              flatIndex += 1;
              const isSelected = flatIndex === selected;
              return (
                <button
                  key={item.title}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => command(item)}
                  className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    isSelected ? "bg-accent text-white" : "text-text hover:bg-bg"
                  }`}
                >
                  {item.title}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
});
SlashMenuList.displayName = "SlashMenuList";
