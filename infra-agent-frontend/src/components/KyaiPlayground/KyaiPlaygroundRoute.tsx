"use client";

import { useRouter } from "next/navigation";
import { EvaluationModal } from "@/components/WorkflowDesigner/EvaluationModal";

interface KyaiPlaygroundRouteProps {
  correlationId?: string;
}

/**
 * `/kyai` and `/kyai/sessions/[correlationId]` route bridge.
 *
 * Ported from the Vite app's `components/KyaiPlayground/KyaiPlaygroundRoute.tsx`
 * + `KyaiPlaygroundModal.tsx` (74 LOC combined) -- both were pure indirection
 * into `WorkflowDesigner/EvaluationModal.tsx`, the component that actually
 * owns every bit of KYAI playground behavior (team selection, live SSE
 * evaluation, trajectory/diagram tabs, replay by correlationId).
 *
 * The Vite source redirected these legacy URLs into an inline modal opened
 * on `/workflows`. This app's Phase 7 port of `EvaluationModal` already
 * added a `layout="page"` mode specifically for this route (see its own
 * doc comment: "'page' renders the same content as a standalone route (used
 * by `/kyai`)"), so this component renders that mode directly instead of
 * redirecting anywhere -- matching the same "prefer a real page over a
 * cross-page redirect-then-reopen-as-modal dance" precedent already used
 * by `SandboxConfigForm.tsx` for `/sandbox/new`.
 *
 * `onClose` navigates back to `/workflows` (this route's one meaningful
 * "close" destination, since `layout="page"` has no overlay to dismiss).
 */
export function KyaiPlaygroundRoute({ correlationId }: KyaiPlaygroundRouteProps) {
  const router = useRouter();

  return (
    <EvaluationModal
      isOpen
      layout="page"
      correlationId={correlationId}
      onClose={() => router.push("/workflows")}
    />
  );
}

export default KyaiPlaygroundRoute;
