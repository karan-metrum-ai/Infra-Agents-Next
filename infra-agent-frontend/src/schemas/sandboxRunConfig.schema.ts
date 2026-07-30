import { z } from "zod";
import { defaultRunRequest } from "@/features/sandbox/sandboxApi.types";
import type { SandboxRunRequest } from "@/features/sandbox/sandboxApi.types";

/**
 * Sandbox run-config form schema — backs the React Hook Form + Zod form in
 * `SandboxConfigForm.tsx` (ported from the Vite app's `SandboxConfigModal.tsx`).
 *
 * This mirrors `SandboxRunRequest` (`@/features/sandbox/sandboxApi.types`)
 * field-for-field for everything the UI actually exposes, plus a handful of
 * UI-only fields the wire type has no equivalent for (`kbSourceType`,
 * `kbFileName` — display bookkeeping for the KB upload flow, `enableOptimization`
 * — the inverse of the wire's `skip_optimize`, matching the Vite original's
 * "Enable DSPy optimization pass" checkbox). `toSandboxRunRequest` maps the
 * validated form values back to the canonical wire shape; `SandboxRunRequest`
 * itself is NOT redeclared here — `sandboxApi.types.ts` remains its one
 * canonical home per that file's own doc comment.
 *
 * Validation ported from the Vite original's actual checks (there was no
 * ad hoc `if (!x) setError(...)` validation beyond this in `SandboxConfigModal.tsx`
 * — only `canStart = (draft.agents?.team ?? []).length > 0`, gating the
 * Start button):
 *  - `team`: at least one agent selected (was `canStart`'s only real guard).
 *  - `machineCount` / `numQueries` / `concurrency`: integer + the same
 *    min/max the original enforced only via the `<input min max>` HTML
 *    attributes (1-100, 1-500, 1-100) — those are decorative on their own
 *    (a user can still type/paste out-of-range values), so Zod now actually
 *    enforces them. These stay plain `z.number()` (not `z.coerce.number()`)
 *    — the numeric inputs use RHF's `valueAsNumber` on `register` instead,
 *    so the schema's input/output types match exactly and `useForm` doesn't
 *    need the separate input/output generic dance `z.coerce` would force.
 *  - `baseUrl`: optional, but if provided must look like an `http(s)://` URL
 *    — a genuine new validation (the original had none), added because a
 *    malformed base URL silently breaks every sandbox run and the field's
 *    own placeholder documents the expected shape.
 */
export const sandboxRunConfigSchema = z.object({
  machineCount: z
    .number("Enter a number")
    .int("Must be a whole number")
    .min(1, "Must be at least 1")
    .max(100, "Must be 100 or fewer"),
  team: z.array(z.string()).min(1, "Select at least one agent"),
  enableOptimization: z.boolean(),
  kbSourceType: z.enum(["default", "custom"]),
  kbSource: z.string().optional(),
  kbFileName: z.string().nullable().optional(),
  numQueries: z
    .number("Enter a number")
    .int("Must be a whole number")
    .min(1, "Must be at least 1")
    .max(500, "Must be 500 or fewer"),
  concurrency: z
    .number("Enter a number")
    .int("Must be a whole number")
    .min(1, "Must be at least 1")
    .max(100, "Must be 100 or fewer"),
  modelId: z.string().optional(),
  baseUrl: z
    .string()
    .optional()
    .refine((value) => !value || /^https?:\/\//.test(value), {
      message: "Must start with http:// or https://",
    }),
});

export type SandboxRunConfigFormValues = z.infer<typeof sandboxRunConfigSchema>;

/** Built-in KB path the Vite original silently falls back to at submit time
 * whenever no explicit `kb_source` ended up set — ported verbatim from
 * `SandboxConfigModal.tsx`'s `handleStart`. */
export const DEFAULT_KB_SOURCE = "/app/config/infra_monitoring_kb.md";

/** Initial form values, derived from the canonical `defaultRunRequest()` so
 * this form's defaults never drift from the wire type's own defaults. */
export function defaultSandboxRunConfigFormValues(): SandboxRunConfigFormValues {
  const base = defaultRunRequest();
  return {
    machineCount: base.simulator?.machine_count ?? 8,
    team: base.agents?.team ?? [],
    enableOptimization: !(base.agents?.skip_optimize ?? false),
    kbSourceType: "default",
    kbSource: DEFAULT_KB_SOURCE,
    kbFileName: null,
    numQueries: base.dataset?.num_queries ?? 30,
    concurrency: base.dataset?.concurrency ?? 1,
    modelId: "",
    baseUrl: "",
  };
}

/** Maps validated form values to the `SandboxRunRequest` wire shape
 * `useStartRunMutation` expects, layered on top of `defaultRunRequest()` so
 * fields the form doesn't expose (`simulator.category_mix`/`scenario`,
 * `teardown_after`) keep their Vite-original defaults untouched. */
export function toSandboxRunRequest(values: SandboxRunConfigFormValues): SandboxRunRequest {
  const base = defaultRunRequest();
  const kbSource =
    values.kbSourceType === "custom" && values.kbSource ? values.kbSource : DEFAULT_KB_SOURCE;

  return {
    ...base,
    simulator: { ...base.simulator, machine_count: values.machineCount },
    dataset: {
      mode: base.dataset?.mode ?? "generate",
      num_queries: values.numQueries,
      concurrency: values.concurrency,
      kb_source: kbSource,
    },
    agents: { team: values.team, skip_optimize: !values.enableOptimization },
    model_id: values.modelId?.trim() ? values.modelId.trim() : undefined,
    base_url: values.baseUrl?.trim() ? values.baseUrl.trim() : undefined,
  };
}
