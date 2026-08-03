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
 * added a `layout="page"` mode specifically for this route — that mode now
 * uses the same page-hosted modal chrome as `/sandbox/new` (header → body,
 * global `.btn-primary` / `.btn-secondary`), not a PageHero stack.
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
