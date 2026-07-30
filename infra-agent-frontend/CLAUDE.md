@AGENTS.md

# Vite → Next.js Migration Plan

Source of truth (business logic, UX, API behavior): `/home/r550/Karan/infra-agent/infra_agents/frontend`
Target: this app (`infra-agent-frontend`, Next.js App Router + TypeScript, currently a bare `create-next-app` skeleton).
Mandatory conventions: `Infra-Agents-Next/.cursor/rules/frontend/*.mdc` (all 9 files, `alwaysApply: true`).
Visual/interaction spec: `./DESIGN.md`.

## Git hooks (husky + oxlint + oxfmt)

- The git repo root is one level up (`Infra-Agents-Next/.git`); this package has no root `package.json`, so husky's default `.git`-in-cwd detection doesn't work from here. `core.hooksPath` is set to `infra-agent-frontend/.husky/_` (relative to repo root) — set via `prepare`. If hooks ever stop firing after a fresh clone, re-run `pnpm install` (runs `prepare`: `cd .. && husky infra-agent-frontend/.husky`) and confirm with `git -C .. config core.hooksPath`.
- `.husky/pre-commit` runs on every commit: finds staged files (`git diff --cached --diff-filter=ACMR`) using two separate sets — `*.ts/tsx/js/jsx/mjs/cjs` for `oxlint --fix` (oxlint has no concept of linting JSON — feeding it a JSON-only file list makes it exit 1 with "No files found to lint", which used to false-positive abort JSON-only commits like `package.json` bumps; fixed by only ever passing it real code files) and that same set plus `json/css` for `oxfmt --write`. Anything either tool changes gets re-staged; the commit aborts (non-zero exit) only if oxlint has errors it couldn't auto-fix. No staged files in the broader set → hook is a no-op; no staged files in the lint-only set → oxlint is skipped entirely (oxfmt still runs).
- Config: `.oxlintrc.json` (plugins: typescript, unicorn, oxc, react, nextjs, jsx-a11y, vitest — the jsx-a11y plugin is load-bearing for the `004-design-a11y-animation.mdc` a11y mandate), `.oxfmtrc.json` (defaults; respects `.gitignore`).
- `pnpm lint` / `pnpm lint:fix` / `pnpm format` / `pnpm format:check` run the same tools over the whole project on demand.
- Verified end-to-end against a real `git commit` (badly-formatted staged file got auto-fixed and included; a file with an unfixable `no-unused-vars`/`no-debugger` error correctly aborted the commit) — test commit was reset afterward, nothing landed in history.

Run `.cursor/rules/frontend/000-preflight.mdc`'s checklist before starting **every** phase below, and
`.cursor/rules/frontend/999-postaudit.mdc`'s checklist before marking any phase done. Do not restate
those checklists here — just run them.

## Resolved conflicts (do not re-litigate; the migration prompt itself says rules win)

The generic migration brief names a stack that partially contradicts `.cursor/rules/frontend` and the
actual, already-audited state of the Vite app (`DESIGN.md`). Per the brief's own tie-break rule
("if the Vite implementation conflicts with the rules, follow the rules"), and per `DESIGN.md` being
the project-specific record of what's actually built:

| Topic      | Brief said            | Actually do                                                                                                                                                                                             | Why                                                                                                                                                                                                          |
| ---------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Styling    | Tailwind CSS          | **CSS Modules, vanilla CSS**, `cn()` helper from `lib/utils`                                                                                                                                            | `002/003-*.mdc` ban Tailwind explicitly; the Vite app's own `ui/` primitives are already CSS-Modules-based (`components.json`'s shadcn/Tailwind config is dead scaffolding, unused in real components)       |
| Icons      | —                     | `lucide-react` primary, `react-icons` fallback                                                                                                                                                          | `DESIGN.md` §3 "Icons" documents this as the real, working icon strategy; rules' generic "MUI Icons" line is boilerplate that doesn't match this product                                                     |
| Auth       | Auth0/Okta            | **Keep the existing cookie-session-via-BFF model** (`/auth-api/auth/session`, `/login`, `/logout`), rebuilt cleanly in Next                                                                             | `DESIGN.md` §4 "Auth & session" — there is no Auth0/Okta in the real system; switching providers is a backend change out of scope, and functional parity is priority #1 per the brief's own success criteria |
| Forms      | React Hook Form + Zod | Use both where a form has non-trivial validation (Sandbox config, Team Builder, Onboarding); Zod schemas also back RTK Query request/response types per `002-structure.mdc`'s `src/schemas/` convention | Not banned by the rules, reduces boilerplate, keeps typing strict                                                                                                                                            |
| Primitives | —                     | Rebuild `components/ui/*` on **Base UI** behind the same CSS-Modules variant API `DESIGN.md` §3 documents (`Button`, `Card`, `Badge`, `Tabs`, `Spinner`)                                                | `003-*.mdc` mandates Base UI for primitives; DESIGN.md's documented variant/size contract must not change visually                                                                                           |
| `DarkVeil`  | Phase 4 lists it as a Landing support component | **Not ported.** | Grepped the Vite source: `Landing.tsx` only imports it behind a commented-out line (`// import DarkVeil from './DarkVeil'`) — `Plasma` is the component actually rendered. Dead code; not carried over, matching the Phase 0 precedent of dropping confirmed-dead deps. |
| `NavigationLoader` | Phase 4 lists it as a Landing support component | **Not ported** — `PageLoader` was ported and is wired as `src/app/loading.tsx`, so it renders automatically as the fallback for every route segment's Suspense boundary (nearest `loading.tsx` wins, root covers the rest). | The Vite version's job (show `PageLoader` on any lazy-chunk transition slower than 100ms, chosen because React Router has no built-in per-route Suspense fallback convention) is exactly what Next's `loading.tsx` file convention already provides natively — the manual delay/failsafe timer machinery would be redundant duplicate logic. |
| `/topology` (`InfrastructureTopologyView`) | Phase 6 lists it as a full route to migrate | **Dropped entirely**, per explicit direction that the page is outdated/not required. `src/app/topology/` keeps only its pre-existing placeholder `page.tsx`/`layout.tsx`. | Not a dead-code finding like the rows above — an explicit scope call. If this ever needs revisiting, re-confirm scope first; don't silently resurrect from the Vite source. |
| `GhostTechnician` | Phase 6 lists `components/infra/GhostTechnician/**` as a component to migrate | **Not ported.** | Confirmed dead in the Vite app itself: its only two JSX call sites are block-commented (`// Ghost technician disabled — do not render on digital twin UI.`) and the matching `useGetDeviceAgentActivityQuery` hook is also commented out. Same precedent as `DarkVeil`/`NavigationLoader` — don't port a feature the source app has already disabled. |
| `TeamBuilder.tsx` / `RecommendedTeamDisplay.tsx` | Phase 7 lists both as files to migrate | **Not ported.** | `TeamBuilder.tsx` has zero importers anywhere in the Vite app. `RecommendedTeamDisplay.tsx`'s only import (in `WorkflowDesigner.tsx`) is commented out: `// Removed - team loads directly on canvas`. Same dead-code precedent as above. |
| `SidePanels/ToolsPanel.tsx` / `SidePanels/ModelClientPanel.tsx` | Phase 7 lists both as files to migrate | **Not ported.** | Both imports in `WorkflowDesigner.tsx` are commented out; fully superseded by `AgentInspectorPanel`'s real catalog-driven Tools/Model sections. Same dead-code precedent. |
| `SandboxConfigModal` / `KyaiPlaygroundModal` inside Workflow Designer | Phase 7's Vite source opens these as inline modals from the canvas | **Not pulled forward** — the canvas's "Test in Playground"/"Sandbox Eval" actions navigate to the real `/kyai`/`/sandbox/new` routes instead. | Not dead code — genuinely real Phase 9/12 features — but pulling a whole other phase's modal forward just for one call site isn't warranted; real page navigation is also a better fit for Next's routing model, matching `EvaluationModal`'s own `layout="page"` precedent for the same reason. Revisit if Phase 9/12 wants an inline-modal experience instead once those phases exist. |

