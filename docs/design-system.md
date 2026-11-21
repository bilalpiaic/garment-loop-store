# GarmentLoop — Design System

Circular fashion atelier: warm earth tones, editorial serif headlines, clean sans UI. Tokens live in `src/app/globals.css` and Next font variables in `src/app/layout.tsx`.

## Brand palette

| Token | Hex | Role |
| --- | --- | --- |
| Soft Cream | `#F5F1E8` | Page background, soft surfaces |
| Warm Ochre | `#E5B65B` | Secondary accent, highlights |
| Deep Olive | `#4A5F43` | Primary actions, brand emphasis |
| Charcoal | `#333333` | Body text, high-contrast UI |
| Rust | `#B35D44` | CTA / sale / destructive-adjacent accent |
| Sage | `#7D8B6B` | Secondary accent, success/eco cues |

Supporting neutrals: cream-tinted borders, muted olive-gray for secondary text. All body text combinations must meet **WCAG AA** (≥ 4.5:1). Charcoal on Soft Cream and Soft Cream on Deep Olive are preferred pairings.

### CSS mapping (MVP)

| CSS variable | Intent |
| --- | --- |
| `--background` | Soft Cream |
| `--foreground` | Charcoal |
| `--primary` | Deep Olive |
| `--primary-foreground` | Soft Cream |
| `--accent` | Warm Ochre tint |
| `--destructive` / sale cues | Rust |
| `--muted-foreground` | Softened charcoal / sage-leaning mute |
| `--ring` | Deep Olive focus |

## Typography

| Role | Family | Notes |
| --- | --- | --- |
| Headlines | **Newsreader** (`--font-heading`) | Serif; H1 ~2.5rem, H2 ~2rem |
| Body / UI | **Geist** (`--font-sans`) | 1rem body, clear form labels |
| Mono | Geist Mono (system fallback) | SKUs, codes |

Rules: brand name and hero headlines use serif; never let a generic sans H1 overpower the brand lockup. Avoid Inter/Roboto/Arial as primary faces.

## Spacing, radius, elevation

- **Grid:** 4px base (Tailwind spacing scale).
- **Radius:** `--radius: 0.7rem` with sm/md/lg derived scales — soft, not pill-heavy.
- **Elevation:** Prefer subtle borders over multi-layer shadows; soft shadow only for sheets/dialogs.
- **Layout:** Generous whitespace; one job per section.

## Motion

Purposeful, not noisy (2–3 intentional motions on marketing surfaces):

1. Hero / section fade-in on load.
2. Product image gentle scale on hover (~3–5%).
3. Sheet/drawer slide for cart and mobile nav.

Duration ~200–350ms; easing ease-out. Respect `prefers-reduced-motion`.

## Components

| Pattern | Guidance |
| --- | --- |
| Buttons | Primary = Deep Olive; secondary outline Charcoal; hover ±10% lightness; visible focus ring |
| Product cards | Image-led; title + price; avoid heavy card chrome on hero |
| Forms | Labeled inputs, inline Zod errors, 44px touch targets |
| Admin tables | Dense but same tokens; sidebar collapses on tablet |
| Icons | Lucide line icons; limited set |

## Imagery

Editorial photography of garments, fabric, atelier context. Full-bleed hero on home (edge-to-edge). Meaningful `alt` on all product/category images. Prefer WebP via Next Image.

## Do / Don’t

**Do:** Soft Cream atmosphere, olive primary CTAs, serif brand voice, circular/sustainability microcopy.  
**Don’t:** Purple-indigo AI defaults, flat sterile white-only chrome, emoji clutter, floating promo stickers on hero media.

## Implementation files

- `src/app/globals.css` — color tokens
- `src/app/layout.tsx` — font loading
- `src/components/ui/*` — shadcn primitives consuming tokens
