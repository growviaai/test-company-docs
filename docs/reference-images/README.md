# Reference images (GitBook UI)

Screenshots of the GitBook app that the new site should look like. The AI builder must **compare its UI against these images** in both themes, together with the exact values in `../design/`.

Folders: `dark/` and `light/`. Matching screens use the same file name in both folders.

## What is here now

| # | File name | Screen | Dark | Light | Use it for |
|---|---|---|---|---|---|
| 01 | `01-editor-new-page.png` | Page editor, new empty page | Yes | **Missing** | Editor layout, top bar, pages panel, placeholders, quickstart chips |
| 02 | `02-account-settings-general.png` | Account settings, General | Yes | **Missing** | `/settings/profile` and `/settings/security` (section cards, rows, badges, danger zone) |
| 03 | `03-account-notifications.png` | Notification settings | Yes | **Missing** | Notification preferences table and orange switches |
| 04 | `04-docs-sites.png` | All docs sites (card grid) | Yes | Yes | Card grid, plan badge, toolbar with search and filters, primary button (use for the Spaces list) |
| 05 | `05-home.png` | Home / welcome | Yes | Yes | App home: welcome block with search, cards, "recent" table or empty state |
| 06 | `06-members.png` | Members and permissions | Yes | **Missing** | Admin Users table: search, role filter, role dropdown, row menu, pagination |
| 07 | `07-teams.png` | Teams (upgrade empty state) | Yes | **Missing** | Empty-state pattern only. **Do not copy the upsell or pink upgrade buttons** |
| 08 | `08-invite-links.png` | Invite links | **Missing** | Yes | Admin Invites screen: switch card, section headings with help text, empty panels |

## What each screen shows (so the AI knows what to copy)

- **01 Editor:** left sidebar (260 px) with org switcher, nav, group labels. A second column "Pages / Library" tabs, a **+** button, "Find pages…" search, and the selected page row. Top bar: breadcrumb, **Draft** pill, tabs (Overview, Editor, Changes, Preview), **…** menu, comment and history icons, purple **Merge** button with a dropdown arrow. Centre column: emoji + large page title, description placeholder, content placeholder, quick-insert pills (Heading 1, Image, Hint, Expandable, Code), and a **QUICKSTART** row of outlined buttons at the bottom.
- **02 Account settings:** page title with subtitle; sections "Your profile", "Login", "Two-step authentication", "Preferences", "Account actions". Each section is a bordered card with rows (icon, title, helper text, right-aligned action). Badges "Verified" and "Configured" are green pills. The last card has a **red border** with Sign out and a red **Delete account** button.
- **03 Notifications:** one bordered table. Header row (Notification, Email, In app), each row has a bold group name, a muted description with an info icon, and two orange switches.
- **04 Docs sites:** large heading with a count, toolbar on the right (search input, two icon buttons, primary **Create docs site**), thumbnail cards with title, plan badge, status text, and age.
- **05 Home:** centered welcome card (greeting, title, wide search input), a "Last visited" section with small cards, and "Your recent changes" as a bordered table or an empty state with centered text.
- **06 Members:** heading + subtitle, primary button top right, search input and role filter, bordered table with columns Name (avatar, name, email), Role (select), Last seen (sortable), counts as underlined links, and a **⋮** row menu. "10 per page" select under the table.
- **07 Teams:** an empty-state card with an icon, two lines of help text, and an action button.
- **08 Invite links:** page title, a card with title, description and an orange switch, then two sections each with a heading, help text, and an empty bordered panel with centered text.

## How these map to our website

| Our screen | Reference |
|---|---|
| App shell, sidebar, header | 01, 05 |
| Home `/` | 05 |
| Spaces list (admin) | 04 |
| Page reader and editor | 01 |
| Admin Users | 06 |
| Admin Invites | 08, 06 |
| Admin Sessions, Audit log, Trash | 06 (table pattern) |
| Settings → Profile, Security | 02, 03 |
| Empty states | 05, 07, 08 |

## Still needed (the AI could not capture these)

The tool that takes browser screenshots saves them to the owner's own computer, not into this folder, so these files must be added by the owner. Until then the AI builds those states from the tokens in `../design/` and **flags each one as "derived, not verified against a screenshot"**.

Take them at about 1920 × 945 px, once in **Dark** and once in **Light** (switch in GitBook: Account settings → General → Preferences → Appearance). Save with the exact names below into `dark/` and `light/`.

### Missing counterparts of existing screens
- `light/01-editor-new-page.png`
- `light/02-account-settings-general.png`
- `light/03-account-notifications.png`
- `light/06-members.png`
- `light/07-teams.png`
- `dark/08-invite-links.png`

### New screens to add (both `dark/` and `light/`)

| File name | What to show |
|---|---|
| `09-editor-edit-content-modal.png` | Click **Edit** on a space: the "Edit content" dialog (Title, Description, buttons) |
| `10-editor-create-page-menu.png` | The **+** menu in the Pages panel (Page, Group, Link to…, Import pages) |
| `11-editor-slash-menu.png` | Type `/` in the page body: the "Insert block…" menu |
| `12-editor-floating-toolbar.png` | Select some text: the floating formatting toolbar |
| `13-editor-content-blocks.png` | A page with Heading 1/2/3, a paragraph, lists, a task list, a code block, a table, an image, and a Hint |
| `14-editor-page-actions-menu.png` | The **⋮** menu next to the page title |
| `15-editor-delete-page-dialog.png` | The "Delete page?" confirmation dialog |
| `16-editor-merge-dropdown.png` | The dropdown on the purple Merge button |
| `17-editor-version-history.png` | The page history panel (clock icon) |
| `18-editor-comments-panel.png` | The comments panel with a thread and a reply |
| `19-search-dialog.png` | The search dialog (the magnifier in the header) with results |
| `20-user-menu.png` | The profile or organization menu (top-left) opened |
| `21-sign-in.png` | The GitBook sign-in screen (for the `/sign-in` layout) |
| `22-toast-and-error-states.png` | A toast message and an inline form error, if you can trigger them |

### Rules for adding screenshots
1. Crop out browser chrome; show only the app.
2. Same screen, same content, in both themes.
3. No real personal data (blur emails and avatars if needed).
4. After adding files, tick them off in this README and keep the "Dark / Light" columns accurate.
