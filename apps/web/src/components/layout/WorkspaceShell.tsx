"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { InboxIcon, LogOutIcon, PlusIcon } from "lucide-react";
import { LoadingState } from "@/components/common/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatUserRole } from "@/lib/formatters";
import { cn } from "cn";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout, isLoggingOut } = useAuth();

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <LoadingState variant="page" />;
  }

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/inquiries"
              className="flex items-center gap-2 text-sm font-semibold tracking-tight"
            >
              <InboxIcon className="size-4" />
              <span>CIMS</span>
            </Link>

            <nav aria-label="Primary" className="flex items-center gap-1">
              <Link
                href="/inquiries"
                className={cn(
                  buttonVariants({ variant: pathname === "/inquiries" ? "secondary" : "ghost", size: "sm" }),
                )}
              >
                Inquiries
              </Link>
              <Link
                href="/inquiries/new"
                className={cn(
                  buttonVariants({
                    variant: pathname === "/inquiries/new" ? "secondary" : "ghost",
                    size: "sm",
                  }),
                )}
              >
                <PlusIcon className="size-3.5" />
                New Inquiry
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-sm font-medium">{user.name}</span>
              <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                {formatUserRole(user.role)}
              </Badge>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOutIcon className="size-3.5" />
              <span>{isLoggingOut ? "Signing out..." : "Sign out"}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
