# GitBook Colors

Read from the live GitBook app (app.gitbook.com) by dumping every CSS custom property in **dark** (`theme-color-dark`) and **light** (`theme-color-light`) mode.

GitBook uses a **12-step color scale** per hue (the same model as Radix Colors). Each hue has solid steps `--<hue>-1` … `--<hue>-12` and alpha steps `--<hue>-a1` … `--<hue>-a12`.

## Step meaning

| Step | Role |
|---|---|
| 1 | App background |
| 2 | Subtle background |
| 3 | UI element background |
| 4 | UI element hover |
| 5 | UI element active |
| 6 | Subtle border |
| 7 | Interactive border |
| 8 | Strong border / focus |
| 9 | Solid (brand color) |
| 10 | Solid hover |
| 11 | Low-contrast text |
| 12 | High-contrast text |

## Scales (dark / light)

### gray (= neutral)

| Step | Dark | Light |
|---|---|---|
| 1 | `#1a1816` | `#fdfcfc` |
| 2 | `#1f1d1b` | `#faf9f8` |
| 3 | `#282624` | `#f1efef` |
| 4 | `#312e2c` | `#eae8e6` |
| 5 | `#3a3734` | `#e3e0df` |
| 6 | `#44403d` | `#dbd8d6` |
| 7 | `#4f4b48` | `#d1cdcb` |
| 8 | `#5d5955` | `#bebab7` |
| 9 | `#6d6965` | `#908c89` |
| 10 | `#7a7672` | `#85817f` |
| 11 | `#9a9692` | `#666260` |
| 12 | `#eae8e6` | `#231f1d` |

### orange (= accent = primary)

| Step | Dark | Light |
|---|---|---|
| 1 | `#160f0d` | `#fefcfb` |
| 2 | `#1f1511` | `#fff5f1` |
| 3 | `#38180f` | `#ffe9df` |
| 4 | `#4f1604` | `#ffd7c7` |
| 5 | `#5f1d09` | `#ffc9b5` |
| 6 | `#6f2b16` | `#ffb8a0` |
| 7 | `#883b24` | `#ffa286` |
| 8 | `#af4c2f` | `#f98968` |
| 9 | `#fe551b` | `#fe551b` |
| 10 | `#f04700` | `#f04700` |
| 11 | `#ff9674` | `#dc3b00` |
| 12 | `#ffd6c9` | `#5b2a1c` |

### red (= danger)

| Step | Dark | Light |
|---|---|---|
| 1 | `#1f1614` | `#fffcfb` |
| 2 | `#251816` | `#fff8f6` |
| 3 | `#411510` | `#ffeae6` |
| 4 | `#580b07` | `#ffdad2` |
| 5 | `#67100a` | `#ffcac0` |
| 6 | `#781e16` | `#ffb9ad` |
| 7 | `#912e25` | `#fea496` |
| 8 | `#bb3d31` | `#f68778` |
| 9 | `#e10202` | `#e10202` |
| 10 | `#d00000` | `#d00000` |
| 11 | `#ff907f` | `#de0000` |
| 12 | `#ffd0c8` | `#641d16` |

### yellow (= warning)

| Step | Dark | Light |
|---|---|---|
| 1 | `#1c1813` | `#fefdfb` |
| 2 | `#221b14` | `#fff8ed` |
| 3 | `#332311` | `#ffeecf` |
| 4 | `#442700` | `#ffe1b1` |
| 5 | `#503001` | `#ffd596` |
| 6 | `#5e3d12` | `#ffc886` |
| 7 | `#734e21` | `#f1b775` |
| 8 | `#92632a` | `#e29f4e` |
| 9 | `#ffa72c` | `#ffa72c` |
| 10 | `#f39c18` | `#f29d23` |
| 11 | `#ffb354` | `#b06600` |
| 12 | `#fee2c3` | `#4d361a` |

### green (= success)

| Step | Dark | Light |
|---|---|---|
| 1 | `#121b17` | `#fafefc` |
| 2 | `#151f1a` | `#f3fbf7` |
| 3 | `#113023` | `#e1f8ec` |
| 4 | `#063e2b` | `#cef3e1` |
| 5 | `#064b34` | `#baebd3` |
| 6 | `#0d593f` | `#a5dfc3` |
| 7 | `#116a4c` | `#89cfaf` |
| 8 | `#0e7f5a` | `#5fba93` |
| 9 | `#1d7253` | `#1d7253` |
| 10 | `#016345` | `#016345` |
| 11 | `#6ecea5` | `#247758` |
| 12 | `#a4f4cf` | `#1f4333` |

### blue (= info, links)

