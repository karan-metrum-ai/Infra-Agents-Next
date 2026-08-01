import { z } from "zod";
import { organizationSchema } from "@/schemas/organization.schema";

export const authUserSchema = z.object({
  sub: z.string().optional(),
  email: z.string().optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const sessionResponseSchema = z.object({
  authenticated: z.boolean(),
  user: authUserSchema.nullable().optional(),
  organization: organizationSchema.nullable().optional(),
  role: z.string().nullable().optional(),
  tenant_id: z.string().nullable().optional(),
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
