import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "./apiClient";

export function makeQueryClient(onUnauthorized?: () => void): QueryClient {
  const handleGlobalError = (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        client.clear();
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          onUnauthorized?.();
        }
        return;
      }

      if (error.status === 0 || error.status >= 500) {
        const ref = error.requestId ? ` (Ref: ${error.requestId})` : "";
        toast.error(`${error.message}${ref}`);
      }
      return;
    }

    toast.error("An unexpected error occurred");
  };

  const client = new QueryClient({
    queryCache: new QueryCache({
      onError: handleGlobalError,
    }),
    mutationCache: new MutationCache({
      onError: handleGlobalError,
    }),
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: true,
        staleTime: 10_000,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });

  return client;
}
