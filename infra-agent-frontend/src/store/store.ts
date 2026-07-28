import { configureStore } from "@reduxjs/toolkit";
import { authApi } from "@/features/auth/authApi";
import authReducer from "@/features/auth/authSlice";
import notificationsReducer from "@/features/notifications/notificationsSlice";
import { healthApi } from "@/features/health/healthApi";
import healthReducer from "@/features/health/healthSlice";
import { uptimeApi } from "@/features/health/uptimeApi";
import { teamsApi } from "@/features/teams/teamsApi";
import { workflowsApi } from "@/features/workflows/workflowsApi";
import { infrastructureApi } from "@/features/infrastructure/infrastructureApi";
import { digitalTwinApi } from "@/features/digitalTwin/digitalTwinApi";
import { sandboxApi } from "@/features/sandbox/sandboxApi";
import { reportsApi } from "@/features/reports/reportsApi";
import { kyaiApi } from "@/features/kyai/kyaiApi";
import { deviceMetricsApi } from "@/features/metrics/deviceMetricsApi";
import { prometheusApi } from "@/features/metrics/prometheusApi";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notifications: notificationsReducer,
    health: healthReducer,
    [authApi.reducerPath]: authApi.reducer,
    [healthApi.reducerPath]: healthApi.reducer,
    [uptimeApi.reducerPath]: uptimeApi.reducer,
    [teamsApi.reducerPath]: teamsApi.reducer,
    [workflowsApi.reducerPath]: workflowsApi.reducer,
    [infrastructureApi.reducerPath]: infrastructureApi.reducer,
    [digitalTwinApi.reducerPath]: digitalTwinApi.reducer,
    [sandboxApi.reducerPath]: sandboxApi.reducer,
    [reportsApi.reducerPath]: reportsApi.reducer,
    [kyaiApi.reducerPath]: kyaiApi.reducer,
    [deviceMetricsApi.reducerPath]: deviceMetricsApi.reducer,
    [prometheusApi.reducerPath]: prometheusApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      healthApi.middleware,
      uptimeApi.middleware,
      teamsApi.middleware,
      workflowsApi.middleware,
      infrastructureApi.middleware,
      digitalTwinApi.middleware,
      sandboxApi.middleware,
      reportsApi.middleware,
      kyaiApi.middleware,
      deviceMetricsApi.middleware,
      prometheusApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
