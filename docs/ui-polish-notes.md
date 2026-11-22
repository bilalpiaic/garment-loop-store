# UI polish — before / after

Pass date: 2026-11-22 · Branch: `cursor/ui-theme-polish-4d64` · Task: GAR-12

## Goal

Visible first-viewport upgrade for GarmentLoop’s circular atelier brand (Soft Cream / Olive / Ochre / Rust / Sage) without regressing Neon CRUD or admin density.

## Before

- Tokens existed but page chrome felt flat Soft Cream with little atmosphere.
- Home hero used a cold black/zinc gradient over editorial photography; brand sat as a small eyebrow-scale lockup under the headline weight.
- Product “Sale” badges used primary olive (not Rust); “New” badges were generic.
- Admin sidebar used a blue-ish `oklch(0.28 0.04 210)` chrome that fought the storefront palette.
- Admin login used a plain beige page + white card with no brand hierarchy.
- Cart/checkout summary panels were generic bordered cards.

## After

| Surface | Change |
| --- | --- |
| Global | Fixed ochre/sage radial washes + light paper grain; named brand utilities including charcoal; `fade-up` / `fade-in` / `soft-rise` + reduced-motion guard; `.atelier-panel` |
| Home hero | Brand-first Newsreader lockup; olive→charcoal→rust wash; staggered fade-up for brand / headline / copy / CTAs; trust strip remains below fold |
| Header / footer | Olive-deep announcement bar; cream glass sticky header; olive wordmark; sage section labels in footer |
| Product cards | Softer radius; Rust sale badge; cream New badge; serif title → olive on hover; scale hover retained |
| Cart / checkout | Sage eyebrows; atelier-panel summaries; olive-selected shipping/payment radios |
| Admin shell | Olive Deep sidebar + cream accents; cream sticky top bar; olive outline “Add product” |
| Admin login | Brand lockup + sage eyebrow; atelier panel on atmospheric cream |

## Motions shipped (3)

1. Hero image fade-in + staggered text fade-up
2. Product / category image hover scale
3. Cart sheet slide (existing shadcn) + radio/hover color transitions

## Non-goals / preserved

- No schema, API, or Neon persistence changes
- Admin table density and CRUD flows unchanged
- Guest checkout + COD paths untouched functionally

## Verify

- Storefront first viewport: brand dominates, full-bleed hero, no overlay clutter
- `/admin` sidebar reads Deep Olive, not blue-gray
- `npm run build` clean; smoke home + cart + admin login
