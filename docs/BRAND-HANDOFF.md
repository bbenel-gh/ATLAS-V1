# ATLAS — UI & Brand Handoff

Portable spec for reusing the ATLAS visual identity in another application.
Everything here is extracted verbatim from the ATLAS codebase — no invention.

> **Which system:** ATLAS has two. The **primary system** below (light, "paper/ink")
> is what the live product uses. The dark "midnight" system in the Appendix is an
> earlier landing-page treatment, retained only because the logo mark lives there.
> Use the primary system unless you specifically want the dark marketing look.

---

## 1. Design Tokens (source of truth)

Declared once as CSS custom properties. Tailwind is a *consumer* of this layer,
never a second copy — change a brand value by editing the token, nothing else.

```css
:root {
  --paper:     #F2F4F3;  /* app background */
  --ink:       #16233E;  /* primary text, primary button fill */
  --ink-soft:  #4C566B;  /* secondary text, body copy */
  --gold:      #B9852F;  /* accent / CTA / eyebrow labels */
  --gold-soft: #E9D2A4;  /* gold tint surface */
  --teal:      #2F6F5E;  /* progress, success, system voice */
  --teal-soft: #D6E7E1;  /* tutor bubble, code chips, badges */
  --line:      #DDE2DE;  /* all borders and dividers */
  --card:      #FCFCFA;  /* raised surface on --paper */
}
```

### Non-CSS platforms (React Native, Flutter, etc.)

```
paper    #F2F4F3      inkSoft  #4C566B      teal      #2F6F5E
ink      #16233E      gold     #B9852F      tealSoft  #D6E7E1
card     #FCFCFA      goldSoft #E9D2A4      line      #DDE2DE
```

Errors reuse plain red: text `#B91C1C`, surface `#FEF2F2`, border `#FECACA`
(Tailwind red-700 / red-50 / red-200).

---

## 2. Typography

Three roles, three families. Loaded via `next/font/google` in the web app.

| Role | Family | CSS var | Used for |
|---|---|---|---|
| Display | **Fraunces** (variable: `opsz`, `SOFT`, `WONK` axes) | `--font-display` | `h1`–`h3`, wordmark, card titles |
| Body | **Inter** | `--font-body` | all prose, buttons, inputs |
| Data | **IBM Plex Mono** | `--font-data` | labels, counts, eyebrows, badges, code |

Fallbacks: display → `Georgia, serif`; body → `ui-sans-serif, system-ui`;
data → `ui-monospace, monospace`.

```css
body       { font-family: var(--font-body); }
h1,h2,h3   { font-family: var(--font-display); }
.font-data { font-family: var(--font-data); }
```

**Scale as actually used**

- Hero h1 — `text-4xl md:text-6xl`, `leading-[1.05]`
- Page h1 — `text-3xl`
- Card title — `text-xl`
- Auth h1 — `text-2xl`
- Body lead — `text-lg leading-relaxed`
- Body — `text-sm` / `text-base`, `text-ink-soft`
- Mono label — `text-xs uppercase tracking-wide` (hero eyebrow: `tracking-[0.2em]`)

The mono-uppercase micro-label is the strongest signature of the system — it
appears as the section eyebrow, the field label, the level badge, and the
component header. Reuse it liberally.

---

## 3. Shape & Surface Language

- **Buttons and inputs are pills** — `rounded-full`. This is deliberate and
  near-universal; do not substitute `rounded-lg` on interactive controls.
- **Cards are `rounded-2xl`**, `bg-card`, `border border-line`.
- **Form fields** are the exception: `rounded-lg`, `border-line`,
  `focus:outline-none focus:border-ink` (border darkens, no glow ring).
- **No shadows anywhere.** Elevation is expressed with `--card` against
  `--paper` plus a 1px `--line` border. Keep it that way.
- Hover on a card: `hover:border-ink`; the title inside goes `hover:text-gold`.
- Every interactive element carries `transition-colors`.
- Progress bars: `h-1.5 bg-line rounded-full overflow-hidden`, fill `bg-teal`.

