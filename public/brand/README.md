# OPENFIELD brand assets

Identity round 2, concept **01 Ramp**: *the word opens.* Weight and width travel across the nine letters, from a dense, heavy O to a wide, hairline D, and the same ramp fills a 3 x 3 square that holds the whole name (OPE / NFI / ELD).

Round 1 (purple ring and bead) was rejected and is archived in `brand-archive/v1-open-ring/`.
Preview boards: `brand-preview/index.html` (this identity) and `brand-preview/concepts.html` (all four concepts, side by side).

All SVG is true vector: paths only, transparent background, no text, images, filters, gradients, masks, `<use>`, scripts or external references. Every `viewBox` starts at `0 0` and `width` / `height` keep its exact ratio (default size is half the viewBox).

## Files

| Path | Use |
| --- | --- |
| `logo/openfield-logo.svg` | **Primary logo.** The wordmark, full colour, for light backgrounds. |
| `logo/openfield-logo-dark.svg` | Primary logo for dark backgrounds. |
| `logo/openfield-logo-black.svg`, `-white.svg` | Primary logo in one colour (pure black, pure white). |
| `logo/openfield-horizontal.svg` (+ `-dark`, `-black`, `-white`) | **Horizontal logo:** symbol and wordmark side by side. |
| `logo/openfield-wordmark-text.svg` (+ `-dark`, `-black`, `-white`) | Text-size wordmark with a lighter ramp end and a little more air. Use under 160 px wide. |
| `symbol/openfield-symbol.svg` (+ `-dark`, `-black`, `-white`) | **Standalone symbol:** the 3 x 3 square. Never below 48 px. |
| `favicon/favicon.svg` | Favicon: heavy O on a lime tile. One file serves light and dark browser chrome. |
| `favicon/favicon.ico` | 16, 32 and 48 px in one file. |
| `favicon/favicon-16.png`, `-32.png`, `-48.png`, `apple-touch-icon.png` (180), `icon-512.png` | Raster favicons (opaque tile). |
| `png/` | Transparent PNG previews: logo and horizontal at 2400 px wide, symbol at 1024 px, every skin, plus the orange set. |
| `alt-orange/` | Alternative palette (pure black, white, vivid orange): logo, horizontal, symbol, favicon. |

Skins: no suffix = for light backgrounds; `-dark` = for dark backgrounds; `-black` / `-white` = one colour.
In one colour the lime counter stays open and the F loses its tile; nothing else changes.

## Palette

| Role | Name | Hex | Notes |
| --- | --- | --- | --- |
| Ground | Warm Paper | `#F2F0E9` | Backgrounds. |
| Primary | Deep Ink | `#171717` | Logo, type, dark ground. |
| Accent | Electric Lime | `#C7F464` | Only inside ink shapes (the counter of the O, the tile behind the F) or on dark. |
| Alt ground | Pure White | `#FFFFFF` | |
| Alt primary | Pure Black | `#0B0B0B` | |
| Alt accent | Vivid Orange | `#FF5B35` | Large graphics only on white (3.1 : 1). |

Contrast: ink on paper 15.7 : 1, ink on lime 14.1 : 1, lime on ink 14.1 : 1, **lime on paper 1.1 : 1** (never for text, thin lines or the logo itself).

## Usage

* **Clear space:** at least half the cap height of the wordmark on every side. The horizontal logo uses the same value, measured on its wordmark.
* **Minimum sizes (digital / print):** logo 140 px / 35 mm; text-size wordmark 90 px / 22 mm; horizontal logo 180 px / 45 mm; symbol 48 px / 12 mm; favicon 16 px.
* The favicon is a separate mark on purpose: nine letters cannot be read at 16 px.
* Do not stretch, rotate or recolour the letters, add effects, or put the white logo on a light ground (or the ink logo on a dark one).

## Construction

The letters are outlines of **Archivo** (SIL Open Font License 1.1, Copyright 2020 The Archivo Project Authors), one variable-font instance per letter: weight 900 to 360 and width 62 to 120 across O P E N F I E L D (text size: 900 to 480, 62 to 108). The outlines are merged and re-spaced by area so the white between neighbours grows smoothly. The symbol uses the same weight ramp with each letter widened to fill its cell. No font is needed to render any file here.

## Not done yet

No trademark, domain or social-handle search; no testing on photography, UI or motion.