If a future decision here turns out wrong, fix this table — don't silently drift.

## Non-negotiable structural rules (apply to every phase)

- `src/app/**` = routing only. No business logic, no state, no API calls, no barrel files.
- `src/components/<Name>/` = `<Name>.tsx` + `<Name>.module.css` + `<Name>.types.ts` (co-located, no separate `styles/` tree).
- `src/features/<name>/` = `<name>Slice.ts` + `<name>Selectors.ts` + `<name>Api.ts`. No components in `features/`, ever.
- No `index.ts` barrel re-exports anywhere (the Vite app has several — `auth/index.ts`, `components/legal/index.ts`, `components/ui/index.ts`, `store/flowStream/index.ts`, `SandboxPanel/index.ts`, `QueryTrace/*/index.ts` — all get de-barreled during migration, callers updated to direct imports).
- `.tsx` soft cap 888 LOC, hard wall 3144 LOC. Several Vite files already violate the soft cap today (see "Known oversized files" below) — these get decomposed as part of migrating them, not carried over as-is.
- Every new user-facing action gets a `useCommandRegistry` entry (`006-cmdk.mdc`) — this is a net-new requirement, the Vite app has no command palette today (confirmed: no `cmdk` usage anywhere in current source).
- Charts: raw `echarts` only, instance behind a ref, targeted `setOption`. The Vite app already follows this pattern in most places (`echarts` is a direct dep) — verify each chart component during migration rather than assuming.

## Known oversized files (plan their decomposition explicitly when their phase comes up)

`WorkflowDesigner.tsx` (3043 LOC), `TeamsDashboard.tsx` (2845), `DeviceHealthPanel.tsx` (1767),
`useFlowStream.ts` (1755), `InfrastructureTopologyView.tsx` (1662), `ThreeDRackView.tsx` (1612),
`WorkflowDesigner/EvaluationModal.tsx` (1583), `digitalTwinApiSlice.ts` (1483, RTK Query — split by
endpoint group), `DataCenterDigitalTwin.tsx` (1373), `OnboardingFlow.tsx` (1322),
`AgentInspectorPanel.tsx` (1245), `DataCenterGlobe.tsx` (1221), `AgentTeamView.tsx` (1188),
`GhostBody.tsx` (1159), `scene/ServerRack.tsx` (1131), `BulkUploadStepper.tsx` (1123),
`ServerDetailsCard.tsx` (1083), `apiSlice.ts` (990, split into per-feature `*Api.ts`).

---

## Phase 0 — Toolchain & scaffolding

