import { redirect } from "next/navigation";

/**
 * Backward-compatible singular route alias used by customer requests.
 * Keep a single source of truth at `/workflows`.
 */
export default function WorkflowAliasPage() {
  redirect("/workflows");
}
