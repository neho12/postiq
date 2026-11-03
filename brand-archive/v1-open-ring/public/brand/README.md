# OPENFIELD brand assets

True-vector SVG, transparent background, no raster, no filters, no live text, no external dependencies.
The wordmark is outlined (custom-drawn geometric capitals), so no font is needed to render it.

| File | Use |
| --- | --- |
| `openfield-primary.svg` | Primary horizontal lockup, full colour. Master artwork for light backgrounds. |
| `openfield-horizontal.svg` | Same lockup, themeable: ring and wordmark use `currentColor`, the bead uses `--openfield-accent` (default `#7952F5`). Inline it, or use it in an `<img>` for the default colours. |
| `openfield-stacked.svg` | Vertical lockup (symbol above wordmark), full colour. |
| `openfield-icon.svg` | Standalone symbol (ring + bead). |
| `favicon.svg` | Simplified 32 x 32 symbol for 16 x 16 use. Switches to white + lavender in dark browser themes. |
| `openfield-light.svg` | Lockup for light backgrounds (same artwork as `primary`, semantic alias for theming). |
| `openfield-dark.svg` | Lockup for dark backgrounds: white wordmark, Soft Lavender bead. |
| `openfield-monochrome.svg` | Single colour, pure black. |
| `openfield-monochrome-white.svg` | Single colour, pure white. |
| `openfield-wordmark.svg`, `openfield-wordmark-white.svg` | Wordmark only. |
| `openfield-stacked-dark.svg`, `openfield-stacked-monochrome.svg` | Vertical lockup variants. |
| `openfield-icon-dark.svg`, `openfield-icon-monochrome.svg`, `openfield-icon-monochrome-white.svg` | Symbol variants. |

## Palette

| Role | Name | Hex |
| --- | --- | --- |
| Primary | Deep Black | `#101014` |
| Primary | Pure White | `#FFFFFF` |
| Primary (accent) | Electric Purple | `#7952F5` |
| Secondary | Soft Lavender | `#A78BFA` (the accent on dark backgrounds) |
| Secondary | Charcoal | `#24242B` |
| Secondary | Light Gray | `#F4F4F6` |

## Usage

```html
<img src="/brand/openfield-primary.svg" alt="OPENFIELD" height="32">
<link rel="icon" type="image/svg+xml" href="/brand/favicon.svg">
```

Clear space is half the cap height of the wordmark (`x`) on every side. Minimum width: horizontal 96 px, stacked 72 px, symbol 28 px, favicon 16 px.
Full guidelines: `brand-preview/index.html`.