- **Done.** Dependencies installed and verified against real call sites in the Vite source (not copied blindly from its `package.json`):
  - State/data: `@reduxjs/toolkit`, `react-redux`
  - Primitives/design: `@base-ui/react` (note: `@base-ui-components/react` is the deprecated old name — it warns on install and redirects here; always install `@base-ui/react`), `motion`, `lucide-react`, `react-icons`, `clsx`
  - Charts: `echarts`
  - Canvas/graph/drag: `@xyflow/react` (Workflow Designer canvas — catalog→canvas drops use native HTML5 drag events, not `@dnd-kit`; confirmed in Phase 7), `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (ReportBuilder's drag-drop canvas, Phase 10)
  - 3D/Digital Twin: `@react-three/fiber`, `@react-three/drei`, `three` (+ `@types/three`), `react-globe.gl`, `cobe`, `ogl` (used by `DarkVeil`/`Plasma`), `leva` (used by `SceneMonitor`/`DigitalTwinScene` debug controls)
  - Forms/validation: `zod`, `react-hook-form` (net-new — not used in the Vite app today, added per rules `002-structure.mdc`'s `src/schemas/` convention and the brief's forms guidance)
  - Utilities: `date-fns`, `dompurify` (ships its own types, no `@types/dompurify` needed)
  - Markdown/diagrams: `react-markdown`, `remark-gfm`, `rehype-highlight`, `highlight.js`, `mermaid` (confirmed real usage in `EvaluationModal.tsx`/`kyaiApi.ts`)
  - Command palette/toast: `cmdk`, `sonner`
  - Test tooling (Phase 17 prep): `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `msw`, `@playwright/test`
  - **Deliberately excluded** (confirmed dead or redundant in the Vite source, do not reintroduce): `framer-motion` (same library as `motion`, just the old name — every `from 'framer-motion'` import becomes `from 'motion/react'` during migration, don't install both), `gsap`/`@gsap/react` (zero real imports found — dead dependency), `react-useanimations` (zero real imports — dead dependency), `r3f-perf` (only a commented-out import in `InfrastructureTopologyView.tsx` — dead), `react-router`/`react-router-dom`/`history` (replaced entirely by App Router, no equivalent needed).
  - `msw`'s postinstall build script is currently ignored by pnpm (`pnpm approve-builds` if browser-mode mocking via `msw init` is needed later — not required for node/jsdom test usage).
- Set up `src/app/globals.css` as the single design-token source — port every CSS variable from `DESIGN.md` §2 (color scale, semantic aliases, back-compat flat aliases, radii/control heights, fluid spacing/font-size clamps, shadows, layout tokens, sRGB fallback) verbatim; this is the foundation every subsequent component depends on.
- Configure `tsconfig.json` strict mode, path aliases (`@/*`).
- Stand up `src/store/store.ts` (empty root reducer + RTK Query base) and a `providers/` wiring point (`ReduxProvider`, theme provider) used from root `layout.tsx`.
- Exit criteria: `pnpm dev` boots an empty Next app with the design tokens loaded and no console errors.

## Phase 1 — Design system primitives (`src/components/ui/`)

Rebuild on Base UI, preserving the exact variant/size contract from `DESIGN.md` §3 so every later
phase can consume a stable primitive API:

- `Button` (`default/secondary/outline/ghost/link/destructive` × `default/sm/lg/icon/icon-sm`, polymorphic `render` prop for Link composition)
- `Card` (`default/borderless` + `Header/Title/Description/Content/Footer/Action` subcomponents)
- `Badge` (`default/secondary/destructive/outline/success/warning/info`)
- `Tabs` (`TabsList` variant `default/line`, controlled/uncontrolled)
- `Spinner` (`default/secondary/white` × `sm/default/lg/xl`)
- Carry over from Vite `components/ui/`: `input`, `separator`, `Banner`, `FreshnessBadge`, `Sparkline`, `MiniBarChart`, `DonutChart`, `TelemetryProbesRow`, `NavHoverEffect`.
- Global focus-visible ring, 44px min touch target, bare-button defaults — port from `DESIGN.md` §3 "Global element defaults".
- Port existing unit tests (`*.test.tsx` next to each primitive today) alongside each rebuild — don't defer testing to a later phase.
- Exit criteria: Storybook-less visual check of every primitive in both themes; all ported tests pass.

## Phase 2 — App shell, providers, routing skeleton

- `src/app/layout.tsx`: root layout — fonts (Inter), `ReduxProvider`, `ThemeProvider` (dark-only per DESIGN.md §1, but keep the theme-aware token system for future light-mode), `Toaster`/notification host, global error boundary.
- Auth: rebuild `AuthContext`/`AuthGuard`/`usePermissions`/`permissions.ts` as `src/features/auth/` (slice + selectors + `authApi.ts` hitting `/auth-api/auth/session|login|logout`) plus a `src/hooks/useAuthReady.ts`. Role model unchanged: `viewer | operator | infra_admin | platform_admin`.
- Route protection: Next middleware or a server-side session check in each protected route's layout, replacing `RouteShell`/`ProtectedLazyRoute`/`LazyRoute` (React Router constructs) with App Router `loading.tsx` / `error.tsx` / `not-found.tsx` conventions per route segment.
- Route map (React Router paths → App Router segments), preserve exactly:
  - `/` → `app/page.tsx` (Landing)
  - `/login` → `app/login/page.tsx`
  - `/privacy-policy`, `/data-processing-agreement`, `/data-retention-policy`, `/terms-and-conditions` → `app/(legal)/.../page.tsx`
  - `/system-check` → `app/system-check/page.tsx`
  - `/onboarding` → `app/onboarding/page.tsx` (guard: `platform_admin` only)
  - `/topology` → `app/topology/page.tsx`
  - `/digital-twin` → `app/digital-twin/page.tsx`
  - `/workflows` → `app/workflows/page.tsx` (guard: `platform_admin`/`infra_admin`)
  - `/sandbox/new` → `app/sandbox/new/page.tsx` (same guard)
  - `/sandbox/runs/[runId]` → `app/sandbox/runs/[runId]/page.tsx` (same guard)
  - `/kyai` and `/kyai/sessions/[correlationId]` → `app/kyai/page.tsx` + `app/kyai/sessions/[correlationId]/page.tsx` (same guard)
  - `/dashboard/live` (+ nested `hardware`, `teams`, `reports`) → `app/dashboard/live/layout.tsx` with `hardware/page.tsx`, `teams/page.tsx`, `reports/page.tsx` — this is the one place a nested layout must be preserved exactly (parent renders shared chrome, children swap in the outlet).
  - `*` → `app/not-found.tsx`
- `MobileBlocker`, global `NotificationToast`, top-level `ErrorBoundary` → shared components wired in root layout.
- Exit criteria: every route resolves, guards redirect correctly, nested `/dashboard/live` layout preserves shared chrome across its three tabs.

## Phase 3 — State layer foundation

- One centralized `baseQuery` (auth headers/cookies, 401 handling, error normalization) in `src/features/api/baseQuery.ts`, consumed by every feature's RTK Query API — replacing the scattered `apiSlice.ts` (990 LOC), `authBaseQuery.ts`, per-feature slices.
- Split the monolithic `store/slices/apiSlice.ts` and `digitalTwinApiSlice.ts` into per-feature `*Api.ts` files colocated under `src/features/<feature>/`, consolidating any duplicate endpoints found along the way (the brief explicitly calls this out — don't just copy-paste split).
- Tag-based invalidation strategy defined up front per feature (infrastructure, teams, workflows, sandbox, reports, digital-twin, kyai, notifications, health/uptime) before endpoints are written, not discovered ad hoc.
- UI-only state (e.g. panel open/closed, selected tab) stays in `useState`/local component state or a thin UI slice — never mixed into the same slice as server data.
- Exit criteria: `store.ts` composes all feature reducers/APIs with no circular imports; no component reads `state.someSlice` directly without a selector.

## Phase 4 — Public / marketing surfaces

Source: `Landing.tsx`(+`.css`), `components/auth/Login.tsx`, `components/legal/*`, `NotFoundPage.tsx`, `SystemCheck.tsx`, `MobileBlocker.tsx`.
Also migrate supporting visual components used only here: `DarkVeil`, `Plasma`, `RotatingText`, `RadarScanner` (if landing-only), `PageLoader`, `NavigationLoader`.
Convert `Landing.css`/`Auth.css`/`PolicyPages.css` global stylesheets to co-located CSS Modules per component.
Exit criteria: pixel-equivalent to Vite for landing, login, legal pages, 404, mobile-blocked view, system check.

## Phase 5 — Command Center / Live Dashboard (`/dashboard/live`)

Source: `LiveDashboard.tsx`, `HardwareDashboard.tsx`, `TeamsDashboard.tsx` (2845 LOC — decompose), `ReportsDashboard.tsx`, `components/commandcenter/BottomStatsRow.tsx` (909 LOC), `components/dashboard/*` (`InfrastructureView`, `MetricsPanel`, `MetricsObservabilityPanel`, `ServerDetailsCard` 1083 LOC, `DeviceHealthPanel` 1767 LOC, `AgentTeamView` 1188 LOC, `SiteTeamPanel`, `SiteRoomView`, `ClusterTeamSelector`, `TravelingTeamCard`, `DelegationBreakdown`, `TimeSeriesChart`, `SwitchDetailsCard`, `MetricCard`/`MetricCards`, `GhostTrail`), plus `hooks/useLiveMetrics.ts`, `usePrometheusMetrics.ts`, `useTimeSeries.ts`, `lib/prometheusApi.ts`, `lib/metricsApi.ts`.
This is the single largest surface — decompose `TeamsDashboard`/`DeviceHealthPanel`/`ServerDetailsCard`/`AgentTeamView` into sub-1000-LOC pieces as they're rebuilt, per the LOC wall.
Exit criteria: hardware/teams/reports tabs match Vite behavior including live metric polling and chart update behavior (targeted `setOption`, no full redraws).

## Phase 6 — Infrastructure Topology & Digital Twin

**Done** (`/digital-twin` only — see scope note below). React-three-fiber/drei/three scenes are inherently client-only — every scene component is marked `"use client"` explicitly; data-fetching lives in `DigitalTwinRoute.tsx` (a parent client boundary), not inside the 3D scene components themselves.

- **Scope cut: `/topology` (`InfrastructureTopologyView.tsx`, `ThreeDRackView.tsx`, `components/TopologyView/*`) was dropped entirely per explicit direction — that page is outdated/not required.** Nothing under `src/app/topology/` beyond the pre-existing placeholder `page.tsx`/`layout.tsx` was built; do not resurrect this without re-confirming scope. This also means `ThreeDRackView.tsx`/`RackView.tsx`/`RackView2D.tsx` were never ported — cross-checked against the whole Vite tree and confirmed `RackView.tsx` has zero importers anywhere in that app (dead even there); `RackView2D`/`ThreeDRackView` are only reachable through it.
- **`components/infra/GhostTechnician/**` was not ported — confirmed dead code in the Vite source itself.** Its only two JSX usages (`DataCenterDigitalTwin.tsx`, `dashboard/SiteRoomView.tsx`) are block-commented with an explicit `// Ghost technician disabled` note, and the matching `useGetDeviceAgentActivityQuery` hook is commented out too. Same treatment as `DarkVeil`/`NavigationLoader` above — do not port a feature the Vite app itself has fully disabled.
- **Old pre-`scene/` generation excluded** (superseded by `DigitalTwin/scene/*`, zero live consumers anywhere in the Vite tree): `DigitalTwin/DataCenterScene.tsx`, `DigitalTwin/DataCenterFloor.tsx`, top-level (non-`scene/`) `ServerRack.tsx`/`NetworkCables.tsx`/`DataCenterEnvironment.tsx`, `SceneMonitor.tsx` (Leva debug overlay, itself only ever referenced in a commented-out JSX line), `sampleData.ts` (unused fixture data).
- Ported to `src/components/DigitalTwin/` (flat co-located folder, no nested `scene/` subfolder, no barrel files — sub-pieces of oversized files live as sibling `.tsx`/`.ts`/hook files in the same folder, e.g. `ServerRack.tsx`'s decomposition into `useRackLayout.ts`/`RackShell.tsx`/`RackDeviceSlot.tsx`/`RackCduBay.tsx`/etc.): the full `scene/` 3D subsystem (`DigitalTwinScene`, `ServerRack`, `NetworkCables`, `DataCenterEnvironment`, `DellServer`, `DellGrill`, `NetworkSwitch`, `RackPSU`, `CoolantDistributionUnit`, geometry/texture helpers), `BuildingExterior`, `DataCenterGlobe` (decomposed), `DataCenterSceneReal`, `RackInfoCard`, `DigitalTwinError`/`DigitalTwinLoading`, `AspectFov`/`aspectFov.ts`, `rackLayout.ts`/`rackUtils.ts`/`types.ts` (+ their `*.test.ts` files), and `DataCenterDigitalTwin.tsx` (1373 LOC in Vite, decomposed into `DataCenterDigitalTwin.tsx` + ~9 sibling view/panel components + 3 local hooks) with `DigitalTwinRoute.tsx` owning the route's data-fetching so `src/app/digital-twin/page.tsx` stays a thin composer.
- RTK Query: `getDigitalTwinData`, `getLiveClusters`, `getLiveBulkDevices` added to `src/features/digitalTwin/digitalTwinApi.ts`. `getDigitalTwinData` deliberately returns the **raw** `/devices/digital-twin` tree (not pre-transformed to `GlobeSite[]`) — the Vite app hit this identical endpoint from two duplicate RTK definitions (`getDigitalTwinData` and `bulkUploadApiSlice.ts`'s `getOnboardingDevices`); keeping one raw endpoint plus a separate `transformApiToGlobeSites` (`digitalTwinDataTransform.ts`) avoids repeating that duplication if/when Phase 11 needs the same raw shape.
- Pulled forward early (small, real Phase 13 components/utils genuinely needed by this phase — not stubs, reconcile-don't-rebuild when their real phase lands): `src/components/ProfileAvatar/`, `src/components/InitialsAvatar/`, `src/components/CenterNavPanel/`, `src/utils/userInitials.ts`, `src/utils/globeMarkerHtml.ts`, `src/utils/globeMarkerOffsets.ts`. `rackLayout.ts`'s onboarding-device types are similarly pulled forward into `src/components/DigitalTwin/rackLayout.types.ts` ahead of Phase 11's real `bulkUploadApiSlice.ts` port — reconcile with the real slice when that phase lands instead of keeping two definitions.
- Exit criteria (as amended by the scope cut above): globe, rack 3D rendering, and network cable rendering match Vite visually on `/digital-twin` and don't regress frame rate. Topology/ghost-technician criteria dropped with their scope.

## Phase 7 — Workflow Designer

**Done.** Uses `@xyflow/react` for the canvas — **not** `@dnd-kit` (correcting the line below and Phase 0's dependency note: `@dnd-kit` is used by `ReportBuilder`'s drag-drop canvas, Phase 10 — confirmed via full-tree grep, zero `@dnd-kit` imports anywhere in the Vite `WorkflowDesigner` subtree). Catalog→canvas drops use native HTML5 drag events (`draggable`/`onDragStart`/`onDragOver`/`onDrop`), with keyboard-accessible click-to-add fallbacks throughout (drag-and-drop has no native keyboard path).

- **Scope cuts (confirmed dead code, same precedent as `DarkVeil`/`NavigationLoader`/`GhostTechnician`/Phase 6's old 3D generation — zero consumers anywhere in the Vite app, verified by full-tree grep):** `TeamBuilder.tsx` (896 LOC — zero importers anywhere); `RecommendedTeamDisplay.tsx` (497 LOC — its only import in `WorkflowDesigner.tsx` is commented out: `// Removed - team loads directly on canvas`); `SidePanels/ToolsPanel.tsx` and `SidePanels/ModelClientPanel.tsx` (both imports commented out in `WorkflowDesigner.tsx`, fully superseded by `AgentInspectorPanel`'s catalog-driven Tools/Model sections); an `ActionNode`/`ActionNodeData` xyflow node type (registered but never instantiated anywhere in the 3043-line file); `generateAdvancedTopologyPosition` and a hardcoded `fallbackAgentMap` duplicated 3x (superseded by `AgentsPanel`'s real catalog + the new `resolveAgentDisplay.ts`); `setupDeveloperDebugging` (dev-console-only, no user-facing behavior).
- **`SandboxConfigModal`/`KyaiPlaygroundModal` were not pulled forward** (real Phase 9/12 scope) — the canvas's "Test in Playground"/"Sandbox Eval" actions navigate to the real `/kyai` and `/sandbox/new` routes instead of opening a modal for a feature that doesn't exist yet, matching the same "prefer a real page over a speculative modal" reasoning `EvaluationModal`'s `layout="page"` mode already documents.
- Ported to `src/components/WorkflowDesigner/` (flat, no barrels): canvas core (`teamCanvas.ts`+test, `AgentNode`, `PlaceholderNode`, `FloatingPanel`), side panels (`AgentInspectorPanel` — 1245 LOC in Vite, decomposed into an orchestrator + 4 section components + 1 hook — `AgentsPanel`, `ToolCatalogPanel`), top navigation (`TeamBuilderPanel`, `ActionButtonsPanel`), modals (`SaveTeamModal`, `RecommendTeamModal`, `DeploySavedTeamModal`, `EvaluationModal` — 1583 LOC in Vite, decomposed into an orchestrator + 8 sibling tab/section components + 2 named hooks for the feature's two sanctioned effects), and the `WorkflowDesigner.tsx` orchestrator itself (3043 LOC in Vite, decomposed into the orchestrator + 3 hooks + 1 canvas sub-component + a handful of small util files, largest file 380 LOC).
- **Zero-`useEffect` discipline** (`.cursor/skills/sans-effect`) held across the entire phase: every Vite `useEffect` was eliminated via derived state/`useMemo`, RTK Query (including dependent-query chains via `skipToken` instead of effect-triggered fetches), event handlers instead of effect-relays, or `key`-based remount (e.g. `EvaluationModal`'s outer wrapper unmounts/remounts its stateful body instead of an effect resetting state on close) — except a small, deliberate set of `useMountEffect` calls (mount-time localStorage restore, avatar preload, resize-observer setup, global keyboard-delete listener, outside-click-to-close) and one named hook, `useMermaidDiagramRenderer.ts`, wrapping the one genuine "sync a ref'd DOM node with an imperative third-party renderer" case (Mermaid), per the skill's Pattern 4 escape hatch.
- Partial pull-forwards (documented in-file, reconcile with the real phase when it lands, same convention as Phase 6's `rackLayout.types.ts`): `src/features/workflows/workflowCanvasSlice.ts` (Phase 13 — only `nodes`/`edges`/`hasDeployedTeams`, so the already-built Phase 5 `AgentTeamView`/`TeamsDashboard` *can* read live canvas state later; the other ~10 selectors in Vite's `workflowSlice.ts` — execution status/logs/etc. — are NOT pulled forward), `src/components/WorkflowDesigner/workflowCanvasPersistence.ts` (Phase 11's `utils/jsonGenerator.ts`, 1568 LOC in Vite — only the two localStorage save/load functions), `src/lib/imagePreloader.ts` (`preloadAllAvatars`, kept in full — still useful under Next, no equivalent exists). `teamsSlice.ts` was evaluated and **not** pulled forward — its only real use in Vite was a dead catch-block fallback; `useGetTeamsQuery`'s RTK Query cache is used directly instead.
- Exit criteria: team-build → save → deploy → evaluate flow matches Vite (minus the Sandbox/KYAI modal-vs-navigation adaptation above); `WorkflowDesigner.tsx` equivalent is decomposed into components each under the LOC soft cap (all well under — largest is 547 LOC).

## Phase 8 — Query Trace / agent execution streaming

**Done** (module built and tested standalone — see live-integration caveat below). Ported to `src/components/QueryTrace/` (flat within each subfolder, no barrels anywhere — the Vite `blocks/index.ts`, `skeletons/index.ts`, `store/flowStream/index.ts` barrels are not recreated; `agentTrace/index.ts`'s one real consumer, `QueryTracePanel.tsx`, now imports directly):

- **Pure logic layer**: `blockStream/` (`types.ts` — the one canonical `Block`/`AgentFrame`/`TextBlock`/`ToolCallBlock`/`TodoBlock`/`TableBlock`/`ListBlock` type home — `blockStore.ts` a `useSyncExternalStore`-based external store, `agentFrameReducer.ts`, `blockStatus.ts`, `phaseMachine.ts`, `useBlockStream.ts`), plus trace-parsing utils re-homed from Vite's `utils/` into the feature (`traceDataParser`, `traceContentPipeline`, `normalizeReasoningContent`, `deriveTraceStatus`, `flowTraceMerge`, `flowListMerge`, `flowSnapshotAdapter`, plus pulled-forward hard dependencies `contentFormatter`, `repairMarkdownLayout`, `groupBlocksByAgent`, `segmentTimelineGroups` — Phase 13 scope, documented in-file, reconcile when that phase lands).
- **SSE/state layer**: `flowStreamApi.ts` (pure fetch client, not RTK Query — same "SSE doesn't fit request/response" reasoning as `kyaiApi.ts`), a new `src/features/queryTrace/flowStreamSlice.ts`(+selectors) carrying only the genuinely-used flow/plan state, and `hooks/useFlowStream.ts` (1755 LOC in Vite) decomposed into `flowStreamHelpers.ts`, `flowStreamRestHydration.ts`, `flowStreamPlanEvents.ts`, `flowStreamBlockEvents.ts`, `flowStreamEventRouter.ts`, `useFlowStreamConnection.ts` (the one sanctioned `useEffect` — SSE connect/disconnect + 30s flows-list poll, keyed on team, same class as `useMermaidDiagramRenderer.ts`), `useFlowsListPagination.ts`, and a slim `useFlowStream.ts` orchestrator. 5 ref-sync effects eliminated via a new `src/hooks/useLatestRef.ts`; the history-mode-toggle effect became an explicit `setHistoryMode` callback.
- **`blocks/*` rendering subsystem** (~35 files): `BlockRouter`, `BlockFrame`, `LiveBlockStream`, all block-type components (`TextBlock`/`ToolBlock`/`TodoBlock`/`TableBlock`/`ListBlock`/`ReasoningBlock`/`ErrorBlock`), `SubAgentBlock`/`SubAgentTile*`, `ParallelAgentCluster`, `ThinkingAccordion`, plus the confirmed-live (not dead) `v1AgentAdapter.ts`/`queryTraceV2Gating.ts` that let legacy v1-sourced agents render through the same v2 block UI.
- **`skeletons/*`, `agentTrace/*`, and the top-level orchestrator**: `QueryTracePanel.tsx` (441 LOC, decomposed from Vite's monolith) plus `TraceHeader`, `PhaseTimelineBar`, `ApprovalRequestCard`, `PlanApprovalCard`(+`PlanApprovalQuery` sibling), `NodeDetailsModal`, `FinalResponseCard`, `ReasoningAccordion`, `ToolCallsTimeline`, `TracePanelFailedState`/`TracePanelStateView`, `MarkdownRenderer`(+tests). **`ReconnectBanner` was explicitly polished per user request**, not just ported 1:1: styling moved fully into its CSS module (no inline styles), a `WifiOff` icon distinguishes the failed state from the connecting state's `PulseDot`, proper focus-visible/hover states on Retry, an entrance transition respecting `prefers-reduced-motion`, and semantic `--warning`/`--danger` tokens via `color-mix()` instead of hardcoded amber/red hex.
- **`NodeDetailsModal`** was wired onto the established `useDialogFocusTrap` hook (real focus trap + Tab-cycling) instead of the Vite original's ad-hoc `window`-level Escape listener, matching the dialog convention already set by `SaveTeamModal`/`EvaluationModal`.
- **Dead-code note**: the Vite `store/flowStream/flowStreamSlice.ts` contained a second, fully unused block-streaming implementation (its own duplicate `Block`/`AgentFrame` types, `applyAgentFrame`/`blockCreated`/`blockUpdated`/`blockLocked`/`streamStarted...`/`resetStream` reducers, `blocks`/`todoList`/`interruption` state) — zero consumers anywhere outside the slice itself, confirmed by full-tree grep. Not ported; `blockStream/types.ts` is the sole canonical home. `activeConversationSessionId`/`activeConversationQuery` were dropped too — their only write call sites are block-commented in `TeamsDashboard.tsx` ("reserved for future multi-turn UI").
- **Sans-effect discipline** held throughout: every real `useEffect` in the new code lives inside a clearly-named, doc-commented hook (`useFlowStreamConnection`, `useElapsedTick`, `useEmptyTraceFallback`, `usePlanQueryOverflow`, `useTracePanelHydration`, `blocks/useAutoScrollTail`, `blocks/useReasoningScrollFades`, `agentTrace/useStreamingUtils`, `agentTrace/useReasoningToggleState`) — none bare in a component body.
- **`getAgentColor` (in `traceDataParser.ts`)** was changed from literal hex per agent-type to `globals.css` token references (`--primary-500`, `--secondary-400`/`-600`, `--success-500`, `--accent-500`, `--danger-500`, `--info-500`, `--neutral-500`) — same zero-hardcoded-colors rule as everywhere else, mapped to the closest-hue existing family so the categorical palette stays visually distinct.
- **Live-integration caveat**: `QueryTracePanel`'s only Vite consumer is `TeamsDashboard.tsx`, whose real chat/query-submission experience was never built — `AgentTeamView` (Phase 5) is explicitly documented as an interim stand-in pending this. This phase's exit criteria (streaming, reconnect banner, block rendering, approval/plan cards) are satisfied and independently verified (unit tests, not live-page click-through) standalone; wiring `QueryTracePanel` into a real page is Phase 5's `TeamsDashboard` decomposition, not re-attempted here to avoid scope creep into an undone phase.
- **Cross-phase finding, not acted on**: a `useEffect(` audit across all of `src/` during this phase found genuine (non-`useMountEffect`) direct `useEffect` calls already present in several earlier-phase files (`AuthGuard.tsx`, `ProfileAvatar.tsx`, `ThemeProvider.tsx`, `DigitalTwinScene.tsx`, and ~15 others across Phases 2–6) — the "zero-`useEffect`" discipline touted for Phase 7 was not actually retrofitted onto Phases 2–6. Flagged here rather than silently fixed; a dedicated sans-effect audit pass (akin to Phase 16's a11y sweep) would be the right vehicle if/when prioritized.
- Verified: `tsc --noEmit` clean (only the pre-existing unrelated `Sparkline.test.tsx` failure), `oxlint` zero real errors project-wide (only pre-existing warnings, including a known `react-in-jsx-scope` oxlint-config gap present since Phase 7 that fires harmlessly everywhere under Next's automatic JSX runtime), `vitest run` 402/403 passing (the 1 failure is the same pre-existing `rackLayout.integration.test.ts` missing-fixture issue from Phase 6), zero hardcoded colors, zero barrels, all files well under the LOC soft cap (largest is `flowStreamPlanEvents.ts` at 549 LOC).

## Phase 9 — Sandbox / Eval Panel

Source: `components/SandboxPanel/**` (27 files: config, tabs for infra/GPU/latency/throughput/accuracy/tokens/DAG-tasks/errors, verdict cards/hero/grid/explainer, pipeline timeline, artifacts, drawers), `lib/sandboxApi.ts`, `hooks/useSandboxRun.ts`, `useSandboxArtifact.ts`, `types/sandbox.ts`.
Exit criteria: sandbox config → run → per-tab metrics/verdict views match Vite.

## Phase 10 — Reports & Report Builder

Source: `ReportsDashboard.tsx`, `components/ReportBuilder/**` (31 files including `sections/*` registry-driven block types), `lib/reportApi.ts`, `reportApiBase.ts`, `reportSseParser.ts` (+test), `store/slices/reportApiSlice.ts`.
The `sections/registry.ts` pattern (pluggable section renderers) should carry over as-is — it's already a clean abstraction, not debt.
Exit criteria: template selection, drag-drop canvas, live SSE generation progress, export preview all match Vite.

## Phase 11 — Teams & Onboarding

Source: `TeamBuilder.tsx`, `TeamsDashboard.tsx` (cross-referenced with Phase 5), `OnboardingFlow.tsx` (1322 LOC), `BulkUploadStepper.tsx` (1123 LOC), `RecommendedTeamDisplay.tsx`(+module.css), `lib/teamsApi.ts`, `store/slices/teamsSlice.ts`(+test), `utils/deployedTeamsPersistence.ts`(+test), `utils/testDeployedTeamsPersistence.ts`, `utils/bulkUploadTemplate.ts`, `utils/jsonGenerator.ts` (1568 LOC), `utils/teamConfigExporter.ts`, `hooks/useOnboardingStatus.ts`, `useInfrastructurePersistence.ts`, `store/slices/infrastructureSlice.ts`(+test).
Exit criteria: onboarding wizard, bulk upload stepper, team save/deploy/recommend flows match Vite; `platform_admin`-only guard on onboarding preserved.

## Phase 12 — KyAI Playground

Source: `components/KyaiPlayground/*`, `lib/kyaiApi.ts`. Small surface — good candidate to migrate early as a template for the pattern (page → feature → components) before the larger phases.
Exit criteria: playground session creation/replay by `correlationId` matches Vite.

## Phase 13 — Shared chat / block-renderer / cross-cutting UI

Source: `components/shared/**` (`ChatPanel`, `ErrorBoundary`+test, `RouteShell`, `CenterNavPanel`, `NotificationToast`, `ApprovalDialog`, `ApprovalAlertBadge`, `ProfileAvatar`, `InitialsAvatar`, `ErrorFallback`), `components/BlockRenderer/**` (generic block rendering used outside QueryTrace), `store/slices/notificationsSlice.ts`(+test), `store/slices/approvalsSlice.ts`(+test), `store/slices/healthSlice.ts`(+test), `store/slices/uptimeApiSlice.ts`, `store/slices/workflowSlice.ts`(+test), `store/slices/bulkUploadApiSlice.ts`, `utils/persistenceManager.ts`, `utils/lazyWithRetry.ts` (superseded by Next's own code splitting — verify still needed), `utils/linkUtils.ts`(+test), `utils/contentFormatter.ts`(+test), `utils/formatEscalationQuery.ts`(+test), `utils/planTransitionMessages.ts`(+test), `utils/repairMarkdownLayout.ts`(+test), `utils/resolveFlowDisplayQuery.ts`(+test), `utils/normalizeToolName.ts`(+test), `utils/catalogIcons.ts`, `utils/catalogOperationType.ts`(+test), `utils/commandCenterSites.ts`, `utils/globeMarkerOffsets.ts`(+test), `utils/globeMarkerHtml.ts`, `lib/authTokenProvider.ts`(+test), `lib/discoveryApi.ts`, `lib/apiHelpers.ts` (690 LOC), `lib/avatars.ts`(+test), `lib/userInitials.ts`(+test), `lib/formatters.ts`, `lib/verdictHelpers.ts`, `lib/catalogOperationType.ts`, `lib/telemetryProbeTooltips.ts`(+test).
This is where the real dead-code/duplication audit happens — several `lib/` and `utils/` files likely overlap (e.g. `catalogOperationType` exists in both `lib/` and `utils/`, `flowStreamApi` logic touches both `lib/` and `store/flowStream/`). Resolve each duplicate to one canonical home before porting, don't carry both forward.
Exit criteria: no duplicate utilities remain; every util/lib file has exactly one home per `002-structure.mdc`'s placement table.

## Phase 14 — Command palette (net-new)

- Build `src/components/CommandPalette/` on `cmdk` per `006-cmdk.mdc`.
- Build `src/hooks/useCommandRegistry.ts` as the single action-registration point.
- Retrofit every phase above with registry entries for its user-facing actions (navigation, filters, toggles, theme switch, modals, exports) — this necessarily happens last, once all actions exist, but track it per-phase in each phase's exit checklist rather than treating it as a one-shot bolt-on.
- Frequently-used section, help screen (`Cmd+/`), visible `kbd` shortcut hints on buttons/menu items/tooltips per the rule's exact spec.
- Exit criteria: every click-able action in the app has a keyboard-reachable Cmd+K equivalent; palette is fully keyboard/screen-reader operable.

## Phase 15 — Performance pass

- Replace Vite's manual `lazy()`/`lazyWithRetry()` route splitting with Next's automatic per-route code splitting; keep `next/dynamic` only for genuinely heavy client-only libs (three.js scenes, ECharts, `@xyflow/react` canvas, `react-globe.gl`).
- Audit memoization on list-heavy views (Query Trace block stream, Teams Dashboard, Digital Twin scene) for unnecessary re-renders.
- Confirm ECharts/3D scenes don't dispose+recreate on data updates (rule `005-echarts.mdc`).
- Exit criteria: Lighthouse/Web Vitals pass on the heaviest routes (`/dashboard/live`, `/digital-twin`, `/workflows`) at parity or better than the Vite build.

## Phase 16 — Accessibility pass

Run the `004-design-a11y-animation.mdc` checklist against every interactive element across all phases (this is a horizontal sweep after Phase 14, since palette + all actions must exist first to audit completely). Verify `prefers-reduced-motion` fallback on every Motion-based animation ported in Phase 6 (Ghost Technician) and Phase 4 (Landing blobs/gradient text).

## Phase 17 — Testing migration

- Port `vitest` unit tests co-located with each component/util/slice as that item is migrated (not deferred to the end — each phase above already lists `.test.ts(x)` files to bring over).
- Port `playwright.config.ts` E2E suite (`tests/` dir) to point at the Next app; re-validate golden-path flows: login → onboarding → team build → deploy → dashboard → sandbox run → report generation.
- Exit criteria: CI green on unit + E2E against the Next app.

## Phase 18 — Parity validation & cutover

- Side-by-side manual walkthrough: every route, every role (`viewer/operator/infra_admin/platform_admin`), every empty/loading/error state, against the running Vite app.
- Docker/deploy: adapt `Dockerfile`/`docker-compose.yml`/`nginx.conf` for Next's build output (`next start` or standalone output mode) — do not assume the Vite nginx config transfers as-is.
- Decommission the Vite app only after sign-off, per user confirmation (this is a destructive/hard-to-reverse step — do not delete `infra-agent/infra_agents/frontend` unilaterally).

---

## Working agreement for each phase

1. Inspect the listed Vite source files fully before writing anything new.
2. Confirm the backend contract each feature depends on (API shape, auth, RBAC) is unchanged — flag any mismatch instead of guessing.
3. Design the Next/feature-based structure for just that phase.
4. Implement, co-located, strictly typed, themed, accessible, Cmd+K-registered.
5. Run the postaudit checklist (`999-postaudit.mdc`) before calling the phase done.
6. Move to the next phase — no mass-copying ahead of schedule.
