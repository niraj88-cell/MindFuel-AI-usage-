# SatyaShift — Design Audit & Design Language (2026-07-03)

Scope: every web UI, every extension UI, the design system itself. Method: Research →
Audit → Challenge → Remove → Redesign → Validate. Nothing in here is taste-only; each
change names the evidence. This document is the durable reference; the enforcement
summary lives in `CLAUDE.md` and `docs/DECISIONS.md`.

---

## 1. Why the interface felt generic (the audit)

The 2026-07-02 experience audit already fixed the *experience* (calm Today page, honest
verification vocabulary, one-action popup, non-punitive copy). What remained was the
*visual foundation* — and it was not merely generic, it was absent:

1. **The shipped design system belonged to a different product.**
   `web/app/globals.css` was 751 lines of "MindFuel × Spider-Verse": glassmorphism cards,
   gradient text, floating orbs, web-swing keyframes, category pills, neon glows.
   **Zero of it was used by any page** (verified by grep) — but it shipped in every
   response, set the `body` background to `#0A0A0F` dark (every page painted cream over
   it), and was the exact catalogue of recognized AI-generated UI patterns: glassmorphism,
   animated gradient blobs, indigo/violet accents, glow borders.

2. **The product had no typeface.** The CSS referenced `Outfit` and `Instrument Serif`;
   neither was ever loaded. Every page — including Satya's serif voice, the most
   distinctive element in the product — rendered in system fallbacks (the serif fell back
   to Georgia silently). A product about precision and truth had accidental typography.

3. **No tokens; fifteen hex values hand-copied across ~20 files.** All of them Tailwind
   or Material defaults: `#111827` (Tailwind gray-900) for ink, `#6B7280`/`#4B5563`/
   `#9CA3AF` (gray-500/600/400) for text, `#2E7D32`/`#4CAF50`/`#E8F5E9` (Material green)
   for the brand color. Drift had already started: login errors used Tailwind
   `red-50/red-700` while everything else used `#B42318`. Default-palette color is the
   single strongest "generated" signal an experienced designer reads.

4. **The deleted dark product still leaked through.** `error.tsx` ("System Glitch",
   indigo glow button), `not-found.tsx` ("Lost in the digital void"), `global-error.tsx`
   ("Critical Error", dark navy), the admin loading state ("Decrypting Secure Neural
   Link") — sci-fi theater copy on dark backgrounds inside a cream product that promises
   calm honesty. One stray 404 shattered the entire identity.

5. **Recognized AI patterns in the live surfaces:** the icon-in-rounded-tile at the top
   left of cards (Puzzle, UserPlus chips), a `Sparkles` icon on the Plan section, three
   icon feature-cards on the login hero, `rounded-2xl/3xl` balloon geometry on every
   element, and lucide `Shield` icons doing decorative trust-signaling everywhere.

6. **Dead weight:** 8 unused UI components (`WebPattern`, `WebCorner`, `AccentButton`,
   `badge`, `card`, `progress`, `slider`, `tabs`), 6 orphaned `lib/fuel/*` engines from
   the deleted coach, 7 orphaned public images including Next.js starter SVGs.

Research base: what makes Linear/Raycast/Arc/Notion feel crafted is not their look but
their discipline — one accent used sparingly, a deliberate typographic signature, dense
information executed calmly, and motion that only confirms. The generic-AI catalogue is
the inverse: default palettes, default radii, decorative icons, dark-neon reflexes.
(References: logrocket.com/ux-design/linear-design, VoltAgent/awesome-design-md raycast
notes, vibecodekit.dev/ai-slop-design, impeccable.style/slop.)

---

## 2. The identity: "a ledger of truth"

SatyaShift's promise is सत्य — an honest witness. The interface is therefore designed as
**a quiet ledger**: warm paper, dark warm ink, and one green thread that appears only
where something was actually verified. Trust is communicated the way a well-kept record
communicates it — precision, restraint, and nothing performative.

Principles (each maps to a product principle):

- **Paper, not screen.** Warm cream canvas, warm ink. No dark mode reflex, no gradients,
  no glass. (calm, privacy)
- **Green is earned.** The moss green appears only for: verified state, live presence,
  the primary action, and Satya's thread. Never as decoration. (honest accountability)
- **Type is the brand.** Three voices: a quiet grotesque for the interface, one serif
  voice reserved for Satya and page-level statements, a bookish mono for anything
  *measured* (durations, times, domains, labels). Numbers are tabular. (precision)
- **The bindu is the seal.** Verification is marked by the brand's own bindu (dot within
  a ring), not a stock shield icon. A hollow ring means unverified. One proprietary
  glyph instead of a lucide default. (memorable identity)
