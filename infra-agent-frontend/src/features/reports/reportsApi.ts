import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";
import type {
  ApiComponent,
  ApiTemplate,
  CatalogCategory,
  CatalogMetric,
  CatalogStatsResponse,
  DataAvailability,
  GenerateReportRequest,
  GenerateReportResponse,
  ListReportsResponse,
  PreviewDraft,
  PreviewResponse,
  PublishResponse,
  SaveTemplateFromBuilderRequest,
  SectionPreview,
} from "./reportsApi.types";

/**
 * Report Builder templates, catalog, and non-streaming generation.
 * Converts the Vite app's `lib/reportApi.ts` (raw `fetch` client) and
 * `store/slices/reportApiSlice.ts` (a second, RTK-Query-based `getReports`
 * with its own bypass-`baseQuery` `queryFn`) into one consolidated RTK
 * Query API per the "one canonical home" rule — `generateReportStream`
 * (SSE) is NOT here, see `reportsStream.ts`.
 *
 * **Deviation from the Vite source**: `getReportApiBase()`'s cluster-id
 * discovery (`/clusterid-{id}/report-api`) is not ported — see the doc
 * comment on `reportsStream.ts` for why. `createBaseQuery("/report-api")`
 * matches every other feature's static-base-path convention in this app.
 *
 * **Deviation**: the Vite source's `getDataAvailability` (120s) and
 * `generateReport` (600s) requests set a client-side `AbortController`
 * timeout via a `timeoutMs` option on their hand-rolled `request()`
 * wrapper. `fetchBaseQuery`/`createBaseQuery` has no equivalent per-call
 * timeout knob, and these are the only two endpoints in the entire app
 * that ever wanted one — not porting it; the request will wait for the
 * server rather than client-abort early. Revisit with a `queryFn` +
 * manual `AbortController` if a runaway hang is ever reported. Streaming
 * generation (`reportsStream.ts`) does keep its 600s abort, since that
 * path already needed a manual `fetch`/reader loop for SSE anyway.
 *
 * Tag strategy: `Templates` keyed per `template_id` plus a shared `"LIST"`
 * id (list/save/publish/delete all touch the list); `Reports` is a single
 * whole-list tag (`RecentReportsPanel` polls it, no per-item cache needed).
 */
export const reportsApi = createApi({
  reducerPath: "reportApi",
  baseQuery: createBaseQuery("/report-api"),
  tagTypes: ["Templates", "Reports"],
  endpoints: (builder) => ({
    /** `GET /templates` */
    listTemplates: builder.query<{ templates: ApiTemplate[]; count: number }, void>({
      query: () => "/templates",
      providesTags: (result) => [
        ...(result?.templates.map((t) => ({ type: "Templates" as const, id: t.template_id })) ??
          []),
        { type: "Templates" as const, id: "LIST" },
      ],
    }),

    /** `GET /templates/:templateId` */
    getTemplate: builder.query<ApiTemplate, string>({
      query: (templateId) => `/templates/${templateId}`,
      providesTags: (_result, _error, templateId) => [{ type: "Templates", id: templateId }],
    }),

    /** `POST /templates/preview` — renders a live Jinja HTML preview, no server-side persistence. */
    previewTemplate: builder.mutation<PreviewResponse, PreviewDraft>({
      query: (draft) => ({ url: "/templates/preview", method: "POST", body: draft }),
    }),

    /** `POST /templates/publish` */
    publishTemplate: builder.mutation<PublishResponse, { content: string }>({
      query: (body) => ({ url: "/templates/publish", method: "POST", body }),
      invalidatesTags: [{ type: "Templates", id: "LIST" }],
    }),

    /** `POST /templates/save` — persists the canvas schema as a template. */
    saveTemplateFromBuilder: builder.mutation<PublishResponse, SaveTemplateFromBuilderRequest>({
      query: (body) => ({ url: "/templates/save", method: "POST", body }),
      invalidatesTags: [{ type: "Templates", id: "LIST" }],
    }),

    /** `DELETE /templates/:templateId` */
    deleteTemplate: builder.mutation<{ deleted: string }, string>({
      query: (templateId) => ({ url: `/templates/${templateId}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, templateId) => [
        { type: "Templates", id: templateId },
        { type: "Templates", id: "LIST" },
      ],
    }),

    /** `GET /templates/:templateId/section-previews` */
    getSectionPreviews: builder.query<
      { template_id: string; sections: SectionPreview[]; count: number },
      string
    >({
      query: (templateId) => `/templates/${templateId}/section-previews`,
    }),

    /** `GET /components` — API-defined block-library components (gated behind `COMPONENTS_TAB_ENABLED`). */
    listComponents: builder.query<{ components: ApiComponent[]; count: number }, void>({
      query: () => "/components",
    }),

    /** `GET /reports` — recently generated report list; `RecentReportsPanel` polls this every 20s. */
    listReports: builder.query<ListReportsResponse, void>({
      query: () => "/reports",
      providesTags: ["Reports"],
      keepUnusedDataFor: 60,
    }),

    /** `GET /catalog/categories` */
    getCatalogCategories: builder.query<{ categories: CatalogCategory[]; count: number }, void>({
      query: () => "/catalog/categories",
    }),

    /** `GET /catalog/:categoryId` */
    getCatalogCategory: builder.query<
      { id: string; label: string; metrics: CatalogMetric[] },
      string
    >({
      query: (categoryId) => `/catalog/${categoryId}`,
    }),

    /** `GET /catalog/stats` */
    getCatalogStats: builder.query<CatalogStatsResponse, void>({
      query: () => "/catalog/stats",
    }),

    /** `GET /data-availability` */
    getDataAvailability: builder.query<DataAvailability, void>({
      query: () => "/data-availability",
    }),

    /** `POST /reports/generate` — non-streaming generation (used by `generate_only` templates). */
    generateReport: builder.mutation<GenerateReportResponse, GenerateReportRequest>({
      query: (body) => ({ url: "/reports/generate", method: "POST", body }),
      invalidatesTags: ["Reports"],
    }),
  }),
});

export const {
  useListTemplatesQuery,
  useGetTemplateQuery,
  useLazyGetTemplateQuery,
  usePreviewTemplateMutation,
  usePublishTemplateMutation,
  useSaveTemplateFromBuilderMutation,
  useDeleteTemplateMutation,
  useGetSectionPreviewsQuery,
  useLazyGetSectionPreviewsQuery,
  useListComponentsQuery,
  useListReportsQuery,
  useGetCatalogCategoriesQuery,
  useGetCatalogCategoryQuery,
  useLazyGetCatalogCategoryQuery,
  useGetCatalogStatsQuery,
  useGetDataAvailabilityQuery,
  useGenerateReportMutation,
} = reportsApi;
