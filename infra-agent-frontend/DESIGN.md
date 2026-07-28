# Infra Agents — Design System

Design reference for the Infra Agents product frontend (an AI operations/agentic infrastructure
management console: live data-center monitoring, a 3D digital twin, a visual agent-team/workflow
builder, streaming agent execution traces, a drag-and-drop report builder, and an eval/sandbox
dashboard). This document describes the actual system implemented in the reference codebase
(`infra_agents/frontend`) and the conventions this Next.js port should preserve.

Stack: Vite + React 19 (source) → this port: Next.js App Router. CSS Modules + `clsx`/`cn()` for
styling (no Tailwind, no CSS-in-JS). All color values in OKLCH. **The product is dark-only** —
there is no light theme and no runtime theme toggle.

## 1. Design Philosophy

### Why dark-only

This is a control-room product: 3D data-center twins, live topology maps, streaming agent traces,
and dense metric dashboards, frequently displayed on large or multi-monitor setups and left open
for hours. Dark surfaces are the correct default for this content class — they let saturated status
color (rack health, agent state dots, chart series) read as signal against a quiet background, and
they match the aesthetic of the NOC/SOC dashboards this product sits alongside. `ThemeProvider`
hard-codes `theme: 'dark'`, clears any persisted theme preference on mount, and its `toggleTheme`
is a deliberate no-op — this is not a partially-built light theme, it is an intentionally removed
one. `:root { color-scheme: dark }` is set globally so native form controls and scrollbars match.

### Color philosophy

An 11-step OKLCH scale (50–950) per color family, perceptually uniform in lightness with chroma
peaking at the 500 step — the same structural pattern popularized by Tailwind/Radix scales, built
by hand in raw CSS custom properties rather than a config file:

- **Primary — electric cobalt (H 235)**: the product's single accent hue. Used for links, focus
  rings, primary buttons, active nav state, and the agent/brand identity color.
- **Secondary — violet-indigo (H 275)**: pairs with primary in gradients (buttons, hero title,
  background blobs) and secondary emphasis. Lower chroma than primary so it recedes.
- **Accent — warm amber-orange (H 55)**: the complement of cobalt on the color wheel. Reserved for
  highlight moments — CTA emphasis, warm gradient stops — and absorbs what used to be a separate
  gold/brown sub-palette (kept as `--gold-*`/`--brown-*` aliases for back-compat, all resolving
  into the accent scale now).
- **Neutral (H 238, very low chroma)**: tinted very slightly toward the primary hue rather than
  true achromatic gray. On a dark, cobalt-accented surface a dead-neutral gray reads as slightly
  wrong; the faint warm-cobalt tint makes neutrals feel like they belong to the same palette as the
  accent instead of fighting it.
- **Semantic — success (H 155, teal-green), warning (H 70, amber-gold), danger (H 20, fire red),
  info (H 200, cyan)**: one hue each, full 50–950 ramp, so every status has consistent identity
  across badges, chart series, rack/device health states, and agent run outcomes.

A single alias layer (`--color-*`) sits on top of the raw scales and is the **only** thing
components should reference — e.g. `--color-surface`, `--color-text-primary`, `--color-danger-fg`.
Raw scale steps (`--primary-400`, `--neutral-800`, …) are implementation detail; changing what a
role means happens once, in the alias layer, never by hunting down every component that used a raw
step directly. A further back-compat alias layer (`--primary`, `--card`, `--foreground`, `--muted`,
`--border`, `--background`, `--destructive`) maps flat legacy token names onto the new alias layer,
so older components keep working unchanged while new code should prefer the explicit `--color-*`
names.

An `@supports not (color: oklch(...))` block provides sRGB hex fallbacks for the handful of tokens
the back-compat layer depends on, so the UI degrades gracefully rather than breaking on non-evergreen
engines.

### Fluid scaling philosophy — built for control-room displays, not just responsive web

Nearly every size-bearing token (spacing, font size, panel/nav heights) is defined with `clamp()`
rather than fixed breakpoint values, scaling continuously from a 768px tablet up through 8K/dual-4K
super-ultrawide monitors. This is a deliberate departure from typical marketing-site responsive
design: this product is genuinely used on everything from a laptop to a 49" super-ultrawide ops
console, and a fixed pixel scale would either be cramped on a laptop or comically oversized on a
5120px display. The clamp() curves are tuned to visually saturate near 4K rather than growing
without bound.