| Step | Dark | Light |
|---|---|---|
| 1 | `#111923` | `#fbfdff` |
| 2 | `#131c28` | `#f5f9ff` |
| 3 | `#122947` | `#eaf3ff` |
| 4 | `#0b3261` | `#dbecff` |
| 5 | `#133e72` | `#cae2ff` |
| 6 | `#1f4c83` | `#b7d5fd` |
| 7 | `#2b5c99` | `#9dc4f6` |
| 8 | `#346eb8` | `#78acf0` |
| 9 | `#348df8` | `#348df8` |
| 10 | `#2580ea` | `#2d81e5` |
| 11 | `#7db7ff` | `#1471d8` |
| 12 | `#cde3ff` | `#0e3460` |

### pink (= upgrade)

| Step | Dark | Light |
|---|---|---|
| 1 | `#1e151a` | `#fffcfe` |
| 2 | `#25151e` | `#fef7fb` |
| 3 | `#3a1a2d` | `#fee9f4` |
| 4 | `#4d1739` | `#fbdcec` |
| 5 | `#591f43` | `#f6cfe3` |
| 6 | `#692b51` | `#efc0d9` |
| 7 | `#823b66` | `#e6adcc` |
| 8 | `#a64b82` | `#dd95bd` |
| 9 | `#cf459d` | `#cf459d` |
| 10 | `#c03690` | `#c03790` |
| 11 | `#ff86d4` | `#bc338c` |
| 12 | `#fcd2e8` | `#631748` |

### violet (= merge)

| Step | Dark | Light |
|---|---|---|
| 1 | `#1a0f24` | `#fdfaff` |
| 2 | `#221430` | `#faf4ff` |
| 3 | `#2d1a3f` | `#f4ebff` |
| 4 | `#38214e` | `#ecdeff` |
| 5 | `#43285d` | `#e3d0ff` |
| 6 | `#4f306c` | `#d7bfff` |
| 7 | `#5f3a7f` | `#c5a3ff` |
| 8 | `#724595` | `#b380ff` |
| 9 | `#893fff` | `#893fff` |
| 10 | `#a366ff` | `#7230e6` |
| 11 | `#b380ff` | `#491d72` |
| 12 | `#d7bfff` | `#2a1043` |

> Aliases: `--neutral-*` = gray, `--accent-*` and `--primary-*` = orange, `--danger-*` = red, `--warning-*` = yellow, `--success-*` = green, `--info-*` = blue, `--upgrade-*` = pink, `--merge-*` = violet. Steps 9 and 10 are the same in both modes for most hues.

## Semantic tokens (`--sp-color-*` and friends)

| Token | Dark | Light | Used for |
|---|---|---|---|
| `--color-background` | `#1a1816` | `#ffffff` | Base background token (see note below) |
| `--sp-color-black` | `#eae8e6` | `#231f1d` | Main text color ("black" flips in dark mode) |
| `--sp-color-text-light` | `#9a9692` | `#666260` | Secondary text |
| `--sp-color-text-input-placeholder` | `#4f4b48` | `#d1cdcb` | Input placeholders |
| `--sp-color-text-interactive` | `#2580ea` | `#2d81e5` | Links / interactive text |
| `--link-text-low` / `--link-text-high` | `#7db7ff` / `#cde3ff` | `#1471d8` / `#0e3460` | Link text scale |
| `--sp-color-bg-menu-hover` | `#1f1d1b` | `#faf9f8` | Menu item hover |
| `--sp-color-bg-menu-active` | `#1f1511` | `#fff5f1` | Menu item active (orange tint) |
| `--sp-color-text-menu-default` | `#5d5955` | `#bebab7` | Menu text |
| `--sp-color-icon-menu-default` | `#4f4b48` | `#d1cdcb` | Menu icon |
| `--sp-color-icon-menu-hover` | `#5d5955` | `#bebab7` | Menu icon hover |
| `--sp-color-icon-menu-active` | `#348df8` | `#348df8` | Menu icon active |
| `--sp-color-action-bg-secondary-default` | `#6d6965` | `#ffffff` | Secondary action background |
| `--sp-color-action-bg-nested-hover` | `#2d323a` | `#f1efef` | Nested item hover |
| `--sp-color-action-bg-danger-default` | `#e10202` | `#e10202` | Danger button |
| `--sp-color-action-bg-danger-hover` | `#d00000` | `#d00000` | Danger hover |
| `--sp-color-action-bg-success-default` | `#1d7253` | `#1d7253` | Success button |
| `--sp-color-action-bg-success-hover` | `#016345` | `#016345` | Success hover |
| `--sp-color-action-bg-warning-default` | `#fe551b` | `#fe551b` | Warning button |
| `--sp-color-action-bg-merge-default` | `#893fff` | `#893fff` | Merge button |
| `--sp-color-action-bg-merge-hover` | `#a366ff` | `#7230e6` | Merge hover |
| `--sp-color-action-bg-upgrade-default` | `#cf459d` | `#cf459d` | Upgrade button |
| `--sp-color-action-bg-upgrade-hover` | `#c03690` | `#c03790` | Upgrade hover |
| `--sp-color-badge-text-primary` | `#ffffff` | `#ffffff` | Text on solid badges |
| `--sp-color-badge-border-warning` | `#734e21` | `#f1b775` | Warning badge border |
| `--sp-color-bg-site-status-published` | `#116a4c` | `#89cfaf` | "Published" dot |
| `--sp-color-bg-site-status-unpublished` | `#4f4b48` | `#d1cdcb` | "Not published" dot |
| `--sp-color-icon-diff-added` | `#1d7253` | `#1d7253` | Diff: added |
| `--sp-color-icon-diff-deleted` | `#e10202` | `#e10202` | Diff: deleted |
| `--sp-color-icon-diff-modified` | `#348df8` | `#348df8` | Diff: modified |
| `--sp-color-border-block-reference-frame-active` | `#f04700` | `#f04700` | Active block frame |
| `--sp-color-button-border-top` / `-bottom` | `#0003` / `#fff3` | `#0003` / `#fff3` | Button bevel (top dark, bottom light) |
| `--secondary-button-bg` | `#1a1816` | `#fdfcfc` | Outlined button background |
| `--secondary-button-bg-hover` | `#282624` | `#f1efef` | Outlined button hover |

