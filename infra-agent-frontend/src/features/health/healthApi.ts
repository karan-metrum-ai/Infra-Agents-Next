import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";

export interface HealthResponse {
  status: string;
  kubernetes: string;
  templates: number;
  timestamp: string;
  database?: string;
  version?: string;
}

export const healthApi = createApi({
  reducerPath: "healthApi",
  baseQuery: createBaseQuery("/api"),
  tagTypes: ["Health"],
  endpoints: (builder) => ({
    getHealth: builder.query<HealthResponse, void>({
      query: () => "/health",
      providesTags: ["Health"],
    }),
  }),
});

export const { useGetHealthQuery } = healthApi;
