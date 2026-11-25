"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { makeQueryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/providers/AuthProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [queryClient] = React.useState(() =>
    makeQueryClient(() => {
      router.replace("/login");
    }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
