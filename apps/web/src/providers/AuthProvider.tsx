"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthUser, LoginInput } from "@cims/shared";
import { getMe, loginRequest, logoutRequest } from "@/features/auth/api";
import { ApiError } from "@/lib/apiClient";

export const AUTH_ME_QUERY_KEY = ["auth", "me"] as const;

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  isLoggingOut: boolean;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery<AuthUser | null>({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: async () => {
      try {
        return await getMe();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, null);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "auth",
      });
    },
  });

  const value: AuthContextValue = {
    user: meQuery.data ?? null,
    isLoading: meQuery.isLoading,
    isAuthenticated: Boolean(meQuery.data),
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
