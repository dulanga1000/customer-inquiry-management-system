"use client";

import * as React from "react";
import {
  SearchIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import type { UserRole } from "@cims/shared";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { LoadingState } from "@/components/common/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { CreateUserDialog } from "@/features/users/components/CreateUserDialog";
import { useUsers } from "@/features/users/hooks/useUsers";
import { ApiError } from "@/lib/apiClient";
import { formatDateTime, formatRelativeTime, formatUserRole, getInitials } from "@/lib/formatters";
import { cn } from "cn";

type RoleFilterValue = "all" | UserRole;

export function TeamManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [roleFilter, setRoleFilter] = React.useState<RoleFilterValue>("all");
  const [searchInput, setSearchInput] = React.useState("");

  const { data: users, isLoading, isError, error, refetch } = useUsers(isAdmin);

  if (!isAdmin) {
    return (
      <EmptyState
        title="Administrator access required"
        description="Only workspace administrators can view and provision team accounts."
        actionLabel="Back to inquiries"
        actionHref="/inquiries"
      />
    );
  }

  const apiError = error instanceof ApiError ? error : null;
  const allUsers = users ?? [];
  const adminCount = allUsers.filter((member) => member.role === "admin").length;
  const staffCount = allUsers.filter((member) => member.role === "staff").length;

  const trimmedQuery = searchInput.trim().toLowerCase();
  const filteredUsers = allUsers.filter((member) => {
    if (roleFilter !== "all" && member.role !== roleFilter) {
      return false;
    }
    if (trimmedQuery.length > 0) {
      return (
        member.name.toLowerCase().includes(trimmedQuery) ||
        member.email.toLowerCase().includes(trimmedQuery)
      );
    }
    return true;
  });

  const hasFilters = roleFilter !== "all" || trimmedQuery.length > 0;
  const clearFilters = () => {
    setRoleFilter("all");
    setSearchInput("");
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-1">
          <p className="font-mono text-[11px] font-medium tracking-wider text-blue-700 uppercase">
            Administration
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Team &amp; Access</h1>
          <p className="text-sm text-zinc-600">
            Manage provisioned staff accounts, review access roles, and onboard new team members.
          </p>
        </div>
        <Button type="button" onClick={() => setDialogOpen(true)}>
          <UserPlusIcon className="size-4" />
          Create Staff Account
        </Button>
      </div>

      {/* Team Summary Metrics */}
      {!isLoading && !isError ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="gap-0 border border-zinc-200 bg-white p-5 ring-0">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-500">Total Members</p>
                <p className="text-2xl font-semibold tracking-tight text-zinc-950 tabular-nums">
                  {allUsers.length}
                </p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-100">
                <UsersIcon className="size-4 text-zinc-700" />
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Provisioned workspace accounts</p>
          </Card>

          <Card className="gap-0 border border-zinc-200 bg-white p-5 ring-0">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-500">Administrators</p>
                <p className="text-2xl font-semibold tracking-tight text-zinc-950 tabular-nums">
                  {adminCount}
                </p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50">
                <ShieldCheckIcon className="size-4 text-blue-700" />
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Full queue &amp; team management</p>
          </Card>

          <Card className="gap-0 border border-zinc-200 bg-white p-5 ring-0">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-500">Support Staff</p>
                <p className="text-2xl font-semibold tracking-tight text-zinc-950 tabular-nums">
                  {staffCount}
                </p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-teal-50">
                <UserCheckIcon className="size-4 text-teal-700" />
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Assigned &amp; created inquiry access</p>
          </Card>
        </div>
      ) : null}

      {/* Role Filter & Search Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Filter team members by role"
          className="flex flex-wrap items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50/80 p-1"
        >
          {(
            [
              { value: "all", label: "All Roles", count: allUsers.length },
              { value: "admin", label: "Admin", count: adminCount },
              { value: "staff", label: "Staff", count: staffCount },
            ] as const
          ).map((option) => {
            const selected = roleFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setRoleFilter(option.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "bg-white text-zinc-950 shadow-xs ring-1 ring-zinc-200"
                    : "text-zinc-600 hover:text-zinc-950",
                )}
              >
                <span>{option.label}</span>
                {!isLoading && !isError ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
                      selected ? "bg-blue-50 text-blue-700" : "bg-zinc-200/70 text-zinc-600",
                    )}
                  >
                    {option.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-1 items-center gap-2 lg:max-w-sm">
          <div className="relative flex-1">
            <Label htmlFor="team-search" className="sr-only">
              Search team members
            </Label>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              id="team-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name or email..."
              className="h-9 bg-white pl-9"
            />
          </div>
          {hasFilters ? (
            <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
              <XIcon className="size-3.5" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {/* Team Table */}
      {isLoading ? (
        <LoadingState variant="table" />
      ) : isError ? (
        <ErrorBanner
          title="Could not load team accounts"
          message={apiError?.message ?? "Unable to fetch team accounts."}
          requestId={apiError?.requestId}
          onRetry={() => void refetch()}
        />
      ) : allUsers.length === 0 ? (
        <EmptyState
          title="No team members found"
          description="Provision the first team account to grant workspace access."
          actionLabel="Create Staff Account"
          onAction={() => setDialogOpen(true)}
        />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          title="No matching team members"
          description="Try adjusting your role filter or search query."
          actionLabel="Clear filters"
          onAction={clearFilters}
        />
      ) : (
        <Card className="overflow-hidden border border-zinc-200 bg-white py-0 ring-0">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-200 bg-zinc-50/70 hover:bg-zinc-50/70">
                  <TableHead className="w-20 text-xs font-medium text-zinc-500">ID</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">Member</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">Email</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">Role</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">Provisioned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((member) => {
                  const isCurrentUser = user?.id === member.id;
                  const memberIsAdmin = member.role === "admin";
                  return (
                    <TableRow key={member.id} className="border-zinc-200 hover:bg-zinc-50/70">
                      <TableCell className="font-mono text-xs text-zinc-500 tabular-nums">
                        #{member.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                              memberIsAdmin
                                ? "bg-blue-50 text-blue-700"
                                : "bg-teal-50 text-teal-700",
                            )}
                          >
                            {getInitials(member.name)}
                          </span>
                          <span className="font-medium text-zinc-950">
                            {member.name}
                            {isCurrentUser ? (
                              <span className="ml-1.5 text-xs font-normal text-zinc-500">
                                (You)
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-zinc-600">{member.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            memberIsAdmin
                              ? "border-blue-600/25 bg-blue-50 text-blue-700"
                              : "border-teal-600/25 bg-teal-50 text-teal-700"
                          }
                        >
                          {formatUserRole(member.role)}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="text-xs text-zinc-500 tabular-nums"
                        title={formatDateTime(member.createdAt)}
                      >
                        {formatRelativeTime(member.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="divide-y divide-zinc-200 md:hidden">
            {filteredUsers.map((member) => {
              const isCurrentUser = user?.id === member.id;
              const memberIsAdmin = member.role === "admin";
              return (
                <div key={member.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        memberIsAdmin ? "bg-blue-50 text-blue-700" : "bg-teal-50 text-teal-700",
                      )}
                    >
                      {getInitials(member.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-950">
                        {member.name}
                        {isCurrentUser ? (
                          <span className="ml-1 text-xs font-normal text-zinc-500">(You)</span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-zinc-500">{member.email}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      memberIsAdmin
                        ? "shrink-0 border-blue-600/25 bg-blue-50 text-blue-700"
                        : "shrink-0 border-teal-600/25 bg-teal-50 text-teal-700"
                    }
                  >
                    {formatUserRole(member.role)}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <CreateUserDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