---

## 4. Component Patterns (copy these)

### Primary button (dark)

```tsx
<button className="bg-ink text-paper rounded-full px-6 py-3 text-sm font-medium
  hover:bg-ink/90 transition-colors">Log in</button>
```

### Accent button (gold — the "start / send / do it" action)

```tsx
<button className="bg-gold text-white rounded-full px-6 py-3 font-medium
  disabled:opacity-40 hover:bg-gold/90 transition-colors">Start learning free</button>
```

### Secondary button (outline)

```tsx
<Link className="px-6 py-3 rounded-full font-medium border border-line text-ink
  hover:border-ink transition-colors">I have an account</Link>
```

### Card

```tsx
<div className="border border-line rounded-2xl p-6 bg-card hover:border-ink
  transition-colors group">
  <div className="flex items-start justify-between">
    <h2 className="font-display text-xl text-ink group-hover:text-gold transition-colors">Title</h2>
    <span className="font-data text-xs text-ink-soft">3/8</span>
  </div>
  <p className="text-sm text-ink-soft mt-2 mb-4">Description</p>
  <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
    <div className="h-full bg-teal rounded-full transition-all" style={{ width: "37%" }} />
  </div>
</div>
```

### Form field

```tsx
<label className="text-xs font-data uppercase tracking-wide text-ink-soft">Email</label>
<input className="mt-1 w-full border border-line rounded-lg px-3 py-2.5 text-sm
  focus:outline-none focus:border-ink" />
```

### Pill badge

```tsx
<span className="font-data text-xs uppercase tracking-wide text-teal bg-teal-soft
  px-3 py-1 rounded-full">JHS</span>
```

### Chat bubbles

```
user   →  bg-ink text-paper self-end rounded-xl rounded-br-sm
agent  →  bg-teal-soft text-ink self-start rounded-xl rounded-bl-sm
both   →  text-sm px-3.5 py-2.5 max-w-[90%] whitespace-pre-wrap leading-relaxed
```

Loading state is a bubble reading `Thinking…` in `text-ink-soft` — never a spinner.

### Divider with label

```tsx
<div className="flex items-center gap-3 my-6">
  <div className="h-px bg-line flex-1" />
  <span className="text-xs text-ink-soft font-data">or</span>
  <div className="h-px bg-line flex-1" />
</div>
```

### Error banner

```tsx
<p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">…</p>
```

---

## 5. Layout

- Page shell: `min-h-full flex flex-col bg-paper text-ink`, `antialiased`.
- Horizontal padding: `px-6 md:px-12`.
- Content max width: `max-w-5xl mx-auto` (auth forms: `max-w-sm`).
- Header: `flex items-center justify-between px-6 md:px-12 py-5 border-b border-line`.
- Card grids: `grid sm:grid-cols-2 gap-4`.
- Wordmark is plain text — `font-display text-xl tracking-tight text-ink`, the
  literal string `ATLAS`. No lockup image in the light system.

---

## 6. Long-form content typography (`.prose-atlas`)

For rendered lesson/article bodies:

```css
.prose-atlas h2 { font-family: var(--font-display); font-size: 1.375rem;
  font-weight: 600; color: var(--ink); margin: 2rem 0 .75rem; }
.prose-atlas h2:first-child { margin-top: 0; }
.prose-atlas p, .prose-atlas ul, .prose-atlas ol {
  margin-bottom: 1rem; line-height: 1.75; color: var(--ink-soft); }
.prose-atlas ul { list-style: disc; padding-left: 1.5rem; }
.prose-atlas ol { list-style: decimal; padding-left: 1.5rem; }
.prose-atlas strong { color: var(--ink); font-weight: 600; }
.prose-atlas code { font-family: var(--font-data); background: var(--teal-soft);
  padding: .1rem .35rem; border-radius: .25rem; font-size: .875em; }
```

