/** True when a TipTap document has no blocks at all — drives the empty-page
 * placeholder and quickstart chips in 07-docs-editor.md §4 ("Empty page:
 * show placeholder … and quickstart chips"). Pulled out of PageView.tsx so
 * it has a plain, DOM-free unit test. */
export function isEmptyDoc(content: Record<string, unknown> | undefined): boolean {
  const c = content?.content;
  return !Array.isArray(c) || c.length === 0;
}