Mobile (< 768px) is explicitly **not supported** — `MobileBlocker` hard-gates the app below that
width and asks the user to switch to a tablet, laptop, or desktop. This is a data-dense operations
tool, not a responsive marketing page; there is no meaningful phone-sized layout to design for.

The breakpoint tier system extends the familiar Bootstrap/Tailwind names upward:

| Tier | Range (px)  | Reference device                             |
| ---- | ----------- | -------------------------------------------- |
| xs   | < 768       | blocked — `MobileBlocker`, no layout applied |
| sm   | 768 – 1023  | tablet portrait (iPad Portrait 810)          |
| md   | 1024 – 1279 | tablet landscape (iPad Landscape 1080)       |
| lg   | 1280 – 1439 | laptop 13"                                   |
| xl   | 1440 – 1919 | laptop 14–15"                                |
| 2xl  | 1920 – 2559 | desktop full HD                              |
| 3xl  | 2560 – 3439 | 2K / 29" ultrawide                           |
| 4xl  | 3440 – 3839 | 34" ultrawide                                |
| 5xl  | 3840 – 5119 | 32" 4K / 38" ultrawide                       |
| 6xl  | 5120 – 7679 | 49" super-ultrawide (5120×1440)              |
| 7xl  | ≥ 7680      | 8K / dual-4K super-ultrawide                 |