## How the surfaces map (what you actually see)

| Surface | Dark | Light | Scale step |
|---|---|---|---|
| Outer app / sidebar | `#1f1d1b` | `#faf9f8` | gray-2 |
| Main content panel | `#1a1816` | `#fdfcfc` | gray-1 |
| Selected sidebar item | `#312e2c` | `#eae8e6` | gray-4 |
| Hover / subtle fill, editor chips | `#282624` | `#f1efef` | gray-3 |
| Borders (cards, inputs, frame) | `#44403d` | `#dbd8d6` | gray-6 |
| Primary text | `#eae8e6` | `#231f1d` | gray-12 |
| Secondary text, outlined button text | `#9a9692` | `#666260` | gray-11 |
| Primary (filled) button background | `#eae8e6` | `#231f1d` | gray-12 |
| Primary button text | `#1f1d1b` | `#faf9f8` | gray-2 |
| Brand orange (toggles, accents) | `#fe551b` | `#fe551b` | orange-9 |

> Note: `--color-background` is `#ffffff` in light mode but the visible content panel is `#fdfcfc` (gray-1) and the outer frame is `#faf9f8` (gray-2), which matches your screenshots.

## Badges seen in the app

| Badge | Background | Text |
|---|---|---|
| ULTIMATE plan (dark) | `#3a1a2d` (pink-3) | `#ff86d4` (pink-11) |
| ULTIMATE plan (light) | `#fee9f4` (pink-3) | `#bc338c` (pink-11) |
| Verified / Configured (dark) | `#113023` (green-3) | `#6ecea5` (green-11) |
| Verified / Configured (light) | `#e1f8ec` (green-3) | `#247758` (green-11) |

## CSS (copy-paste)

```css
.theme-color-light {
  --bg-app: #faf9f8;        /* gray-2 */
  --bg-surface: #fdfcfc;    /* gray-1 */
  --bg-hover: #f1efef;      /* gray-3 */
  --bg-active: #eae8e6;     /* gray-4 */
  --border: #dbd8d6;        /* gray-6 */
  --text: #231f1d;          /* gray-12 */
  --text-muted: #666260;    /* gray-11 */
  --brand: #fe551b;         /* orange-9 */
  --brand-hover: #f04700;   /* orange-10 */
  --link: #2d81e5;
  --danger: #e10202;
  --success: #1d7253;
  --warning: #ffa72c;
  --merge: #893fff;
  --upgrade: #cf459d;
}
.theme-color-dark {
  --bg-app: #1f1d1b;
  --bg-surface: #1a1816;
  --bg-hover: #282624;
  --bg-active: #312e2c;
  --border: #44403d;
  --text: #eae8e6;
  --text-muted: #9a9692;
  --brand: #fe551b;
  --brand-hover: #f04700;
  --link: #2580ea;
  --danger: #e10202;
  --success: #1d7253;
  --warning: #ffa72c;
  --merge: #893fff;
  --upgrade: #cf459d;
}
```
