# LocalSampark — Design Audit & Modernization Blueprint

**Date:** 2026-09-18
**Scope:** `apps/web` (consumer Next.js site), `apps/admin` (franchise console), `apps/mobile` (Expo/React Native Android app)
**Method:** static scan of the full repo + live browser instrumentation of `apps/web` running on `localhost:3000` (Playwright, Chromium 1440×900).

---

## 0. What was actually measured

Everything in this document is a measured number or a reproduced behaviour, not an impression.

| Surface | Routes / screens | Source files | Hardcoded hex colours | Inline `style={{}}` |
|---|---|---|---|---|
| `apps/web` | 300 `page.js` routes | 513 JS files | 1,312 | — (Tailwind) |
| `apps/admin` | 1 route, 41 tab components | 58 files | 1,092 | 1,070 |
| `apps/mobile` | 440 route/screen files | 582 JS files | **11,403** | (StyleSheet) |

That last number is the headline of this audit. There are 11,403 literal colour values in the Android app against a design-token module that only 2 files import.

---

## 1. Root cause: why Bright Mode never activates

### 1.1 The finding

**Confirmed by live reproduction, not by reading.** The website has **three independent theme mechanisms writing to two different `localStorage` keys**, and one of them unconditionally forces dark on every page load.

| # | Mechanism | File | Storage key | What it writes |
|---|---|---|---|---|
| 1 | Pre-hydration inline script | [layout.js:72-82](apps/web/src/app/layout.js#L72-L82) | `theme` | `body.dark-mode` / `body.light-mode` + `html.dark` |
| 2 | React context | [ThemeContext.js:10-19](apps/web/src/contexts/ThemeContext.js#L10-L19) | **`localsampark_theme`** | `html[data-theme]` |
| 3 | Zustand store | [uiStore.js:4-36](apps/web/src/store/uiStore.js#L4-L36) | `theme` | `body.dark-mode` + `html.dark` |

The actual toggle the user clicks is the 🌙/☀️ button in [Header.js:336](apps/web/src/app/components/Header.js#L336). It uses **none** of the three. It writes `localStorage.theme` directly and calls `window.location.reload()` ([Header.js:43-47](apps/web/src/app/components/Header.js#L43-L47)).

### 1.2 The exact failure sequence

`ThemeProvider` is mounted in the root layout. Its `useEffect` reads key **`localsampark_theme`** — a key *nothing in the codebase ever writes*. So `saved` is always `null`, and it falls into the `else` branch:

```js
} else {
  document.documentElement.setAttribute('data-theme', 'dark');   // ← unconditional
}
```

`globals.css:98` makes `[data-theme="dark"]` a full dark-palette selector. Set on `<html>`, it overrides every CSS variable on the page.

So: user clicks ☀️ → reload → the pre-hydration script correctly paints the page light → **seconds later**, once React finishes hydrating this 6,081-module bundle, `ThemeProvider` slams `data-theme="dark"` back onto `<html>` and the entire page snaps to dark.

### 1.3 Reproduction output (real browser, OS colour-scheme = light)

```
pref=light run=1  t=300 null|light-mode|rgb(248,250,252)  …  t=6000 null|light-mode|rgb(248,250,252)
pref=light run=2  t=300 null|light-mode|rgb(248,250,252)  …  t=6000 dark|light-mode|rgb(6,11,24)   ← flipped
pref=light run=3  t=300 null|light-mode|rgb(248,250,252)  …  t=6000 dark|light-mode|rgb(6,11,24)   ← flipped
pref=dark  run=1-3  … always rgb(6,11,24)
```

Read that carefully: the `body` class stays `light-mode` — the user's choice was saved correctly — but `data-theme=dark` wins the cascade anyway. And note run 1 vs runs 2–3: **the outcome is a race**. On a fast warm machine the override sometimes loses; on a real phone over a real network, hydration is slower and the flip is guaranteed and visible.

Two screenshots taken from that run — one with `theme=light`, one with `theme=dark` — are **pixel-identical dark pages**. The only difference in the entire viewport is the toggle glyph changing from 🌙 to ☀️. That is precisely the reported symptom: *"when user try to change from dark mode to bright mode view doesn't change."*

### 1.4 Three secondary defects in the same system

- **Tailwind `dark:` variants are half-wired.** `tailwind.config.js` sets `darkMode: 'class'`, which keys off `.dark` on `<html>`. Mechanisms 1 and 3 set it; mechanism 2 does not. 532 `dark:` utilities across 31 files are therefore governed by a different signal than the CSS variables that style the other 269 files.
- **The media-query fallback guards the wrong element.** `globals.css:126` reads `body:not(.light-mode):not([data-theme="light"])`, but `data-theme` is only ever set on `<html>`. The `:not()` guard can never fire.
- **A full page reload to change theme.** [Header.js:45](apps/web/src/app/components/Header.js#L45) reloads the document. Every competitor flips theme in one frame; this discards all client state and takes seconds.

### 1.5 Mobile: there is no Bright Mode to fix

The Android app has **no theme system at all** — not a broken one, an absent one.

- `apps/mobile/src/context/` contains `AuthContext`, `LanguageContext`, `NotificationContext`, `OrderRingerContext`, `WalletContext`, `ZoneContext`. **No `ThemeContext`.**
- Grepping all 582 mobile source files for `isDark`, `darkMode`, `useColorScheme`, or `toggleTheme` returns **one** hit, in an unrelated shop module.
- No settings or profile screen exposes an appearance control.
- `packages/shared/design-tokens.js` defines a **single** palette. There is no light/dark split to switch between.

On top of that, mobile runs **three conflicting palettes simultaneously**:

| File | Brand primary | Imported by |
|---|---|---|
| [apps/mobile/app/theme.js](apps/mobile/app/theme.js) | `#F05A28` (Swiggy orange) | 4 files |
| [apps/mobile/src/theme/theme.js](apps/mobile/src/theme/theme.js) | `#00C880` (emerald) | 8 files |
| [apps/mobile/src/theme/index.js](apps/mobile/src/theme/index.js) | `#00C880` (from shared tokens) | 2 files |

14 files total consume a token module. The other **568 hardcode their colours.**

---

## 2. Dark Mode: why it looks cheap

The current dark palette (`globals.css:97-123`) is not premium-dark, it is under-designed dark:

| Token | Current | Problem |
|---|---|---|
| `--background` | `#060b18` | Near-black at 3% luminance. Harsh, crushes shadow detail, no room for elevation below it. |
| `--background-alt` | `#0d1526` | Only one step up. **The system has two dark surfaces for an app with 300 routes.** Material and Apple both ship 5–6. |
| `--card-border` | `rgba(99,102,241,0.25)` | Every card is outlined in **indigo** — a colour that appears nowhere in the light brand (emerald `#00C880` / orange `#FF6A00`). The dark theme is a different brand. |
| `--glow-color` | `rgba(99,102,241,0.4)` | Same indigo. Every glow in dark mode is off-brand. |
| `--primary-light` / `--accent-light` | indigo / emerald | In dark mode `--accent-light` is remapped from crimson to **emerald**, colliding with `--primary`. Semantic tokens change meaning between themes. |

Compounding it: **83 of 300 page files hardcode `bg-white` / `bg-slate-50` / `bg-gray-50`** (194 `bg-white` occurrences). Those panels stay white no matter the theme. Dark mode today is largely a dark *backdrop* behind light-styled content — which is why it reads as unfinished rather than as a designed dark theme.

The `/shops` screenshot shows this directly: dark `<body>`, white cards, white header, white filter bar.

---

## 3. Design-system fragmentation

### 3.1 Web

The token layer is genuinely good — `packages/shared/design-tokens.js` → `tailwind.config.js` → CSS variables is the right architecture. **It is simply not adopted.**

| Primitive | Files importing it | Raw equivalent in the wild |
|---|---|---|
| `ui/Button` | 33 of 513 | **906** raw `<button>` elements |
| `ui/Card` | 15 of 513 | 312 raw `.glass-card` class applications |

Shape language has no rule: **817** `rounded-xl`, 620 `rounded-full`, 411 `rounded-2xl`, 278 `rounded-3xl`, 269 `rounded-lg`, 39 `rounded-md`, plus one-off `rounded-[2rem]`, `rounded-[3rem]`, `rounded-[100px]`. Five radii are used at comparable frequency, so nothing signals hierarchy.

Effects are applied by taste, not by rule: **216** `bg-gradient-to-*` and **136** `backdrop-blur` instances. The repo's own comment in `tailwind.config.js` already flags the mesh/blur work as a *"High performance risk on the low-end Android hardware this app targets."*

### 3.2 Admin console

`apps/admin` has no Tailwind, no PostCSS, and a 44-line `globals.css`. Everything is inline style objects: **1,070 `style={{}}` blocks, 1,092 hardcoded hex values, zero design tokens.** It is hardcoded dark-only (`background-color: #0f172a`) with no light mode and no path to one.

It is also a single route rendering **41 tab components** behind one switch, with the whole console reachable only through one flat tab strip.

### 3.3 Mobile typography

**31 distinct `fontSize` values**, including 10, 11, 13, 15, and 22 — there is no scale, just per-screen guesses. The single most common size is **12px, used 1,296 times.** That is below the 14px floor for body copy on Android and a readability problem for the demographic this app targets.

---

## 4. UX and accessibility findings

### 4.1 Touch targets

Measured live on the running site, counting rendered interactive elements smaller than 44×44 CSS px:

| Route | Interactive elements | Below 44px target |
|---|---|---|
| `/` | 84 | **53 (63%)** |
| `/dashboard` | 78 | **49 (63%)** |
| `/shops` | 66 | **51 (77%)** |
| `/community` | 84 | **68 (81%)** |
| `/society` | 30 | **28 (93%)** |

Mobile is comparable: of 716 explicit `height`/`minHeight` declarations, **272 are under 44**.

### 4.2 Empty and loading states

- **`/society` renders a spinner indefinitely** when the API is unreachable. No timeout, no error state, no retry affordance. A user on a flaky connection sees a spinner forever.
- **`/shops` renders skeleton cards that never resolve.** With no results, the page shows three grey placeholder cards below a single lonely "All Shops" tile and roughly 400px of dead vertical space. There is no "no shops near you" state and no way to widen the radius.
- These are not edge cases — they are what a first-time user in an unlaunched zone sees.

### 4.3 First-run experience

On a cold first load of `/`, **three overlays stack simultaneously**: the Welcome Tour modal, the cookie consent banner, and the Dev Quick Login dock. The hero — the one thing that explains the product — is blurred behind all three.

### 4.4 Other

- 3–5 **unlabelled icon buttons** per page (no text, no `aria-label`).
- `/profile` has **no `<h1>`**.
- Hydration mismatch warning on `/`, caused by the theme scripts fighting.
- Tab icons in the mobile app are **emoji rendered as `<Text>`** ([(tabs)/_layout.js:42-47](apps/mobile/app/(tabs)/_layout.js#L42-L47)) — they don't respect tint, don't scale, and render differently per OEM. `MorphingBottomTabs` separately maps 19 routes onto **only 5 distinct Lucide icons**, so Orders / Products / Earnings / Revenue / Wallet all show the same shopping bag.
- The `/society` heading renders in three unrelated colours (orange → green → blue) in one line.

---

## 5. Main dashboard: the core problem

> *"when any new user see the website dashboard he should be able to get the complete idea of website use"*

Today the landing page does not do this, and `/dashboard` does it less.

**Landing page (`/`)** opens with a hero, a download CTA, and three stats. The bento grid of the six pillars — Community, Shops, Hyperlocal, Fresh, Society, Earn — is defined in [page.js:24-88](apps/web/src/app/page.js#L24-L88) but sits **below the fold**, past the hero, and is immediately obscured on first visit by the three stacked overlays. A new visitor's first screen communicates "delivery app," not "super-app spanning 15 verticals."

**`/dashboard`** is worse as an orientation surface. The screenshot shows it opening on *"Neighborhood Services"* with three identical cards — same generic sparkle icon, same "(4.8 • 120 Reviews)", empty `Provider:` field, three identical full-width green gradient "Book Service" buttons. A greeting (`Abhi! 👋`) appears **below** that block. There is no summary, no state, no sense of what else exists.

Meanwhile the platform actually ships **11 role dashboards** (`admin`, `delivery`, `field`, `franchise`, `moderator`, `security`, `service`, `shop`, `society-admin`, `sos`, consumer) and 56 admin-dashboard sub-routes. **None of that breadth is visible from the front door.**

---

## 6. Competitor benchmark

Benchmarked at the pattern level against the apps LocalSampark competes with in Indian hyperlocal.

| App | Pattern worth taking | Where LocalSampark falls short |
|---|---|---|
| **Blinkit / Zepto** | Product photo is the brightest object; flat white surfaces, zero ambient motion, one accent reserved for the buy action | 216 gradients and 136 blur layers compete with content for attention |
| **Swiggy** | Persistent location + search header, then a scrollable rail of *labelled vertical entry points* directly under it | Verticals live below the fold behind three overlays |
| **MyGate / NoBroker Hood** (direct society competitors) | Society home is a live status board — visitors, dues, notices — not a marketing page | `/society` shows a marketing headline and an infinite spinner |
| **Nextdoor** | Feed-first neighbourhood identity, strong empty states that tell you what to do next | Empty states are skeletons that never resolve |
| **Zomato** | Genuinely designed dark theme: layered greys, brand-consistent accent, instant toggle | Dark theme borrows indigo from nowhere in the brand and takes a page reload |
| **PhonePe / Paytm** | Bento tile grid that shows the whole super-app surface on screen one | The bento grid exists but is not the first thing anyone sees |

**The single most transferable insight:** every successful Indian super-app puts a *compact, labelled, scannable map of its verticals* in the first viewport. LocalSampark has the components for this already — they are just in the wrong place in the scroll order.

---

## 7. Modernization blueprint

### Phase 2 — Theme system (foundation; everything else depends on it)

- **Delete two of the three mechanisms.** One provider owns theme. `uiStore`'s theme slice and the duplicated class logic go; the pre-hydration script stays (it prevents FOUC) but reads the same single key.
- **One storage key**: `theme`, values `light` | `dark` | `system`.
- **One DOM contract**: set `class="dark"` *and* `data-theme` on `<html>` together, always, so Tailwind variants and CSS variables can never disagree.
- **Wire the Header toggle to the provider** and **remove `window.location.reload()`** — theme flips in one frame.
- **Add `system` mode** with a live `matchMedia` listener.
- **Rebuild the dark palette** around a 6-step elevation ramp on deep slate (not `#060b18` near-black), with borders and glows derived from the emerald/orange brand instead of orphan indigo.
- **Add a true light palette** to `packages/shared/design-tokens.js` so both themes are generated from one source.
- **Sweep the 194 `bg-white` / `bg-slate-*` hardcodes** on the highest-traffic routes onto surface tokens, so dark mode actually applies to content and not just the backdrop.
- **Mobile: build the theme system that doesn't exist** — `ThemeContext` + `useTheme()`, persisted to AsyncStorage, defaulting to `system` via `useColorScheme()`, with an appearance control in Profile. Collapse the three competing palette files into one.
- **Admin: introduce a token layer** (CSS variables at minimum) so the console can have a light mode at all.

### Phase 3 — Main dashboard

- **Vertical map in the first viewport.** The six-pillar bento moves up, and expands to name every vertical the platform actually runs. A first-time visitor sees the full scope without scrolling.
- **Fix the overlay collision** — sequence the tour, consent, and dev dock so at most one is visible and the hero is never blurred on first paint.
- **Rebuild `/dashboard` as a real dashboard**: personalised greeting and location at top, a live state row (wallet, active orders, society dues, alerts), then the vertical map, then contextual feeds.
- **Role-aware entry.** The 11 role dashboards get a single visible switcher rather than being unreachable by URL guessing.
- **Real empty and error states** for `/shops` and `/society` — with a timeout on the spinner, a retry, and a "widen radius" action.

### Phase 4 — Systematic cleanup

- Promote `Button` / `Card` / `Input` to the only sanctioned primitives; migrate the highest-traffic routes off the 906 raw `<button>`s.
- Reduce the radius vocabulary from 9 values to 3 (`sm` / `md` / `lg`) mapped to meaning.
- Lift every interactive element to a 44px minimum hit area via the primitives, not per-site patches.
- Mobile: collapse 31 font sizes to a 7-step scale with a 14px body floor; replace emoji tab icons with real vector icons, one per route.
- Gate gradients and `backdrop-blur` behind an opt-in "expressive" surface class so the commerce grids stay fast on low-end Android.

---

## 8. Scope reality — please read before approving

The request is *"transform every page of both apps."* The honest measurement is **300 web routes + 440 mobile screens + 41 admin tabs**. Hand-designing every one of those in a single pass is not something I can deliver truthfully.

What I can deliver, and what I believe actually gets you the outcome you want:

1. **System-level work that lifts all 741 surfaces at once** — tokens, theme, primitives, spacing, elevation, motion, touch targets. This is where the leverage is, and it is what Phase 2 and Phase 4 above describe.
2. **Hand-transformed hero surfaces** — landing page, consumer dashboard, shops, community, society, profile, the admin console shell, and the mobile home/tabs/profile. These are the screens that decide whether the product feels premium.
3. **A documented pattern** so the remaining long-tail routes can be converted incrementally without re-deciding anything.

I would rather tell you this now than report "complete" over work that only touched 20 screens.

---

## 9. Questions before Phase 2

Listed in the reply accompanying this document.