---

## 7. Voice (applies to UI copy)

Plain, calm, second person. Quiet sentences, em dashes, no exclamation marks, no
gamified hype. Real examples from the product:

- "Learn how to think, not just what to memorize."
- "Pick up where you left off, or start something new."
- "Welcome back, {FirstName}."
- "Ask anything about {topic}."
- "An Intelligence Platform that helps people learn, think, decide, and solve problems."

Avoid streaks, leaderboards, and score-pressure language entirely — that is a
product principle, not a style preference.

---

## 8. Accessibility baseline

- Focus is visible on every interactive element. Light system: border darkens to
  `--ink`. Dark system: `outline: 2px solid var(--cyan); outline-offset: 3px`.
- Honor `prefers-reduced-motion: reduce` — disable animation and
  `scroll-behavior: smooth`.
- `-webkit-font-smoothing: antialiased` on body.

---

# Appendix — Dark "Midnight" System (marketing/landing only)

Use only if you want the original dark marketing look. Fonts here are
**Manrope** (display) + **Inter** (body).

```css
:root {
  --midnight: #0b1020;   --cyan:   #19c7d8;   --text-primary:   #f2f4f8;
  --slate:    #161d33;   --violet: #7c6cf2;   --text-secondary: #aeb7cc;
  --slate-2:  #212b49;   --green:  #2fb67d;   --text-muted:     #7a85a0;
  --cloud:    #f7f9fc;   --amber:  #f2b84b;
                         --red:    #e85d75;

  --border:        rgba(255,255,255,0.08);
  --border-strong: rgba(255,255,255,0.16);
  --radius: 14px;
  --header-bg: rgba(11,16,32,0.85);   /* + backdrop-filter: blur(10px) */
  --brand-gradient: linear-gradient(120deg, var(--cyan), var(--violet));
}
```

Semantic mastery colors — worth carrying over regardless of theme:
`green #2fb67d` = mastered · `amber #f2b84b` = shaky · `red #e85d75` = struggling ·
brand gradient = currently active.

Cards `border-radius: 20px` on `--slate`. Buttons `border-radius: 10px`;
primary is the gradient with `#06121a` text. Content wrap `max-width: 1120px`,
`padding: 0 32px`. Mobile breakpoint `860px`.

### Logo mark

The only real logo artwork. Lives at `public/atlas-logo.svg` — an "A" formed by
two gradient strokes with two orbit ellipses and a node at the apex. Render it
through a single component; never inline the markup in more than one place.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" role="img" aria-label="Atlas">
  <defs>
    <linearGradient id="atlasMark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#19C7D8"/>
      <stop offset="100%" stop-color="#7C6CF2"/>
    </linearGradient>
    <linearGradient id="atlasOrbit" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#19C7D8"/>
      <stop offset="100%" stop-color="#7C6CF2"/>
    </linearGradient>
  </defs>
  <g fill="none" stroke="url(#atlasOrbit)" stroke-width="6" opacity="0.55">
    <ellipse cx="120" cy="142" rx="94" ry="32" transform="rotate(-16 120 142)"/>
    <ellipse cx="120" cy="142" rx="94" ry="32" transform="rotate(14 120 142)"/>
  </g>
  <path d="M120 42 L58 198" fill="none" stroke="url(#atlasMark)" stroke-width="20" stroke-linecap="round"/>
  <path d="M120 42 L182 198" fill="none" stroke="url(#atlasMark)" stroke-width="20" stroke-linecap="round"/>
  <circle cx="120" cy="42" r="15" fill="#19C7D8"/>
  <circle cx="120" cy="42" r="6" fill="#FFFFFF"/>
</svg>
```

Standard sizes: `28px` in nav, `20px` in footer (at `opacity: 0.7`).

To use the mark on the light system, either keep the gradient as-is (it reads
fine on `--paper`) or recolor both gradient stops to `--ink` with the apex node
in `--gold`.
