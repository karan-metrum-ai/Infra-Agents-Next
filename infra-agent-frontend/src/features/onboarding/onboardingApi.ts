import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";
import type { SingleStepUploadRequest, SingleStepUploadResponse } from "./onboardingApi.types";

/**
 * Bulk-upload (CSV infrastructure ingestion) for the Onboarding flow.
 * Converts the Vite app's `store/slices/bulkUploadApiSlice.ts` `singleStepUpload`
 * mutation (its only endpoint `BulkUploadStepper.tsx` actually calls, per
 * that phase's own inventory) into RTK Query here.
 *
 * `getClusterIds` is deliberately NOT duplicated in this file — it already
 * lives in `@/features/teams/teamsApi` (`GET /bulk-upload/cluster-ids`,
 * same base path family as `singleStepUpload`'s `/bulk-upload/upload`) with
 * 3 existing live consumers (`SaveTeamModal`, `ActionButtonsPanel`,
 * `ClusterTeamSelector`); `BulkUploadStepper` imports `useGetClusterIdsQuery`
 * from there directly rather than this file re-declaring the same backend
 * call under a second cache key.
 */
export const onboardingApi = createApi({
  reducerPath: "onboardingApi",
  baseQuery: createBaseQuery("/api"),
  endpoints: (builder) => ({
    /** `POST /bulk-upload/upload` (multipart) — combined 5-level CSV ingestion. */
    singleStepUpload: builder.mutation<SingleStepUploadResponse, SingleStepUploadRequest>({
      query: ({
        csv_file,
        tenant_id,
        create_tenant_name,
        create_tenant_description,
        cluster_id,
      }) => {
        const formData = new FormData();
        formData.append("csv_file", csv_file);
        if (tenant_id !== undefined) formData.append("tenant_id", String(tenant_id));
        if (create_tenant_name) formData.append("create_tenant_name", create_tenant_name);
        if (create_tenant_description) {
          formData.append("create_tenant_description", create_tenant_description);
        }
        if (cluster_id !== undefined) formData.append("cluster_id", String(cluster_id));

        return {
          url: "/bulk-upload/upload",
          method: "POST",
          body: formData,
        };
      },
    }),
  }),
});

export const { useSingleStepUploadMutation } = onboardingApi;
