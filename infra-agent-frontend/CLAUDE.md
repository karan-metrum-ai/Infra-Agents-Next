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
  - Canvas/graph/drag: `@xyflow/react` (Workflow Designer canvas), `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
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

Source: `InfrastructureTopologyView.tsx` (1662 LOC), `ThreeDRackView.tsx` (1612), `components/TopologyView/*` (`RackView`, `RackView2D`, `DeviceNode`, `OnboardingSuccessModal`), `components/DigitalTwin/**` (whole subtree — scenes, rack geometry, globe, environment, network cables — largest single feature by file count), `components/infra/GhostTechnician/**` (ghost avatar rig — `GhostBody` 1159 LOC, procedural body, arm animation, material, trail, tag).
React-three-fiber/drei/three scenes are inherently client-only — mark every scene component `"use client"` explicitly and keep data-fetching in a parent server/client boundary component, not inside the 3D scene itself.
Exit criteria: rack rendering, globe, ghost technician animation, network cable rendering all match Vite visually and don't regress frame rate.

## Phase 7 — Workflow Designer

Source: `WorkflowDesigner.tsx` (3043 LOC — hard-wall violation, mandatory decomposition), `components/WorkflowDesigner/**` (`AgentNode`, `PlaceholderNode`, `FloatingPanel`, `SaveTeamModal`, `RecommendTeamModal`, `DeploySavedTeamModal`, `EvaluationModal` 1583 LOC, `teamCanvas.ts` + its test, `SidePanels/*` — `AgentInspectorPanel` 1245 LOC, `ToolCatalogPanel`, `AgentsPanel`, `ToolsPanel`, `ModelClientPanel`, `TopNavigation/*` — `TeamBuilderPanel`, `ActionButtonsPanel`), `TeamBuilder.tsx`, `RecommendedTeamDisplay.tsx`.
Uses `@xyflow/react` for the canvas — keep node/edge state in the canvas's own feature slice, not mixed with server data.
Exit criteria: full team-build → save → deploy → evaluate flow matches Vite; `WorkflowDesigner.tsx` equivalent is decomposed into components each under the LOC soft cap.

## Phase 8 — Query Trace / agent execution streaming

Source: `components/QueryTrace/**` (by far the deepest subtree: `blocks/*` ~35 files, `skeletons/*`, `agentTrace/*`, `blockStream/*` — SSE/stream state machine), `hooks/useFlowStream.ts` (1755 LOC), `store/flowStream/*`, `lib/flowStreamApi.ts` (+test), `utils/traceDataParser.ts` (+tests), `utils/traceContentPipeline.ts`, `utils/normalizeReasoningContent.ts`, `utils/deriveTraceStatus.ts`, `utils/flowTraceMerge.ts`, `utils/flowListMerge.ts`, `utils/flowSnapshotAdapter.ts`.
This is the most stateful, streaming-heavy surface in the app — treat `blockStream/` (block store, phase machine, agent-frame reducer) as its own well-tested feature module; do not flatten it into a generic slice. Preserve all existing unit tests for parsers/reducers (`*.test.ts` files throughout this subtree) since they encode subtle streaming edge cases.
Exit criteria: live trace streaming, reconnect banner, block rendering (text/tool/todo/reasoning/table/list/error blocks), and approval-request/plan-approval cards behave identically to Vite, including interruption handling.

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