- **Silence is the default state.** Empty states say one true sentence. No illustrations,
  no mascots, no filler. Icons only where they add comprehension (lock = private,
  play/stop = session control). (quiet excellence)
- **Motion only confirms.** 150–200 ms ease-out on color/opacity; the only ambient motion
  is the slow presence pulse, which respects `prefers-reduced-motion`. No hover lifts,
  no entrance choreography, no ping theatrics.

---

## 3. Token system (the only source of color)

Defined once in `web/app/globals.css` (@theme), consumed as Tailwind classes. Raw hex in
markup is now a defect. Values are deliberately off-default (warm-shifted).

| Token | Value | Role |
|---|---|---|
| `paper` | `#FAF8F4` | canvas |
| `card` | `#FFFFFF` | raised surface |
| `ink` | `#23201B` | headings, primary text, dark tiles |
| `soft` | `#575148` | secondary text |
| `faint` | `#6F6A61` | tertiary text, timestamps |
| `ghost` | `#A6A095` | placeholders, disabled |
| `line` | `rgba(35,32,27,0.10)` | borders (derived from ink) |
| `hairline` | `rgba(35,32,27,0.06)` | row separators |
| `green` | `#2D6A3F` | actions, verified text |
| `green-deep` | `#1E4A2D` | large verified numerals, hover |
| `green-bright` | `#4C9A5C` | live dots only |
| `green-tint` | `#EAF2E8` | verified surfaces |
| `green-line` | `#B7CFB6` | verified borders |
| `green-wash` | `#F4F8F2` | hover wash |
| `rust` / `rust-tint` | `#A93A26` / `#F9ECE8` | errors |
| `clay` / `clay-tint` | `#8A5A18` / `#F6EEDC` | drift/warnings |

Typography (loaded via `next/font`, self-hosted, swap):
- `--font-sans` **Instrument Sans** — interface. `--font-serif` **Instrument Serif** —
  Satya's voice + display statements only. `--font-mono` **IBM Plex Mono** — measured
  values and overline labels.

Geometry: cards `rounded-xl` (12 px), controls `rounded-lg` (8 px), chips `rounded-full`.
Nothing larger. Shadows: none, except the mobile drawer. Depth comes from borders and
surface color.

The extension mirrors the same palette as plain hex in `popup.html`/`welcome.html`
(no build step there — the palette table above is the source of truth) and keeps the
system font stack: a popup should feel native and instant.

---

## 4. What was removed (and must stay removed)

- The entire Spider-Verse CSS system, all its animations, glass/gradient/glow utilities.
- Dead components: `ui/WebPattern`, `ui/WebCorner`, `ui/AccentButton`, `ui/badge`,
  `ui/card`, `ui/progress`, `ui/slider`, `ui/tabs`; dead `lib/fuel/*`; orphaned public
  images (starter SVGs, hero-calm, aspiration-nature, og-premium).
- Decorative icon tiles at card corners; the `Sparkles` icon; lucide `Shield`/
  `ShieldCheck` as verification chips (replaced by the bindu `VerifiedMark`).
- Sci-fi error copy. Errors now speak the product's voice: plain, calm, true.
- The three-icon-card trust grid on login (now a quiet list).

Absolute rules going forward: no emoji in product UI; no gradients; no glassmorphism;
no icon-in-tile card headers; no hover translate/scale lifts; no new hex values outside
`globals.css`; no dark surfaces except the ink tile that carries the mark.

---

## 5. Validation

- `npx tsc --noEmit`, `npx next build` green; extension `node --test` green (35/35).
- Every page visually verified via dev-server screenshots (landing, auth, trust pages,
  app shell, dashboard, error/404).
- Adversarial pass (Reddit power user / independent designer / skeptical engineer /
  first-time visitor / paying subscriber) run twice; fixes folded in. Remaining accepted
  trade-offs are logged in the status entry, not silently dropped.
