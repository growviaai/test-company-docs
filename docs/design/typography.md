# GitBook Typography

Read from the live GitBook app (app.gitbook.com) using `getComputedStyle` and GitBook's own `--sp-typography-*` CSS variables.

## Font families

| Role | Font | Notes |
|---|---|---|
| App UI (nav, buttons, inputs, headings) | **Inter Variable** | Variable font, weights 100–900 |
| Monospace in the app (e.g. "ULTIMATE" badge) | **IBM Plex Mono** | Loaded weights: 400, 500, 700. Badge uses 600 |
| Published docs: paragraph text | `gitbook-content-font` | Per-site font set in Customize > Theme. Falls back to the system sans stack |
| Published docs: code | `gitbook-code-font` | Per-site font. Falls back to Menlo / monospace |

```css
:root {
  --font-sans: "Inter Variable", "SF Pro Display", -apple-system, BlinkMacSystemFont,
    "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  --font-mono: "IBM Plex Mono", "SFMono Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
}
body { font-family: var(--font-sans); font-size: 13px; font-weight: 450; line-height: 1.25rem; }
```

## App UI scale (`--sp-typography-ui-*`)

| Style | Size | Weight | Line height | Used for |
|---|---|---|---|---|
| Page title | 1.875rem (30px) | 500 | 1.5 | Large page titles |
| Heading large | 1.5rem (24px) | 500 | 1.5 | Page headings ("Account settings", "Teams") |
| Heading medium | 1rem (16px) | 500 | 1.4 | Section headings |
| Heading small | 0.875rem (14px) | 500 | 1.4 | Small headings |
| Heading group | 0.75rem (12px) | 500 | 1.2 | Sidebar group labels ("Organization", "Spaces") |
| Base | 0.8125rem (13px) | **450** | 1.25rem (20px) | Body text, nav items, inputs, links |
| Action | 0.8125rem (13px) | **450** | 1.25rem | Action text |
| Standout | 0.8125rem (13px) | 500 | 1.25rem | Buttons, emphasized labels |
| Small | 0.75rem (12px) | 400 | 1rem (16px) | Captions, small tabs |
| Emphasize | — | 700 | — | Bold emphasis |

The odd **450** weight only works because Inter Variable is a variable font.

## Published docs content scale (`--sp-typography-content-*`)

| Style | Size | Weight | Line height |
|---|---|---|---|
| Page title large | 2.5rem (40px) | 700 | 1.2 |
| Page title medium | 1.875rem (30px) | 700 | 1.2 |
| Heading large | 1.875rem (30px) | 600 | 1.33333 |
| Heading medium | 1.5rem (24px) | 600 | 1.4 |
| Heading small | 1.25rem (20px) | 600 | 1.5 |
| Paragraph | 1rem (16px) | 400 | 1.5 |
| Paragraph small | 0.875rem (14px) | 400 | 1.4 |
| Mono / code | 0.875rem (14px) | 400 | 1.5 |

## Observed in the live UI

| Element | Font | Size | Weight |
|---|---|---|---|
| Page h1 | Inter Variable | 24px | 500 |
| Section h2 | Inter Variable | 14px | 500 |
| Body, links, inputs | Inter Variable | 13px | 450 |
| App buttons (header) | Inter Variable | 13px | 500 |
| Form buttons (Sign out, Delete account) | Inter Variable | 13.33px | 400 |
| Small tab / "Publish" link | Inter Variable | 12px | 400 |
| Plan badge "ULTIMATE" | IBM Plex Mono | 12px, uppercase | 600 |
| Status badges (Verified, Configured) | Inter Variable | 13px | 450 |

## Note on the editor

I couldn't open the page editor on your account because the space is empty and opening it would require creating a change request. The editor styling here comes from your screenshots plus GitBook's content variables above. In the screenshot, the page title is large and bold, the description and placeholder use the muted gray, and the quick-insert chips use a 12–13px UI font.
