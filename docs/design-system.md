# GarmentLoop — Design System

**Atelier Ink** — a premium circular-fashion system: deep forest ink, jewel olive, champagne gold, ivory mist. Tokens live in `src/app/globals.css`; fonts in `src/app/layout.tsx`.

## Brand palette (luxury)

| Token | Hex | Role |
| --- | --- | --- |
| Ink Night | `#0E1612` | Announcement bar, admin sidebar, hero depth, overlays |
| Jewel Olive | `#2F4F3A` | Primary CTAs, brand emphasis |
| Olive Jewel (hover) | `#3D6350` | Primary hover lift |
| Olive Deep | `#1F3328` | Deep chrome / gradients |
| Champagne | `#C8A96B` | Gold accent, underlines, cart badge, sidebar highlight |
| Champagne Soft | `#E6D5B0` | Soft gold washes |
| Ivory Mist / Cream | `#F3EBE0` | Atmosphere, soft surfaces |
| Ivory | `#F7F1E8` | Cards / panels |
| Charcoal Ink | `#1C1F1C` | Body text |
| Copper Burnish | `#A65A3F` | Sale badges / destructive |
| Soft Moss (Sage) | `#8B9A7C` | Section eyebrows, eco cues |

Supporting neutrals: champagne-tinted borders (`#D4C7B2`), muted moss-gray for secondary text. Meet **WCAG AA** (≥ 4.5:1). Prefer Charcoal on Ivory and Ivory on Ink / Jewel Olive.

### CSS mapping

| CSS variable | Intent |
| --- | --- |
| `--ink` | Ink Night |
| `--olive` / `--primary` | Jewel Olive |
| `--champagne` / `--accent` / `--ochre` | Champagne gold (ochre alias kept for legacy class names) |
| `--cream` / `--background` | Ivory mist atmosphere |
| `--copper` / `--rust` / `--destructive` | Copper burnish |
| `--sage` | Soft moss eyebrows |
| `--sidebar` | Ink Night |
| `--charcoal` | Body text |

## Atmosphere

- Fixed champagne + jewel-olive + ink radials over ivory mist; light paper grain.
- `.atelier-panel` — ivory→champagne wash, champagne border, soft ink shadow.
- `.gold-rule` — champagne hairline accent.

## Typography

| Role | Family | Notes |
| --- | --- | --- |
| Headlines / brand | **Newsreader** | Hero brand ~4–6rem; must dominate first viewport |
| Body / UI | **Geist** | Clear labels; not Inter/Roboto |
| Mono | Geist Mono | SKUs |

## Motion (quality over noise)

1. **Hero:** parallax media (`HeroParallax`) + staggered fade-up for brand / headline / CTAs  
2. **Scroll reveal:** `Reveal` (up / slide) on trust strip, grids, story  
3. **Product / category hover:** image scale ~6% + quick-look affordance  
4. **Buttons:** `.btn-lux` lift + `.btn-shimmer` champagne sheen  
5. **Nav:** `.nav-link` champagne underline grow  
6. **Modals / drawers:** ink-tinted backdrop + atelier cart sheet / newsletter invite / product quick look  
7. **ATC:** `.bag-pulse` micro-scale on add  

Respect `prefers-reduced-motion` (parallax, reveals, shimmer, pulse disabled).

## Components

| Pattern | Guidance |
| --- | --- |
| Buttons | Jewel Olive → Olive Jewel hover; champagne outline accents |
| Product cards | Image-led; Quick look modal; New = cream; Sale = Copper |
| Newsletter | Delayed atelier invite (localStorage dismiss); not spammy |
| Cart drawer | Ivory panel, champagne eyebrow, ink overlay |
| Admin | Ink sidebar, champagne role labels; dense tables unchanged |

## Hero composition

First viewport: **GarmentLoop** (hero-level) + one headline + one sentence + CTA group + full-bleed image. No overlay stickers/cards. Trust strip below fold.

## Do / Don’t

**Do:** Ink depth, champagne accents, jewel olive CTAs, serif brand, intentional motion.  
**Don’t:** Purple-indigo AI defaults, flat cream-only clichés, terracotta-on-cream tropes, emoji clutter, noisy infinite loops.

## Files

- `src/app/globals.css` — tokens, atmosphere, motion utilities  
- `src/components/hero-parallax.tsx`, `reveal.tsx`, `newsletter-invite.tsx`, `product-quick-view.tsx`  
- `docs/ui-polish-notes.md` — before/after of polish passes  
