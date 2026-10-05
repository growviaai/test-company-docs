# 11 — Design system

The site must look like GitBook's app UI, in **light and dark** mode with a toggle. All values were read from the live GitBook app and are in the `design/` folder. **Read those four files before writing any UI.**

| File | Contains |
|---|---|
| `design/colors.md` | Full 12-step scales (light and dark), semantic tokens, surface mapping, CSS variables |
| `design/typography.md` | Fonts and type scale |
| `design/spacing-layout.md` | Spacing, radius, shadows, layout sizes |
| `design/components.md` | Buttons, sidebar, inputs, badges, cards |

Do **not** use GitBook's name, logo, or icons as branding. The company's own name and logo go in the header.

## 1. Implementation rules

1. Put tokens in `apps/web/src/styles/tokens.css` as CSS variables under `:root` (light) and `.dark` (dark).
2. Tailwind reads those variables (`tailwind.config.ts` maps color names to `var(--…)`). **Do not hardcode hex values in components.**
3. Theme: `light`, `dark`, or `system`. Default `system`. Toggle in the header. Save in `localStorage` key `theme`. Apply the `dark` class on `<html>` **before first paint** with a tiny inline script in `index.html` to avoid a flash.
4. Fonts: **Inter Variable** for UI, **IBM Plex Mono** for code and badges. Self-host via `@fontsource-variable/inter` and `@fontsource/ibm-plex-mono`. Body text is `13px`, weight `450`, line height `20px`.
5. Build components once in `components/ui/` (Button, IconButton, Input, Textarea, Select, Switch, Badge, Dialog, Menu, Tooltip, Tabs, Table, Avatar, Toast, EmptyState, Skeleton) and reuse them.

## 2. Core tokens (quick reference)

| Token | Light | Dark |
|---|---|---|
| App background (outer, sidebar) | `#faf9f8` | `#1f1d1b` |
| Content panel | `#fdfcfc` | `#1a1816` |
| Hover fill | `#f1efef` | `#282624` |
| Active fill (selected item) | `#eae8e6` | `#312e2c` |
| Border | `#dbd8d6` | `#44403d` |
| Text primary | `#231f1d` | `#eae8e6` |
| Text secondary | `#666260` | `#9a9692` |
| Brand orange | `#fe551b` | `#fe551b` |
| Link | `#2d81e5` | `#2580ea` |
| Danger | `#e10202` | `#e10202` |
| Success | `#1d7253` | `#1d7253` |
| Warning | `#ffa72c` | `#ffa72c` |
| Merge/Violet | `#893fff` | `#893fff` |

Use the 12-step scales in `design/colors.md` for tints (badges, hints, selected states).

## 3. App shell

- Outer background is the app color. The main area is a **framed panel**: 1px border, 12px radius, content-panel background.
- Sidebar width **260px** (items 232px wide, 30px tall, 4px radius, `5px 6px` padding). Collapsible on screens under 1024px (hamburger opens a drawer).
- Header height about 48px: left page/space title, right search, notifications bell, theme toggle, user menu (avatar).
- Page content column max width about 746px, centered. Wide outline column on the right at 1280px and up.

## 4. Components (summary; details in `design/components.md`)

| Component | Spec |
|---|---|
| Primary button | 30px high, 6px radius, padding `0 12px`, 13.33px text. Dark mode: bg `#eae8e6`, text `#1f1d1b`. Light mode: bg `#231f1d`, text `#faf9f8`. Layered bevel shadow (see `design/components.md`) |
| Outlined button | Same size, 1px border (`border` token), text secondary, content-panel background |
| Danger button | bg `#e10202`, white text, same bevel |
| Icon button | 28x28 or 30x30, fully round or 6px radius, ghost |
| Pill chip | Fully round, 28px high, hover fill background, muted text |
| Input | 1px border, 6px radius, 13px text, placeholder in secondary text, focus ring (`0 0 0 1px` inner plus `0 0 0 3px` outer, gray-8) |
| Menu and slash menu | Panel with 1px border, 6px radius, layered soft shadow. Item 32px, padding `6px 12px 6px 14px`. Group label 12px/500 muted. Selected item uses the hover fill |
| Dialog | 576px max width, 8px radius, 1px border. Title 24px/500. Footer separated by a border, buttons right-aligned (Cancel outlined, action primary or danger) |
| Badge | Fully round, 20px high, `0 6px` padding, 13px text. Active = green tint, deactivated = gray, plan/special = pink tint |
| Table | Bordered panel with 12px radius, muted header row, row hover fill, 40–44px rows |
| Toast | Bottom-right, panel style, auto-dismiss in 4 seconds, error toasts stay until closed |
| Avatar | Initials in a circle with a tint from the 12-step scale chosen by hashing the name |

## 5. Editor and content visuals

| Element | Style |
|---|---|
| Page title | 40px, weight 700, line height 48px |
| Heading 1 / 2 / 3 | 30 / 24 / 20px, weight 600 |
| Paragraph | 16px, weight 400, line height 24px, text primary |
| Description and placeholders | Text secondary |
| Quick-insert chips | Pill, hover-fill background, 28px high, muted text |
| Hint block | 4px radius, 1px border. Info: bg blue-2, border blue-4. Same pattern for success, warning, danger |
| Floating toolbar | Panel style, 2px padding, 30x30 icon buttons |
| Code block | Mono font 14px, content-panel-darker background (gray-2), 1px border, 6px radius, language label top-right |
| Table | 1px borders, header row in gray-3, cell padding `8px 12px` |
| Task list | Checkbox with orange checked state |

## 6. Motion and states

- Transitions 120–150 ms, `ease-out`. No decorative animation. Respect `prefers-reduced-motion`.
- Loading: skeleton blocks for lists and pages, spinner only for buttons.
- Every list has an empty state and an error state with a **Retry** button.
- Focus ring on every interactive element. Never remove outlines without replacing them.

## 7. Accessibility

- Contrast AA in both themes (the token pairs above already comply; check custom tints).
- All icon-only buttons have `aria-label`. Dialogs trap focus and close on Escape. Menus are keyboard navigable.
- Do not rely on color alone for status; pair with text or icons.

## 8. Responsive

- ≥1280px: sidebar, content, outline.
- 768–1279px: sidebar plus content.
- <768px: single column, sidebar in a drawer, tables become stacked cards, editor toolbar scrolls horizontally.

## 9. Reference screenshots

`reference-images/` holds real screenshots of GitBook in **dark** and **light** mode. Before building any screen:

1. Open the matching image in both folders (see the table in `reference-images/README.md`).
2. Match layout, spacing, and states, using the exact tokens from `design/` (images are for visual comparison; **tokens are the source of truth**).
3. If a screenshot for a screen or state is missing, build it from the tokens and write "derived, not verified against a screenshot" in your phase report.
4. Do not copy upsell content (for example the Teams upgrade button) or GitBook branding.
