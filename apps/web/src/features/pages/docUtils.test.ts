import { describe, expect, it } from "vitest";
import { isEmptyDoc } from "./docUtils";

describe("isEmptyDoc", () => {
  it("is true for a doc with no blocks", () => {
    expect(isEmptyDoc({ type: "doc", content: [] })).toBe(true);
  });

  it("is true when content is missing entirely", () => {
    expect(isEmptyDoc({ type: "doc" })).toBe(true);
    expect(isEmptyDoc(undefined)).toBe(true);
  });

  it("is false once a block exists", () => {
    expect(isEmptyDoc({ type: "doc", content: [{ type: "paragraph" }] })).toBe(false);
  });
});
