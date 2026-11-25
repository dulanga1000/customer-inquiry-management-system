"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  InboxIcon,
  LogOutIcon,
  MenuIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusCircleIcon,
  ShieldIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LoadingState } from "@/components/common/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useInquiryCounts } from "@/features/inquiries/hooks/useInquiryCounts";
import { useUsers } from "@/features/users/hooks/useUsers";
import { formatUserRole, getInitials } from "@/lib/formatters";
import { cn } from "cn";

const SIDEBAR_STORAGE_KEY = "cims.sidebar.collapsed";
const SIDEBAR_EVENT = "cims-sidebar-collapsed-change";

function subscribeSidebarPreference(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => callback();
  window.addEventListener(SIDEBAR_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SIDEBAR_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function getSidebarCollapsedSnapshot(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function setSidebarCollapsedPreference(next: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
  window.dispatchEvent(new Event(SIDEBAR_EVENT));
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number | null;
  isActive: boolean;
}

function getSectionLabel(pathname: string, role: "staff" | "admin"): string {
  if (pathname === "/inquiries/new") {
    return "New Inquiry";
  }
  if (pathname.startsWith("/inquiries/")) {
    return "Case Details";
  }
  if (pathname === "/team") {
    return "Team & Access";
  }
  return role === "admin" ? "Operations Dashboard" : "My Inquiry Desk";
}

function SidebarNavSection({
  title,
  items,
  collapsed,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      {!collapsed ? (
        <p className="px-2.5 font-mono text-[11px] font-medium tracking-wider text-zinc-400 uppercase">
          {title}
        </p>
      ) : null}
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              aria-current={item.isActive ? "page" : undefined}
              className={cn(
                "flex items-center rounded-lg text-sm transition-colors",
                collapsed
                  ? "mx-auto size-10 justify-center"
                  : "justify-between gap-2.5 px-2.5 py-2",
                item.isActive
                  ? "bg-blue-50 font-medium text-blue-700"
                  : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-950",
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    item.isActive ? "text-blue-700" : "text-zinc-500",
                  )}
                />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </span>
              {!collapsed && item.count !== undefined && item.count !== null ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums",
                    item.isActive ? "bg-blue-100/80 text-blue-700" : "bg-zinc-100 text-zinc-600",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout, isLoggingOut } = useAuth();
  const [openForPathname, setOpenForPathname] = React.useState<string | null>(null);
  const collapsed = React.useSyncExternalStore(
    subscribeSidebarPreference,
    getSidebarCollapsedSnapshot,
    () => false,
  );

  const mobileMenuOpen = openForPathname === pathname;
  const isSignedIn = Boolean(user);
  const isAdmin = user?.role === "admin";
  const counts = useInquiryCounts(isSignedIn);
  const { data: teamUsers } = useUsers(isSignedIn && isAdmin);

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

  const toggleCollapsed = () => {
    setSidebarCollapsedPreference(!collapsed);
  };

  const sectionLabel = getSectionLabel(pathname, user.role);

  const workspaceItems: NavItem[] = [
    {
      href: "/inquiries",
      label: "Inquiries",
      icon: InboxIcon,
      count: counts.total,
      isActive:
        pathname === "/inquiries" ||
        (pathname.startsWith("/inquiries/") && pathname !== "/inquiries/new"),
    },
    {
      href: "/inquiries/new",
      label: "New Inquiry",
      icon: PlusCircleIcon,
      isActive: pathname === "/inquiries/new",
    },
  ];

  const adminItems: NavItem[] = [
    {
      href: "/team",
      label: "Team",
      icon: UsersIcon,
      count: teamUsers ? teamUsers.length : null,
      isActive: pathname === "/team",
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Collapsible Desktop Sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col justify-between border-r border-zinc-200 bg-white transition-[width] duration-200 ease-in-out lg:flex",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        <div>
          <div
            className={cn(
              "flex h-16 items-center border-b border-zinc-200",
              collapsed ? "justify-center px-2" : "justify-between px-4",
            )}
          >
            <BrandLogo
              size={28}
              href="/inquiries"
              showLabel={!collapsed}
              labelClassName="text-lg"
            />

            {!collapsed ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={toggleCollapsed}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="text-zinc-500 hover:text-zinc-950"
              >
                <PanelLeftCloseIcon className="size-4" />
              </Button>
            ) : null}
          </div>

          <nav aria-label="Primary" className={cn("space-y-5", collapsed ? "p-2.5" : "p-3.5")}>
            <SidebarNavSection
              title="Workspace"
              items={workspaceItems}
              collapsed={collapsed}
            />

            {isAdmin ? (
              <SidebarNavSection
                title="Administration"
                items={adminItems}
                collapsed={collapsed}
              />
            ) : null}
          </nav>
        </div>

        <div className={cn("border-t border-zinc-200", collapsed ? "p-2.5" : "p-3.5")}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                title={`${user.name} (${formatUserRole(user.role)})`}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full text-xs font-semibold",
                  isAdmin ? "bg-blue-700 text-white" : "bg-teal-700 text-white",
                )}
              >
                {getInitials(user.name)}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-9 border-zinc-200 bg-white text-zinc-700 transition-colors hover:border-red-500/70 hover:bg-red-50 hover:text-red-700"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label={isLoggingOut ? "Signing out" : "Sign out"}
                title={isLoggingOut ? "Signing out..." : "Sign out"}
              >
                <LogOutIcon className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5">
                <div
                  aria-hidden="true"
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    isAdmin ? "bg-blue-700 text-white" : "bg-teal-700 text-white",
                  )}
                >
                  {getInitials(user.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <p className="truncate text-sm font-medium text-zinc-950">{user.name}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 px-1.5 py-0 text-[10px]",
                        isAdmin
                          ? "border-blue-600/25 bg-blue-50 text-blue-700"
                          : "border-teal-600/25 bg-teal-50 text-teal-700",
                      )}
                    >
                      {formatUserRole(user.role)}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-zinc-500">{user.email}</p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-center border-zinc-200 bg-white text-zinc-700 transition-colors hover:border-red-500/70 hover:bg-red-50 hover:text-red-700"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOutIcon className="size-3.5" />
                <span>{isLoggingOut ? "Signing out..." : "Sign out"}</span>
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="border-zinc-200 lg:hidden"
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileMenuOpen}
                onClick={() =>
                  setOpenForPathname((prev) => (prev === pathname ? null : pathname))
                }
              >
                {mobileMenuOpen ? <XIcon className="size-4" /> : <MenuIcon className="size-4" />}
              </Button>

              {/* Desktop Sidebar Expand Button when Collapsed */}
              {collapsed ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="hidden border-zinc-200 text-zinc-600 hover:text-zinc-950 lg:inline-flex"
                  onClick={toggleCollapsed}
                  aria-label="Expand sidebar"
                  title="Expand sidebar"
                >
                  <PanelLeftOpenIcon className="size-4" />
                </Button>
              ) : null}

              <BrandLogo
                size={28}
                href="/inquiries"
                className="lg:hidden"
                labelClassName="text-lg"
              />

              <div className="hidden items-center gap-2.5 lg:flex">
                <span className="text-sm font-semibold text-zinc-950">{sectionLabel}</span>
                <span className="text-zinc-300" aria-hidden="true">
                  /
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                  {isAdmin ? <ShieldIcon className="size-3.5 text-blue-600" /> : null}
                  {isAdmin ? "Admin" : "Staff"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 lg:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-zinc-200 bg-white text-zinc-700 transition-colors hover:border-red-500/70 hover:bg-red-50 hover:text-red-700"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOutIcon className="size-3.5" />
                <span className="sr-only sm:not-sr-only">
                  {isLoggingOut ? "Signing out..." : "Sign out"}
                </span>
              </Button>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen ? (
            <div className="border-t border-zinc-200 bg-white lg:hidden">
              <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6">
                <SidebarNavSection
                  title="Workspace"
                  items={workspaceItems}
                  collapsed={false}
                  onNavigate={() => setOpenForPathname(null)}
                />
                {isAdmin ? (
                  <SidebarNavSection
                    title="Administration"
                    items={adminItems}
                    collapsed={false}
                    onNavigate={() => setOpenForPathname(null)}
                  />
                ) : null}
                <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      aria-hidden="true"
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full text-xs font-semibold",
                        isAdmin ? "bg-blue-700 text-white" : "bg-teal-700 text-white",
                      )}
                    >
                      {getInitials(user.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-950">{user.name}</p>
                      <p className="text-xs text-zinc-500">{user.email}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      isAdmin
                        ? "border-blue-600/25 bg-blue-50 text-blue-700"
                        : "border-teal-600/25 bg-teal-50 text-teal-700"
                    }
                  >
                    {formatUserRole(user.role)}
                  </Badge>
                </div>
              </div>
            </div>
          ) : null}
        </header>

        <main className="w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
