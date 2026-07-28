import { createSlice } from "@reduxjs/toolkit";
import { authApi } from "@/features/auth/authApi";
import { normalizeRole } from "@/features/auth/authSelectors";
import type { AuthUser } from "@/schemas/session.schema";
import type { Organization } from "@/schemas/organization.schema";

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  organization: Organization | null;
  userRole: string;
  isOrgResolved: boolean;
}

const initialState: AuthState = {
  isLoading: true,
  isAuthenticated: false,
  user: null,
  organization: null,
  userRole: "viewer",
  isOrgResolved: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(authApi.endpoints.getSession.matchPending, (state) => {
        state.isLoading = true;
      })
      .addMatcher(authApi.endpoints.getSession.matchFulfilled, (state, action) => {
        state.isLoading = false;
        state.isOrgResolved = true;
        state.isAuthenticated = action.payload.authenticated;
        state.user = action.payload.authenticated ? (action.payload.user ?? null) : null;
        state.organization = action.payload.authenticated
          ? (action.payload.organization ?? null)
          : null;
        state.userRole = action.payload.authenticated
          ? normalizeRole(action.payload.role ?? "viewer")
          : "viewer";
      })
      .addMatcher(authApi.endpoints.getSession.matchRejected, (state) => {
        state.isLoading = false;
        state.isOrgResolved = true;
        state.isAuthenticated = false;
        state.user = null;
        state.organization = null;
      });
  },
});

export default authSlice.reducer;
