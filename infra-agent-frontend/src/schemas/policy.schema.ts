import { z } from "zod";

export const privacyPolicySchema = z.object({
  id: z.string(),
  version: z.string(),
  title: z.string(),
  content_md: z.string(),
  effective_at: z.string(),
  acceptance_ttl_days: z.number(),
  is_active: z.boolean(),
});
export type PrivacyPolicy = z.infer<typeof privacyPolicySchema>;

export const policyAcceptanceStatusSchema = z.object({
  accepted: z.boolean(),
  policy_id: z.string().nullable(),
  policy_version: z.string().nullable(),
  accepted_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  requires_renewal: z.boolean(),
});
export type PolicyAcceptanceStatus = z.infer<typeof policyAcceptanceStatusSchema>;

export const acceptPolicyResponseSchema = z.object({
  accepted: z.boolean(),
  policy_id: z.string(),
  policy_version: z.string(),
  accepted_at: z.string(),
  expires_at: z.string().nullable(),
  requires_renewal: z.boolean(),
});
export type AcceptPolicyResponse = z.infer<typeof acceptPolicyResponseSchema>;

export interface AcceptPolicyRequest {
  policy_id: string;
  policy_version?: string;
}
