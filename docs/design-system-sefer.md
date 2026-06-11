# Mishna Yomi — Sefer Design System

Built through the Pristine Site pipeline (internal client), 2026-06-11. The site should
read like an open printed Mishnah: ivory paper, Frank Ruhl Libre letters, thin brass rules.
No emoji anywhere — flourishes are the SVG `<Ornament/>`.

## Tokens (source of truth: `src/app/globals.css` `:root`)

| Token | Hex | Role |
|-------|-----|------|
| `--parchment` | `#FBF6EC` | page background (warm ivory paper) |
| `--parchment-2` | `#F4EAD6` | alternate / sunk panels |
| `--surface` | `#FFFDF8` | cards (warm white) |
| `--ink` | `#221A10` | primary text (warm near-black) |
| `--ink-soft` | `#6F6049` | muted text (warm taupe) |
| `--brass` | `#A07840` | primary accent |
| `--brass-deep` | `#856230` | brass for text on light (AA) |
| `--brass-light` | `#C9A96E` | lighter brass |
| `--brass-glow` | `#E6C982` | gold-leaf highlight |
| `--rule` | `#E4D8C0` | hairline borders |
| `--cream` | `#F6EAD2` | text on dark ink (buttons) |

Deep button/header gradient: `#2E2316 → #1C160D` (sefer ink).

### Legacy aliases (kept so the whole site reskinned in one pass)
`--bg → parchment`, `--fg → ink`, `--muted → ink-soft`, `--border → rule`,
`--gold → brass`, `--gold-dark → brass-deep`, `--navy → #2A2014` (was blue; now deep ink),
`--font-playfair → Frank Ruhl`, `--font-hebrew → Frank Ruhl`.
Any file still referencing the old names renders correctly because of these aliases.

## Type
- **Display + Hebrew:** Frank Ruhl Libre (`--font-frank`), weights 400/500/700/900,
  subsets `latin` + `hebrew`. Loaded via `next/font/google` in `layout.tsx`. This is the
  classic Hebrew sefer face — it carries both the English headings and the Hebrew.
- **UI / body:** Inter (`--font-inter`).
- Playfair Display and the manual Noto Serif Hebrew `<link>` were removed.

## Seder colors (homepage + browse)
Six muted earth tones (brass, espresso, umber, olive, terracotta, slate) instead of the old
rainbow — they sit on parchment like ink stamps. Defined inline in `HomeAnimations.tsx` and
`browse/page.tsx` (`SEDER_PALETTES`).

## Primitives
- `.btn-primary` — sefer-ink gradient pill, cream text, brass inset highlight.
- `.btn-gold` — brass gradient pill, white text.
- `.btn-ghost` — outline, brass on hover.
- `.card` / `.card-gold` — warm-white panels; `.card-gold` has a brass top-rule (`::before`).
- `.sefer-frame` — double border like a printed page frame (used on logo marks).
- `.dropcap`, `.eyebrow`, `.divider-gold` — sefer text flourishes.
- `<Ornament/>` and `<SeferDivider/>` — `src/components/Ornament.tsx` (brass four-point star).

## Email (`src/lib/email/templates.ts`)
Daily reminder + welcome emails reskinned from dark-navy to the same parchment/ink/brass
palette (email-safe hex, Georgia/Times serif, sefer-ink CTA pill).

## Surfaces covered
Homepage (hero + sections), NavBar, footer, `/cycles`, `/settings`, `/learn`, `/progress`,
`/calendar`, `/browse`, `/auth/login`, `/unsubscribe`, both email templates.

## QA (2026-06-11)
- `tsc --noEmit` clean.
- `next build` clean — 11 routes, Frank Ruhl (hebrew subset) compiled.
- All 9 page routes return 200 on a prod server; rendered HTML carries the sefer tokens and
  contains **no** old-palette literals (`#1e3a5f`, `#040d1a`, `30,58,95`, `#2d5a8e`).
- Visual screenshot QA deferred: the shared Playwright Chrome profile was locked. Click
  through once locally to eyeball motion + mobile before relying on it.

## Extending
Add a new page → reference the tokens / primitives above; it inherits the system for free.
Future brand assets (animated hero, more emails) should target this same token set.
