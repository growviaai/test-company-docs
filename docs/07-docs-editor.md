# 07 — Spaces, pages, editor, and uploads

## 1. Information architecture

```
Space
 ├─ Page
 ├─ Group
 │   ├─ Page
 │   └─ Page
 └─ Page
     └─ Sub-page (a page can have children)
```

- `pages.kind = 'group'` is a heading-like container with a title only (no content, no URL of its own, always expanded or collapsible in the sidebar).
- A `page` can have sub-pages (`parent_id` points to a page or a group).
- Maximum depth 5 levels.
- URL: `/s/<space-slug>/<slug>/<child-slug>...` built from the chain of page slugs. Groups are skipped in URLs.
- Slugs are unique among siblings. They are generated from the title and can be edited in "Edit title & slug".
- Changing a slug keeps old links working: store the previous slug in a redirect list `[ASSUMPTION: simple table page_slug_history(page_id, old_path)]` or skip in v1 and show a 404 with a search box. Pick the simpler one and tell the owner.

## 2. Reader layout (follow GitBook)

- Left: **space switcher** at the top, then the **page tree** (search box "Find pages…", collapsible groups, drag handles in edit mode).
- Center: page content. Max content width about 746px. Page title 40px/700 with optional emoji on the left, description under it.
- Right (wide screens): "On this page" outline from headings.
- Top bar: breadcrumb, **Edit** / **Done** toggle, history icon, comments icon, theme toggle, user menu.
- Under the content: "Last modified <relative time> by <name>", previous/next page links, and the comments section.
- Frame: content panel with 1px border and 12px radius inside the app background (see `design/spacing-layout.md`).

## 3. Page tree actions

Context menu (⋮) on a page or **+** button in the tree, same menu as GitBook:

| Item | Who |
|---|---|
| Edit title & slug | Member, Admin |
| Add cover `[optional, skip in v1]` | — |
| Insert subpage | Member, Admin |
| Duplicate | Member, Admin |
| Copy link | Member, Admin |
| Move to… (another parent or space) | Member, Admin |
| Version history | Member, Admin |
| Delete | **Author or Admin** |

**Create menu** (the **+** at the top of the tree): Page, Group.

Deleting a page shows a dialog: `Delete "<title>" page?` with the text "Confirming will delete all the content; however, it will still be available in the version history." and buttons **Cancel** and a red **Delete**. Delete is a **soft delete** (`deleted_at`). Children are deleted with it. Admins restore from Trash.

Drag and drop: reorder siblings and move between parents with dnd-kit. The API receives `{ parentId, position }`. Save positions as integers with gaps, renumber on conflict.

## 4. Editor

Use **TipTap** (ProseMirror). Store the document as TipTap JSON in `pages.content`.

### Blocks (v1)

| Block | Slash menu name | Notes |
|---|---|---|
| Paragraph | Paragraph | |
| Heading 1, 2, 3 | Heading 1/2/3 | Auto-generated anchors for the outline |
| Bullet list | Unordered list | |
| Ordered list | Ordered list | |
| Task list | Task list | Checkboxes |
| Code block | Code block | Language selector, syntax highlighting (lowlight) |
| Image | Insert images… | Upload or drag and drop, with optional caption and alt text |
| File | Insert files… | Shows file name, size, and a download button |
| Table | Table | Header row, add/remove rows and columns |
| Hint | Hint | Four styles: info, success, warning, danger |

Inline marks: bold, italic, strikethrough, inline code, link. Links accept only `http`, `https`, and `mailto`.

### Menus

- **Slash menu**: typing `/` on an empty line opens "Insert block…" with a filter box. Groups: "Basic blocks" and "Advanced blocks" (images, files, table). Keyboard: up/down/enter/escape.
- **Floating toolbar** on selection: "Turn into" dropdown (paragraph, headings, lists, code), Bold, Italic, Strikethrough, Code, Link, Clear formatting.
- **Empty page**: show placeholder "Enter your content here…" and quickstart chips (Heading 1, Image, Hint, Code, Table).
- Title field: "Untitled page". Description field: "Page description (optional)".

### Editing rules

- Anyone with space access can edit. Read mode is the default. Click **Edit** to enter edit mode.
- **Autosave**: debounce 2 seconds after the last change, plus on blur and before leaving. Show "Saving…" / "Saved" in the header.
- **Optimistic locking**: the client sends the `revision` it loaded. If the server revision is higher, return `409 REVISION_CONFLICT`. The UI shows a dialog: "This page was changed by <name>. Reload their version or keep yours as a copy." No silent overwrite.
- **Validation on the server**: validate content against a schema (allowed node and mark types only). Reject unknown nodes. Maximum content size 1 MB. This prevents script or HTML injection.
- On every save the API also fills `content_text` (plain text from the JSON) for search.
- Never render raw HTML from content. Render only through TipTap or React components.

### Hint colors
Use the semantic scales: info = blue (bg step 2, border step 4), success = green, warning = yellow, danger = red. Radius 4px. Icon on the left. See `design/colors.md`.

## 5. Uploads

Limits: **25 MB** per file. Allowed types:

| Group | Types |
|---|---|
| Images | png, jpg/jpeg, gif, webp |
| Documents | pdf, txt, csv, md, docx, xlsx, pptx |
| Archives | zip |

**SVG, HTML, JS, and executables are not allowed.**

Flow (direct-to-storage, because Vercel cannot accept 25 MB bodies):
1. Client: `POST /api/v1/uploads/sign` with `{ spaceId, pageId, fileName, mimeType, sizeBytes }`.
2. API checks space access, size, type, and extension. Creates an `attachments` row with `status = 'pending'`. Returns `{ attachmentId, uploadUrl, token }` from Supabase `createSignedUploadUrl`.
3. Client uploads the file straight to Supabase Storage using that URL, with a progress bar.
4. Client calls `POST /api/v1/uploads/:id/complete`.
5. API downloads the first bytes, **checks magic numbers** match the claimed type, confirms the stored size, then sets `status = 'ready'`. If anything is wrong, delete the object and return `422`.
6. The editor inserts an image or file node that stores only `attachmentId` (not a URL).

Viewing: the image or file node calls `GET /api/v1/attachments/:id/url`, which checks access and returns a **signed URL valid for 60 seconds**. The frontend caches it and refreshes before it expires. Downloads set `Content-Disposition: attachment` for non-images. File names are sanitized (strip path characters, limit length).

Cleanup: a daily job (or admin action) deletes `pending` attachments older than 24 hours and storage objects whose attachment is `deleted_at`.

## 6. Duplicate, move, and slug rules

- Duplicate creates a copy named "<title> (copy)" next to the original, with a new slug, same content, `created_by` = current user, and a first version.
- Move changes `parent_id`/`space_id`/`position`. Attachments stay in their original space path; access is checked against the **page's current space**, so keep `attachments.space_id` in sync on move.

## 7. Acceptance criteria

- A member of an unrestricted space can create, edit, and reorder pages; they cannot delete another person's page (API returns 403 and the menu item is hidden).
- Autosave works, a conflict shows the conflict dialog, and no content is lost in either case.
- A 26 MB file and an `.svg` file are rejected with clear messages.
- A user removed from a restricted space gets 404 for its pages, files, and comments at once.
