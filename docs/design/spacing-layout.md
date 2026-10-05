# GitBook Spacing, Radius, Shadows & Layout

Read from the live GitBook app CSS variables and computed styles (Tailwind v4 based: `--spacing: 0.25rem`).

## Spacing

| Token | Value |
|---|---|
| `--spacing` (base unit) | 0.25rem (4px) |
| `--app-layout-spacing-unit` | 6px (4px × 1.5) |
| `--app-layout-spacing` | ~12.5px (unit × 2 + 0.5px) |

Common paddings seen: nav item `5px 6px`, header icon button `6px`, form button `0 12px`, badge `0 6px`, site list row `8px 10px`, small tab `4px 6px`. Gap between icon and label is `8px` in most buttons.

## Border radius

| Token | Value | Where |
|---|---|---|
| `--radius-xs` | 0.125rem (2px) | — |
| `--radius-sm` | 0.25rem (4px) | Sidebar nav items |
| `--radius-md` | 0.375rem (6px) | Buttons, header menu button |
| `--radius-lg` | 0.5rem (8px) | — |
| `--radius-xl` | 0.75rem (12px) | Main content frame |
| `--radius-2xl` | 1rem (16px) | — |
| `--radius-3xl` | 1.5rem (24px) | — |
| full pill | 9999px | Icon buttons, badges, pill tabs, avatar buttons |

## Layout sizes

| Token | Value |
|---|---|
| `--sidebar-expanded-width` | 260px (nav items inside are 232px wide) |
| `--app-max-width` | 1440px |
| `--app-toolbar-height` | 48.5px |
| `--app-agent-bar-height` | 30px |
| `--app-rail-width` | 22rem (352px) |
| `--app-rail-width-expanded` | 34rem (544px) |
| `--page-layout-default-max-width` | 1200px |
| `--page-layout-wide-max-width` | 970px |
| `--block-wrapper-max-width` | 760px |
| `--toc-desktop-width` | 300px |
| `--page-outline-min-width` / `max-width` | 180px / 264px |

## Frame structure

- Outer app background is the sidebar color (gray-2).
- The main content sits in a framed panel: `1px` border (gray-6), `12px` radius, gray-1 background.
- Sidebar items: 30px tall, `4px` radius, `5px 6px` padding.

## Shadows

| Token | Value |
|---|---|
| `--sp-shadow-button-actions-default` | `0 1px 1px 0 #0000001f, 0 1px 6px 0 #1f29331a` |
| `--sp-shadow-button-actions-hover` | `0 1px 1px 0 #0000002e, 0 1px 6px 0 #1f293326` |
| `--sp-shadow-button-secondary-default` | `0 1px 3px 0 #0000000d, 0 1px 2px -1px #0000000d` |
| `--sp-shadow-button-secondary-hover` | `0 1px 3px 0 #00000014, 0 1px 2px -1px #00000014` |
| `--sp-shadow-overlay` | `0 0 0 1px #0000000f, 0 1px 1px -.5px #0000000f, 0 3px 3px 0 #0000000f, 0 6px 6px 0 #00000005, 0 12px 12px 0 #00000005, 0 16px 16px 0 #00000008` |
| `--sp-shadow-base` | `0 1px 2px 0 #0000009e` |
| `--sp-shadow-elevated` | `0 1px 2px 0 #0000009e, 0 8px 14px 3px #10111152, 0 2px 2px 0 #0000005e` |
| `--sp-shadow-elevated-small` | `inset 0 1px 0 #ffffff0a, 0 -1px 1px #0000002e, 0 6px 12px 1px #0003, 0 2px 2px #0000001f` |
| `--sp-shadow-subtle` | `lch(0% 0 0/.022) 0 3px 6px -2px, lch(0% 0 0/.044) 0 1px 1px` |
| `--sp-shadow-focus-ring` (dark) | `0 0 0 1px #2b2e39, 0 0 0 3px #5d5955` |
| `--sp-shadow-selected-ring` (dark) | `0 0 0 2px #5d5955` |

Filled buttons (primary, danger, upgrade, merge) use a 4-layer bevel shadow, shown in `components.md`.

## Z-index

| Layer | Value |
|---|---|
| promote | 99 |
| overlay, sidesheet, popover, modal | 100 |
| toast | 200 |
| dragged item | 300 |
