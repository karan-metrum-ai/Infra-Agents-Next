import type { UseFormReturn } from "react-hook-form";
import type { SandboxRunConfigFormValues } from "@/schemas/sandboxRunConfig.schema";

/** Shared prop shape for every `SandboxConfigForm` section — each section
 * reads/writes its own slice of the one RHF form instance owned by the
 * orchestrator, rather than the orchestrator prop-drilling individual
 * field values/setters down. */
export interface SandboxSectionProps {
  form: UseFormReturn<SandboxRunConfigFormValues>;
}
