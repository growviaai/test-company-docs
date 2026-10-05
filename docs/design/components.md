# GitBook Components

Computed styles read from the live app (dark mode), with light-mode equivalents verified by switching the theme class. Colors reference the scales in `colors.md`.

## Filled button bevel shadow (shared)

```css
box-shadow:
  0 1px 1px 0 rgba(0,0,0,0.12),
  0 1px 6px 0 rgba(31,41,51,0.10),
  inset 0 -1px 0.4px 0 rgba(0,0,0,0.20),
  inset 0 1px 0.4px 0 rgba(255,255,255,0.20);
```

## Buttons

All form buttons: 30px tall, 6px radius, `0 12px` padding, 13.33px text.

| Variant | Dark | Light | Notes |
|---|---|---|---|
| **Primary** ("Publish", "Create docs site", "Invite new members") | bg `#eae8e6`, text `#1f1d1b` | bg `#231f1d`, text `#faf9f8` | Bevel shadow |
| **Outlined / secondary** ("Upload a new photo", "Sign out", "Unlink", "Skip for now") | bg `#1a1816`, text `#9a9692`, 1px border `#44403d` | bg `#fdfcfc`, text `#666260`, 1px border `#dbd8d6` | No shadow |
| **Danger** ("Delete account") | bg `#e10202`, text `#fff` | same | Bevel shadow |
| **Upgrade** ("Upgrade", "Upgrade to use Teams") | bg `#cf459d`, text `#fff` | same | Bevel shadow |
| **Merge** ("Merge") | bg `#893fff` (hover `#a366ff`), text `#fff` | bg `#893fff` (hover `#7230e6`) | Bevel shadow |
| **Ghost / text** ("Edit") | transparent, text `#9a9692` | transparent, text `#666260` | 6px radius |
| **Header menu button** (org switcher) | bg `#1f1d1b`, text `#eae8e6` | gray-2 | 32px tall, 6px radius, 13px / 500 |
| **Icon button** (search, notifications) | bg `#1f1d1b` | gray-2 | 28×28, fully round |
| **Pill tab** ("Docs") | bg `#1a1816`, text `#9a9692`, border `#44403d` | gray-1 / gray-11 / gray-6 | Fully round, 30px tall |

## Sidebar

| Part | Style |
|---|---|
| Container | 256px wide, background gray-2 (`#1f1d1b` / `#faf9f8`) |
| Nav item | 232px × 30px, 4px radius, padding `5px 6px`, gap 8px, text 13px / 450 |
| Nav item active | bg gray-4 (`#312e2c` / `#eae8e6`), text gray-12 |
| Group label ("Organization", "Spaces") | 12px, weight 500, color gray-11 |
| Bottom utility icons | Round icon buttons, icon color gray-8-ish (`#5a5754` dark / `#b1afae` light) |

## Inputs

| Part | Style |
|---|---|
| Search / text field wrapper | 1px border (`#44403d` / `#dbd8d6`), bg gray-1, ~6px radius |
| Input element | Transparent bg, 13px / 450, text gray-12 |
| Placeholder | gray-11 in the app (`#9a9692` / `#666260`) |

## Badges

| Badge | Dark | Light | Shape |
|---|---|---|---|
| Plan ("ULTIMATE") | text `#ff86d4`, bg `#3a1a2d` | text `#bc338c`, bg `#fee9f4` | IBM Plex Mono 12px / 600 uppercase, pill |
| Status ("Verified", "Configured") | text `#6ecea5`, bg `#113023` | text `#247758`, bg `#e1f8ec` | 20px tall, `0 6px` padding, 13px / 450, fully round, 1px transparent border |
| Site status dot | published `#116a4c` / unpublished `#4f4b48` | `#89cfaf` / `#d1cdcb` | — |

## Cards and panels

| Part | Style |
|---|---|
| Main content frame | bg gray-1, 1px border gray-6, 12px radius |
| Setting card / table | 1px border gray-6, rounded (~8–12px), bg gray-1 |
| Docs-site thumbnail | Always white (`#ffffff`) in both themes |
| Danger zone card | Red-tinted border (dark `#531c16`) |

## Toggle switch

I couldn't read the toggle from the live page. From your screenshots: orange `#fe551b` track when on, white knob, roughly 36×22px pill, in both themes.

## Editor (from your screenshots)

| Part | Style |
|---|---|
| Top bar | "Draft" status pill, tabs (Overview, Editor, Changes, Preview), purple **Merge** button on the right |
| Page title | Large bold title, with emoji icon to the left |
| Description / placeholder | Muted gray (`#9a9692` dark) |
| Quick-insert chips (Heading 1, Image, Hint, Expandable, Code) | bg `#282624` (dark), pill shape, 12–13px |
| Quickstart row | Same chip style under a small uppercase "QUICKSTART" label |
