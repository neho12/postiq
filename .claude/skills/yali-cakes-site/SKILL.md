---
name: yali-cakes-site
description: Build or maintain a Hebrew RTL small-business site (bakery, studio, workshops) from a Claude Design export, with a quiet motion layer, mobile fixes, marketing copy and SEO. Use for YALI CAKES (yali-cakes/) or any similar one-page business site.
---

# YALI CAKES site workflow

Reference implementation: `yali-cakes/` in this repo. Templates: `templates/enhance.css`, `templates/enhance.js`.

## Principle
Keep the Claude Design export intact (copy, forms, links, React `x-dc` markup). All motion and fixes live in separate `enhance.css` / `enhance.js`. Presentation only: never change copy, links or form logic from the motion layer.

## Workflow (invoke these skills in order)
1. **Structure and strategy**: `anthropic-skills:product-marketing`, `site-architecture`, `offers`. Define sections: hero, cakes, workshops, desserts, gallery, about, FAQ, order forms, legal.
2. **Visual design**: `anthropic-skills:ui-ux-pro-max` and `frontend-design` for palette, type, spacing, components. Brand colours used: blush `#FAE4EA`, cocoa `#694B3A`.
3. **Copy**: `anthropic-skills:marketing-psychology` / `persuasion-audit` (honest levers only, `dark-pattern-check` for any urgency or scarcity), then `stop-slop` to clean Hebrew copy. Order via WhatsApp is the main CTA.
4. **Motion**: `anthropic-skills:scroll-craft` for scroll behaviour; optionally `21st:21st-ui` for inspiration. Then apply `templates/enhance.*`.
5. **SEO**: `anthropic-skills:seo`, `seo-audit`, `schema`. Hebrew title and description, Open Graph (`he_IL`), JSON-LD `Bakery`, `lang="he" dir="rtl"`, GA tag.
6. **Verify** at phone width and desktop with Playwright screenshots, plus a `prefers-reduced-motion` run.

## Motion decisions (learned the hard way)
- Tried: GSAP ScrollTrigger, SplitText masks, arch reveals, pinned horizontal strip, parallax sprinkles, layer-cake scene, custom cursor, magnetic buttons, velocity skew, gallery colour panels.
- Kept: Lenis smooth scroll, soft fade-up (`.rv` -> `.in` via IntersectionObserver), calm hover states, nav underline, FAQ chevron, opening screen.
- Rule: start quiet. Heavy effects were removed because they fought the content and phone performance.
- Opening screen: logo drawn by stroke, two colour layers lift away, 3s minimum, 5s cap, 7s failsafe in `<head>` so content never stays hidden.
- Disable all of it under `prefers-reduced-motion`.

## Gotchas
- Include `<meta name="viewport" content="width=device-width, initial-scale=1">` or the site renders desktop-wide on phones.
- Original design animations must be neutralised under `html.fx` (`animation:none!important`) so the motion layer owns them.
- Force scroll to top on load (`history.scrollRestoration='manual'`) unless a hash is present.
- In-page anchor links: use Lenis `scrollTo` but dispatch `hashchange` so the legal panels still open; offset -72 for the sticky nav.
- Forms: one column, equal field height (48px); iOS date/time inputs need `appearance:none`, `min-width:0`, `text-align:start`.
- `max-width` rules on `.grp` / `.row2` from the export must be overridden for the single-column layout.
- Assets are hashed files in `assets/` (webp, one mp4, svg logo); keep file names stable.
