import { describe, expect, it, vi } from "vitest";
import { buildAttachmentSlashItems, filterSlashCommands, SLASH_COMMAND_ITEMS } from "./slashCommand";

describe("slash command menu", () => {
  it("groups every item into Basic blocks or Advanced blocks (07-docs-editor.md §4)", () => {
    for (const item of SLASH_COMMAND_ITEMS) {
      expect(["Basic blocks", "Advanced blocks"]).toContain(item.group);
    }
  });

  it("filterSlashCommands('') returns every item", () => {
    expect(filterSlashCommands("")).toHaveLength(SLASH_COMMAND_ITEMS.length);
  });

  it("filters case-insensitively by title substring", () => {
    const results = filterSlashCommands("head");
    expect(results.map((r) => r.title)).toEqual(["Heading 1", "Heading 2", "Heading 3"]);
  });

  it("returns nothing for a query matching no block", () => {
    expect(filterSlashCommands("zzzz")).toHaveLength(0);
  });

  it("does not list Image or File among the static items (they're built separately, with upload context — see buildAttachmentSlashItems)", () => {
    const titles = SLASH_COMMAND_ITEMS.map((i) => i.title.toLowerCase());
    expect(titles).not.toContain("image");
    expect(titles).not.toContain("file");
  });

  it("buildAttachmentSlashItems wires Image/File to the file-picker callback, not a direct insert", () => {
    const onPickFile = vi.fn();
    const items = buildAttachmentSlashItems(onPickFile);
    expect(items.map((i) => i.title)).toEqual(["Image", "File"]);

    const fakeEditor = { chain: () => fakeEditor, focus: () => fakeEditor, deleteRange: () => fakeEditor, run: () => undefined } as never;
    items[0].run(fakeEditor, { from: 0, to: 1 });
    expect(onPickFile).toHaveBeenCalledWith("image");
    items[1].run(fakeEditor, { from: 0, to: 1 });
    expect(onPickFile).toHaveBeenCalledWith("file");
  });

  it("filterSlashCommands merges in extra items (e.g. Image/File) alongside the static list", () => {
    const extra = buildAttachmentSlashItems(() => undefined);
    expect(filterSlashCommands("", extra)).toHaveLength(SLASH_COMMAND_ITEMS.length + 2);
    expect(filterSlashCommands("ima", extra).map((i) => i.title)).toEqual(["Image"]);
  });
});
