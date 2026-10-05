import { describe, expect, it } from "vitest";
import { filterSlashCommands, SLASH_COMMAND_ITEMS } from "./slashCommand";

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

  it("does not list Image or File (no upload flow exists yet — see extensions/attachments.ts)", () => {
    const titles = SLASH_COMMAND_ITEMS.map((i) => i.title.toLowerCase());
    expect(titles).not.toContain("image");
    expect(titles).not.toContain("file");
  });
});
