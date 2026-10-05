import { describe, it, expect } from "vitest";
import { extensionOf, sanitizeFileName, isAllowedUpload, matchesMagicNumber, storagePathFor } from "./storage.js";

describe("extensionOf", () => {
  it("lowercases and strips the dot", () => {
    expect(extensionOf("Report.PDF")).toBe("pdf");
  });
  it("returns empty string for no extension", () => {
    expect(extensionOf("README")).toBe("");
  });
});

describe("sanitizeFileName", () => {
  it("strips path separators so no nested path can form", () => {
    const sanitized = sanitizeFileName("../../etc/passwd.txt");
    expect(sanitized).toBe(".._.._etc_passwd.txt");
    expect(sanitized).not.toContain("/");
    expect(sanitized).not.toContain("\\");
  });
  it("truncates a very long name but keeps the extension", () => {
    const long = "a".repeat(300) + ".png";
    const sanitized = sanitizeFileName(long);
    expect(sanitized.endsWith(".png")).toBe(true);
    expect(sanitized.length).toBeLessThan(200);
  });
});

describe("isAllowedUpload", () => {
  it("allows a matching extension/mime pair", () => {
    expect(isAllowedUpload("photo.png", "image/png")).toBe(true);
  });
  it("rejects a mismatched mime type for the extension", () => {
    expect(isAllowedUpload("photo.png", "image/svg+xml")).toBe(false);
  });
  it("rejects disallowed extensions outright (svg, html, js, exe)", () => {
    expect(isAllowedUpload("logo.svg", "image/svg+xml")).toBe(false);
    expect(isAllowedUpload("page.html", "text/html")).toBe(false);
    expect(isAllowedUpload("script.js", "application/javascript")).toBe(false);
    expect(isAllowedUpload("tool.exe", "application/octet-stream")).toBe(false);
  });
});

describe("matchesMagicNumber", () => {
  it("accepts real PNG bytes", () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(matchesMagicNumber("photo.png", pngHeader)).toBe(true);
  });
  it("rejects bytes that don't match the claimed extension (a renamed exe)", () => {
    const exeHeader = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]); // "MZ" DOS header
    expect(matchesMagicNumber("photo.png", exeHeader)).toBe(false);
  });
  it("passes plain-text formats through without a signature check", () => {
    expect(matchesMagicNumber("notes.txt", new Uint8Array([0x68, 0x69]))).toBe(true);
  });
});

describe("storagePathFor", () => {
  it("namespaces by space and attachment id", () => {
    const path = storagePathFor("space-1", "att-1", "report.pdf");
    expect(path).toBe("space-1/att-1/report.pdf");
  });
});