Ranges are mutually exclusive by construction so per-component media queries never collide. Layout
tokens (`--rail-w`, `--container-max`) step up at 1920/2560px and only gain centered side gutters
from 3440px upward (~34"+) — below that, content fills the available width edge-to-edge rather than
leaving large empty margins on a laptop.

### Typography philosophy

Two families, not three or four:

- **Inter** — every heading, every body text, every button label, every UI string. `h1`–`h3`, `p`,
  and the base `font-family` on `:root`/`body` all resolve to Inter. Unlike the multi-family
  Display/Body split used in some sibling products, this app does not reserve a separate geometric
  display face for headings — Inter alone carries the entire type hierarchy, differentiated by the
  fluid font-size scale and weight (700 for `h1`, 600 for `h2`/`h3`, 500 for buttons/links, 400 for
  body).
- **Geist Mono** — code, metrics, and anything the user needs to compare digit-by-digit: dashboard
  KPI values, timestamps, IDs, log/trace output, raw JSON. Applied via the `.mono`/`.font-geist-mono`
  utility classes and throughout `QueryTrace`/`SandboxPanel` metric displays. `:root` sets
  `font-variant-numeric: tabular-nums` globally so numeric columns stay aligned even outside mono
  contexts.

Font sizes are fluid (`--font-size-xs` through `--font-size-8xl`, all `clamp()`), scaling from a
768px floor to a 3840px ceiling, with `--fs-*` as short aliases. This keeps type legible on a laptop
without becoming oversized on a 4K ops display, without needing per-breakpoint overrides at every
call site.

`text-rendering: optimizeLegibility`, `-webkit-font-smoothing: antialiased`, and
`-moz-osx-font-smoothing: grayscale` are set globally (not scoped to headings) — this is a dark UI
where light text on near-black backgrounds benefits from consistent antialiasing everywhere, not
just in display type.

### Motion philosophy

Motion is split cleanly by layer:

1. **Base primitives never animate with JS.** `Button`, `Card`, `Badge`, `Tabs`, `Spinner` in
   `components/ui/` are CSS-only — `transition: all 150–300ms cubic-bezier(0.4, 0, 0.2, 1)` for
   hover/press states (color, transform, shadow), plain `@keyframes` for the spinner arc. No
   `framer-motion` import exists in any of them. This keeps the primitive layer cheap to render at
   the density these components appear in (tables, panels, trace blocks).
2. **Feature components use `framer-motion`/`motion` for meaningful state change**: expand/collapse
   accordions (`ReasoningBlock`, `ReasoningAccordion`), rotating word/label swaps (`RotatingText`),
   looping radar-style pulses (`RadarScanner`), and sliding nav hover highlights (`NavHoverEffect`).
   Motion is reserved for places where an element is entering, leaving, or moving — not for routine
   hover feedback, which stays CSS.
3. **Loading/streaming states are CSS-only, deliberately.** `ShimmerText` (used for in-flight
   streamed agent text) animates only `background-position` on a `background-clip: text` gradient —
   GPU-cheap, and respects `prefers-reduced-motion`. Skeleton placeholders (`Shimmer`, `PulseDot`,
   `TracePanelSkeleton`, `ReconnectBanner`) are the same: CSS Modules and keyframes, no JS animation
   loop. Given how much of this product is live-streaming (SSE agent traces, real-time metrics),
   keeping the _continuous_ animations off the JS main thread matters more than it would in a mostly
   static UI.

Hover lift is a repeated signature across cards/buttons/toggles: `translateY(-1px to -2px)` paired
with a shadow-elevation step-up (`--shadow-sm → --shadow-md/lg/xl`) on `cubic-bezier(0.4, 0, 0.2, 1)`
— the tactile "this is clickable" cue used everywhere from `.card:hover` to `.btn-primary:hover` to
the `Button` `variantDefault`/`variantSecondary` CSS Module hover states.

## 2. Token Definitions

### Color scale (`:root`)

```css
:root {
  /* Primary -- electric cobalt, H=235 */
  --primary-50: oklch(0.98 0.014 235);
  --primary-100: oklch(0.955 0.034 235);
  --primary-200: oklch(0.905 0.072 235);
  --primary-300: oklch(0.83 0.12 235);
  --primary-400: oklch(0.72 0.17 235);
  --primary-500: oklch(0.62 0.205 235);
  --primary-600: oklch(0.52 0.2 235);
  --primary-700: oklch(0.42 0.17 235);
  --primary-800: oklch(0.32 0.125 235);
  --primary-900: oklch(0.225 0.085 235);
  --primary-950: oklch(0.155 0.055 235);

  /* Secondary -- violet-indigo, H=275 */
  --secondary-50: oklch(0.98 0.012 275);
  --secondary-500: oklch(0.63 0.17 275);
  --secondary-950: oklch(0.16 0.045 275);
  /* ...full 50-950 ramp, see reference index.css */

  /* Accent -- warm amber-orange, H=55 */
  --accent-400: oklch(0.775 0.165 55);
  --accent-500: oklch(0.71 0.185 55);
  /* ...full ramp */

  /* Neutral -- H=238, very low chroma */
  --neutral-50: oklch(0.985 0.005 238);
  --neutral-900: oklch(0.21 0.01 238);
  --neutral-950: oklch(0.135 0.008 238);
  /* ...full ramp */

  /* Semantic -- success H=155, warning H=70, danger H=20, info H=200 */
  --success-400: oklch(0.74 0.15 155);
  --warning-400: oklch(0.8 0.168 70);
  --danger-400: oklch(0.74 0.185 20);
  --info-400: oklch(0.75 0.135 200);
  /* ...each with full 50-950 ramp */
}
```

### Semantic alias layer — the only tokens components should reference

```css
:root {
  /* Surfaces */
  --color-bg: #000000;
  --color-surface: var(--neutral-900);
  --color-surface-raised: oklch(0.25 0.012 238);
  --color-surface-sunken: oklch(0.11 0.008 238);
  --color-surface-hover: var(--neutral-800);
  --color-surface-active: var(--neutral-700);

  /* Text */
  --color-text-primary: var(--neutral-50);
  --color-text-secondary: var(--neutral-300);
  --color-text-muted: var(--neutral-400);
  --color-text-inverse: var(--neutral-900);
  --color-text-link: var(--primary-400);
  --color-text-link-hover: var(--primary-300);

  /* Borders */
  --color-border: var(--neutral-800);
  --color-border-strong: var(--neutral-700);
  --color-border-focus: var(--primary-400);
  --color-divider: var(--neutral-800);

  /* Brand */
  --color-brand: var(--primary-400);
  --color-brand-hover: var(--primary-300);
  --color-brand-subtle: oklch(0.225 0.085 235 / 0.6);
  --color-brand-subtle-fg: var(--primary-200);

  --color-accent: var(--accent-400);
  --color-accent-hover: var(--accent-300);
  --color-accent-subtle: oklch(0.285 0.075 55 / 0.6);
  --color-accent-subtle-fg: var(--accent-200);

  /* Status -- fills + foreground pairings pre-computed for AA on dark */
  --color-success: var(--success-400);
  --color-success-subtle: oklch(0.255 0.07 155 / 0.6);
  --color-success-fg: var(--success-200);
  --color-warning: var(--warning-400);
  --color-warning-subtle: oklch(0.29 0.07 70 / 0.6);
  --color-warning-fg: var(--warning-200);
  --color-danger: var(--danger-400);
  --color-danger-subtle: oklch(0.24 0.085 20 / 0.6);
  --color-danger-fg: var(--danger-200);
  --color-info: var(--info-400);
  --color-info-subtle: oklch(0.26 0.06 200 / 0.6);
  --color-info-fg: var(--info-200);

  --color-ring: var(--primary-400);
}
```

### Back-compat flat aliases (existing components reference these unchanged)

```css
--primary: var(--color-brand);
--secondary: var(--secondary-500);
--accent: var(--color-accent);
--success: var(--color-success);
--warning: var(--color-warning);
--destructive: var(--color-danger);
--background: var(--color-bg);
--foreground: var(--color-text-primary);
--card: var(--color-surface);
--muted: var(--color-text-muted);
--border: var(--color-border);
```

### Radii, control heights, borders

```css
--radius: 0.75rem; /* base unit, shadcn pattern */
--radius-sm: calc(var(--radius) * 0.5); /* 6px  */
--radius-md: calc(var(--radius) * 0.667); /* 8px  */
--radius-lg: var(--radius); /* 12px */
--radius-xl: calc(var(--radius) * 1.333); /* 16px */
--radius-2xl: calc(var(--radius) * 2); /* 24px */

--control-height-sm: 1.75rem; /* 28px */
--control-height-default: 2rem; /* 32px */
--control-height-lg: 2.5rem; /* 40px */
--control-height-icon: 2rem;
--control-height-icon-sm: 1.75rem;

--border-width: 1px;
--border-width-2: 2px;
--border-width-4: 4px;
```

### Fluid spacing & font size (clamp-based, 768px → ~3840px)

```css
--spacing-xs: clamp(0.125rem, 0.09rem + 0.08vw, 0.375rem);
--spacing-sm: clamp(0.25rem, 0.18rem + 0.12vw, 0.625rem);
--spacing-md: clamp(0.5rem, 0.35rem + 0.22vw, 1.25rem);
--spacing-lg: clamp(0.75rem, 0.55rem + 0.32vw, 1.875rem);
--spacing-xl: clamp(1rem, 0.7rem + 0.5vw, 2.5rem);
--spacing-2xl: clamp(1.5rem, 1rem + 0.85vw, 3.75rem);
--spacing-3xl: clamp(2rem, 1.25rem + 1.2vw, 5rem);

--font-size-xs: clamp(0.6875rem, 0.62rem + 0.07vw, 0.875rem);
--font-size-sm: clamp(0.75rem, 0.66rem + 0.1vw, 1rem);
--font-size-base: clamp(0.875rem, 0.74rem + 0.15vw, 1.25rem);
--font-size-lg: clamp(1rem, 0.83rem + 0.2vw, 1.5rem);
--font-size-xl: clamp(1.125rem, 0.91rem + 0.25vw, 1.75rem);
--font-size-2xl: clamp(1.25rem, 0.97rem + 0.36vw, 2.125rem);
--font-size-3xl: clamp(1.5rem, 1.1rem + 0.5vw, 2.625rem);
--font-size-4xl: clamp(1.75rem, 1.2rem + 0.7vw, 3.25rem);
--font-size-5xl: clamp(2rem, 1.3rem + 0.9vw, 4rem);
--font-size-6xl: clamp(2.5rem, 1.55rem + 1.2vw, 5rem);
--font-size-7xl: clamp(3rem, 1.75rem + 1.6vw, 6rem);
--font-size-8xl: clamp(3.5rem, 1.95rem + 2vw, 7.5rem);
```

### Shadows (dark-theme tuned — higher alpha than a light UI would use)

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
```

### Layout tokens

```css
--container-max: none; /* no side gutters below 4xl (3440px) */
--rail-w: 280px; /* steps to 320/360/400/440/480/520px at 1920/2560/3440/3840/5120/7680 */
--grid-gap: var(--spacing-lg);

--nav-panel-h: clamp(38px, 3.5vw, 52px); /* Command Center top nav panel */
--nav-btn-h: clamp(24px, 2.3vw, 34px);
--nav-input-h: clamp(20px, 1.8vw, 28px);
--nav-badge-h: clamp(16px, 1.4vw, 22px);
```

### sRGB fallback

`@supports not (color: oklch(0% 0 0))` redefines the back-compat-facing tokens
(`--primary-*`, `--neutral-*`, `--success/warning/danger/info-400/600`, …) as hex values, so
non-evergreen engines degrade to a usable (if flatter) palette instead of breaking.

## 3. Component Architecture & Conventions

### Styling approach

CSS Modules + `cn()` (a `clsx`-style class-name combinator from `lib/utils`). No Tailwind, no
CSS-in-JS runtime. Primitives live in `components/ui/` and follow a consistent shape:

- `forwardRef`-wrapped, `data-slot="button"`-style attributes for testability/styling hooks.
- Variant/size props implemented as CSS Module class lookups (`variantDefault`, `variantSecondary`,
  `variantOutline`, `variantGhost`, `variantLink`, `variantDestructive`), not inline style objects.
- A polymorphic `render` prop on `Button` allows cloning into another element (e.g. rendering a
  button visually while behaving as a Next.js `Link`).

### Primitive inventory

| Component | Variants                                                           | Sizes                            | Notes                                                              |
| --------- | ------------------------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------ |
| `Button`  | `default, secondary, outline, ghost, link, destructive`            | `default, sm, lg, icon, icon-sm` | `default` uses the primary→secondary gradient; CSS-only hover lift |
| `Card`    | `default, borderless`                                              | —                                | `CardHeader/Title/Description/Content/Footer/Action` subcomponents |
| `Badge`   | `default, secondary, destructive, outline, success, warning, info` | —                                | maps 1:1 to the semantic color scales                              |
| `Tabs`    | `TabsList` variant `default, line`                                 | —                                | context-driven controlled/uncontrolled state                       |
| `Spinner` | `default, secondary, white`                                        | `sm, default, lg, xl`            | SVG arc, CSS `@keyframes` only                                     |

No primitive imports `framer-motion` — see Motion philosophy above.

### Global element defaults

- `:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px }` applied globally —
  every interactive element gets a consistent focus ring without per-component styling.
- WCAG 2.5.8: `button, [role="button"], input[type=submit|reset|button]` get `min-height`/
  `min-width: 44px` globally.
- Bare `button` elements (before any component class) already carry sensible defaults —
  `border-radius: var(--radius-md)`, `background: var(--card)`, `box-shadow: var(--shadow-sm)`,
  `transition: all 0.25s ease` — so an unstyled button never looks broken.
- `h1`–`h3` and `p` set their own `font-family: Inter` explicitly (defense against any inherited
  override), with the fluid size scale (`h1` → `--font-size-5xl`, `h2` → `--font-size-3xl`, `h3` →
  `--font-size-2xl`) and progressively tighter line-height (1.1 / 1.2 / 1.3).
- Utility classes (`.card`, `.card-title`, `.btn-primary`, `.btn-secondary`, `.mono`,
  `.title-gradient`) exist alongside the componentized `ui/` primitives — legacy from before the
  primitive layer existed, still used in `Landing`/marketing-style screens and worth **migrating
  toward the `ui/` components rather than extending** in new work.

### Icons

`lucide-react` is the primary icon set (tree-shakeable, used throughout dashboards/panels/nav).
`react-icons` appears for icons lucide doesn't cover. A `Material Symbols` font-icon class exists
in the global stylesheet but is not the primary icon strategy — prefer `lucide-react` for new UI.

## 4. Product Surfaces

The application is organized around a small number of large, mostly-independent "surfaces" rather
than a uniform page template — each has its own dominant interaction model:

### Command Center (`/dashboard/live`)

The authenticated home shell: a floating role-filtered nav (`CenterNavPanel` — Onboarding, Team
Building, Dashboard, filtered by `viewer/operator/infra_admin/platform_admin` role) sits over a
globe view (`DataCenterGlobe`) with a cluster/team selector and a split `SiteRoomView`/
`SiteTeamPanel` layout, a bottom stats row, profile avatar, and an approval-alert badge. Nested
routes (`hardware`, `teams`, `reports`) render inside it as an `Outlet`. Idle time is used to
prefetch the lazy route chunks for likely next navigations.

### Digital Twin (`/digital-twin`)

A `react-three-fiber` `Canvas` (`OrbitControls` + `PerspectiveCamera`) laying out server racks in
3D from real site/location data. Clicking a rack opens a `ServerDetailsCard`/`SwitchDetailsCard`
detail panel. This is the highest-fidelity, most performance-sensitive surface in the app —
Three.js is lazy-loaded and kept out of the main bundle deliberately (see `App.tsx` module-preload
comments).

### Workflow Designer (`/workflows`, `infra_admin`/`platform_admin` only)

A visual agent-team builder on `@xyflow/react`. Custom node types: `agent` (avatar + colored status
dot for running/completed/error/idle), `action`, `placeholder` (drop target for drag-placed
agents). Side HUD panels (`AgentsPanel`, `AgentInspectorPanel`, `ToolCatalogPanel`,
`ModelClientPanel`) surface catalog data next to the canvas. Canvas state persists to
`localStorage`. Drag-and-drop file upload and drag-to-canvas agent placement are first-class
interactions here.

### Query Trace / agent execution streaming

The core "watch the agent work" UI. An SSE-driven `planBundle` derives run status (pending /
awaiting-approval / in-progress / completed / failed). Execution content renders through a strict
discriminated-union `BlockRouter` over block `kind` — `text, todo, table, list, reasoning, tool,
subagent, error` — one dedicated component per kind, explicitly no content-sniffing branches. Plan
approval surfaces as a distinct `ApprovalRequestCard`/`PlanApprovalCard`. In-flight text uses
`ShimmerText`; connection loss shows a `ReconnectBanner` over a `TracePanelSkeleton`. This
block-per-kind architecture is the pattern to preserve when porting or extending trace UI — new
content types get a new block component and a new case in the router, not a new `if` inside an
existing one.

### Report Builder

A drag-and-drop report editor on `@dnd-kit` (`SortableContext`/`useSortable`) over a `sections`
array (reorder/duplicate/delete), with section types `CoverSection, RichTextSection,
MetricGridSection, LineChartSection, DataTableSection, ImageSection, KpiStrip, SummarySection,
CustomSection`, a live preview pane, and a Jinja/export preview modal.

### Sandbox / Eval Panel

An evaluation-run dashboard with tabbed metric deep-dives: `throughput, latency, accuracy, errors,
tokens, dag_task, gpu, infra` (default tab `throughput`), plus a verdict hero/grid summarizing
pass/fail outcomes and a raw-JSON/logs drawer for debugging a run.

### Shared chat entry point

`ChatPanel` is the shared agent-chat input used across surfaces (not a full transcript view): an
auto-resizing textarea, `@`-mention agent picker with full keyboard navigation, a global Cmd/Ctrl+K
focus shortcut, and an optional "direct agent call" mode.

### Auth & session

Cookie-session auth via a BFF — no tokens ever live in browser storage. `AuthContext` checks
`/auth-api/auth/session` on mount with retry/backoff and normalizes role to
`viewer | operator | infra_admin | platform_admin`; login/logout are full-page redirects to the
BFF's `/auth-api/auth/login|logout`. Route-level protection wraps lazy routes in an error boundary

- Suspense (`RouteShell`/`ProtectedLazyRoute`) — that file is _not_ the visual app shell, it is
  purely the loading/error harness around each lazy page.

## 5. Motion & Interaction Catalog

| Pattern                           | Where                                                              | Mechanism                                                                            |
| --------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Card/button hover lift            | `.card`, `.btn-primary`, `Button` variants                         | CSS `transform: translateY(-1px/-2px)` + shadow step-up, `cubic-bezier(0.4,0,0.2,1)` |
| Gradient title text               | Landing hero (`.title-gradient`)                                   | `background-clip: text` + `background-position` keyframe loop                        |
| Floating background blobs         | Landing (`.bg-blob-*`)                                             | `filter: blur()` + `float` keyframe (translateY + rotate)                            |
| Expand/collapse                   | `ReasoningBlock`, `ReasoningAccordion`                             | `framer-motion` animated height/opacity                                              |
| Rotating label/word swap          | `RotatingText`                                                     | `framer-motion` `AnimatePresence` + `motion.span`                                    |
| Looping radar pulse               | `RadarScanner`                                                     | `framer-motion` looping `animate`/`transition`                                       |
| Sliding nav hover highlight       | `NavHoverEffect`                                                   | `framer-motion` `AnimatePresence` fade                                               |
| Streaming text shimmer            | `ShimmerText`                                                      | CSS-only masked gradient `background-position`, respects reduced-motion              |
| Skeleton loading                  | `TracePanelSkeleton`, `Shimmer`, `PulseDot`, `RecentFlowsSkeleton` | CSS Modules + keyframes, no JS loop                                                  |
| Team card "flight" between panels | `TravelingTeamCard`                                                | animated position transition between two anchor rects                                |
| Agent-to-rack connector           | `GhostTrail`                                                       | animated neon ribbon path between two DOM anchors                                    |

## 6. Accessibility

- Global `:focus-visible` ring (`2px solid var(--primary)`, `2px` offset) — never suppressed
  per-component.
- 44×44px minimum touch target on all interactive controls, enforced globally by selector rather
  than per-component discipline.
- `color-scheme: dark` set on `:root` so native controls (scrollbars, form widgets) render as dark
  by default rather than flashing light-themed chrome.
- `ShimmerText` and other continuous CSS animations respect `prefers-reduced-motion`.
- Status color is never the only signal: badges pair color with text/label (`success`/`warning`/
  `danger`/`info` variants carry a matching `-fg` foreground token, not color alone), consistent
  with how `Badge` variants are named after the _semantic_ state, not the raw color.
- Mobile is out of scope by explicit product decision (`MobileBlocker`) rather than being an
  unaddressed gap — don't treat sub-768px layout bugs as accessibility debt to fix; that gate is
  intentional.

## 7. Decision Log

**D1 — Dark-only, no theme toggle.** A control-room/ops product benefits from one deeply-tuned dark
palette more than from a half-supported light mode. `ThemeProvider.toggleTheme` is a no-op by
design, and any persisted `theme` value in storage is actively cleared on mount so a stale
preference from an earlier build can't reintroduce a broken light state.

**D2 — Hand-rolled OKLCH 50–950 scales instead of a Tailwind/config-driven palette.** No Tailwind
is in this stack; the scale structure (11 steps, chroma peak at 500) is reproduced by hand in plain
CSS custom properties so the palette is inspectable and editable without a build-time config step.

**D3 — `clamp()`-based fluid tokens instead of fixed breakpoint steps for spacing/type.** The
realistic display range for this product spans a 768px tablet to an 8K ops console. A fixed pixel
scale would force a choice between "cramped on a laptop" and "oversized on a 4K wall display."
`clamp()` interpolates continuously and saturates near 4K, avoiding both failure modes without
per-breakpoint overrides at every call site.

**D4 — Neutral scale tinted toward the primary hue (H 238) instead of true achromatic gray.**
Unlike products that use a fully neutral gray scale to stay "Switzerland" against a shifting accent,
this app has exactly one fixed accent hue (cobalt) for its entire lifetime — a faint cobalt tint in
the grays makes the whole palette read as one coherent family instead of "gray UI + blue accent."

**D5 — Two font families (Inter + Geist Mono), not three or four.** No separate display/heading
face is used — Inter carries headings, body, and UI chrome alike, differentiated by the fluid size
scale and weight. This is a simpler typographic system than a marketing-adjacent product needs,
appropriate for a dense operations console where predictable, scannable text matters more than
editorial variety.

**D6 — Motion strictly layered: CSS in primitives and loading states, `framer-motion` only for
meaningful enter/exit/move.** Given how much of this product streams live (SSE traces, real-time
metrics, 3D scenes), keeping continuous/high-frequency animation (hover, shimmer, skeletons) off the
JS main thread is a performance requirement, not a style preference. `framer-motion` is reserved for
discrete state transitions where its declarative enter/exit API earns its cost.

**D7 — Block-kind discriminated union for agent trace rendering, not content-sniffing.**
`BlockRouter` switches on an explicit `kind` field with one component per case. This is called out
because it is the single most important extensibility pattern in the app: every new agent
capability (a new tool type, a new structured output) becomes a new block kind and a new case, never
a growing `if` chain inside an existing block component.

**D8 — Mobile is gated, not degraded.** Rather than attempt a compressed mobile layout for a
3D-twin/canvas-heavy/multi-panel product, `MobileBlocker` hard-stops below 768px with a message to
switch devices. This keeps every other layout decision in the system free to assume a minimum
768px canvas without defensive mobile-first compromises.

**D9 — Legacy back-compat alias layer kept alongside the new semantic tokens.** `--primary`,
`--card`, `--foreground`, `--muted`, `--border`, `--background`, `--destructive` all resolve through
to the new `--color-*` alias layer rather than being removed, so pre-existing components keep
working through the token-system migration. New components should reference `--color-*` names
directly; the flat aliases are a bridge, not the target.
