import { z } from "zod";

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  display_name: z.string(),
  domain: z.string(),
  created_at: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type Organization = z.infer<typeof organizationSchema>;
