"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import type { InquirySummary } from "@cims/shared";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  InquiryFilters,
  type StatusFilterValue,
} from "@/features/inquiries/components/InquiryFilters";
import { InquiryStatsCards } from "@/features/inquiries/components/InquiryStatsCards";
import { useInquiries } from "@/features/inquiries/hooks/useInquiries";
import { useInquiryCounts } from "@/features/inquiries/hooks/useInquiryCounts";
import { useUsers } from "@/features/users/hooks/useUsers";
import { ApiError } from "@/lib/apiClient";
import { formatDateTime, formatRelativeTime, getInitials } from "@/lib/formatters";
import { cn } from "cn";

const PAGE_LIMIT = 20;

function parseStatusParam(raw: string | null): StatusFilterValue {
  if (raw === "new" || raw === "in_progress" || raw === "resolved") {
    return raw;
  }
  return "all";
}

function OwnerCell({
  inquiry,
  currentUserId,
  isAdmin,
}: {
  inquiry: InquirySummary;
  currentUserId: number | undefined;
  isAdmin: boolean;
}) {
  const assignee = inquiry.assignedUser ?? inquiry.assignedTo;

  if (!assignee) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="border-amber-600/25 bg-amber-50/70 font-normal text-amber-800"
        >
          Unassigned
        </Badge>
        {!isAdmin && currentUserId === inquiry.createdBy.id ? (
          <span className="text-xs text-zinc-400">Created by you</span>
        ) : null}
      </div>
    );
  }

  const isAssignedToMe = currentUserId !== undefined && assignee.id === currentUserId;

  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
          isAssignedToMe ? "bg-blue-50 text-blue-700" : "bg-zinc-100 text-zinc-700",
        )}
      >
        {getInitials(assignee.name)}
      </span>
      <span className="truncate text-sm text-zinc-700">
        {assignee.name}
        {isAssignedToMe ? (
          <span className="ml-1.5 text-xs font-medium text-blue-700">(You)</span>
        ) : null}
      </span>
    </div>
  );
}

export function InquiryList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const status = parseStatusParam(searchParams.get("status"));
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const handleStatusChange = (nextStatus: StatusFilterValue) => {
    setPage(1);
    const nextHref = nextStatus === "all" ? "/inquiries" : `/inquiries?status=${nextStatus}`;
    router.replace(nextHref, { scroll: false });
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setDebouncedQuery("");
    setPage(1);
    router.replace("/inquiries", { scroll: false });
  };

  const queryParams = {
    ...(status !== "all" ? { status } : {}),
    ...(debouncedQuery.length > 0 ? { q: debouncedQuery } : {}),
    page,
    limit: PAGE_LIMIT,
  };

  const counts = useInquiryCounts(Boolean(user));
  const { data: teamUsers } = useUsers(isAdmin);
  const { data, isLoading, isError, error, refetch, isFetching } = useInquiries(queryParams);

  const hasActiveFilters = status !== "all" || debouncedQuery.length > 0;
  const apiError = error instanceof ApiError ? error : null;

  return (
    <div className="space-y-6">
      {/* Role-aware Dashboard Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-mono text-[11px] font-medium tracking-wider text-teal-700 uppercase">
              {isAdmin ? "Workspace Overview" : "Agent Workspace"}
            </p>
            {isFetching && !isLoading ? (
              <span className="text-xs text-zinc-400">Syncing...</span>
            ) : null}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            {isAdmin ? "Operations Dashboard" : "My Inquiry Desk"}
          </h1>
          <p className="text-sm text-zinc-600">
            {isAdmin
              ? `Welcome back${user?.name ? `, ${user.name}` : ""}. Monitor all incoming inquiries, assign team owners, and track resolution progress.`
              : `Welcome back${user?.name ? `, ${user.name}` : ""}. Review inquiries assigned to you or submitted by you and keep resolution moving.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin ? (
            <Link
              href="/team"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950",
              )}
            >
              <UsersIcon className="size-4" />
              <span>Team{teamUsers ? ` (${teamUsers.length})` : ""}</span>
            </Link>
          ) : null}
          <Link href="/inquiries/new" className={buttonVariants()}>
            <PlusIcon className="size-4" />
            New Inquiry
          </Link>
        </div>
      </div>

      {/* Interactive Status KPI Cards */}
      <InquiryStatsCards
        counts={counts}
        activeStatus={status}
        isAdmin={isAdmin}
        onSelectStatus={handleStatusChange}
      />

      {/* Segmented Status Tabs & Search Bar */}
      <InquiryFilters
        status={status}
        search={searchInput}
        counts={counts}
        onStatusChange={handleStatusChange}
        onSearchChange={setSearchInput}
        onClear={handleClearFilters}
      />

      {/* Queue Data Area */}
      {isLoading ? (
        <LoadingState variant="table" />
      ) : isError ? (
        <ErrorBanner
          title="Could not load inquiries"
          message={apiError?.message ?? "An unexpected error occurred while loading inquiries."}
          requestId={apiError?.requestId}
          onRetry={() => void refetch()}
        />
      ) : !data || data.data.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            title="No matching inquiries"
            description="Try adjusting your status filter or search query."
            actionLabel="Clear filters"
            onAction={handleClearFilters}
          />
        ) : (
          <EmptyState
            title="No inquiries yet"
            description="Create your first customer inquiry to start tracking it."
            actionLabel="Create Inquiry"
            actionHref="/inquiries/new"
          />
        )
      ) : (
        <Card className="overflow-hidden border border-zinc-200 bg-white py-0 ring-0">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-200 bg-zinc-50/70 hover:bg-zinc-50/70">
                  <TableHead className="w-20 text-xs font-medium text-zinc-500">Case</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">Subject</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">Customer</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">Status</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">Assignee</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">Updated</TableHead>
                  <TableHead className="w-16 text-right text-xs font-medium text-zinc-500">
                    <span className="sr-only">Open</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((inquiry) => (
                  <TableRow key={inquiry.id} className="group border-zinc-200 hover:bg-zinc-50/80">
                    <TableCell className="font-mono text-xs text-zinc-500 tabular-nums">
                      #{inquiry.id}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <Link
                        href={`/inquiries/${inquiry.id}`}
                        className="block truncate font-medium text-zinc-950 hover:text-blue-700 hover:underline focus-visible:underline focus-visible:outline-none"
                      >
                        {inquiry.subject}
                      </Link>
                      {!isAdmin && inquiry.createdBy.id === user?.id ? (
                        <span className="text-[11px] text-zinc-400">Logged by you</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="flex size-7 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-[11px] font-medium text-zinc-700"
                        >
                          {getInitials(inquiry.customerName)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-950">
                            {inquiry.customerName}
                          </p>
                          <p className="truncate text-xs text-zinc-500">{inquiry.contact}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={inquiry.status} />
                    </TableCell>
                    <TableCell>
                      <OwnerCell inquiry={inquiry} currentUserId={user?.id} isAdmin={isAdmin} />
                    </TableCell>
                    <TableCell
                      className="text-xs text-zinc-500 tabular-nums"
                      title={formatDateTime(inquiry.updatedAt)}
                    >
                      {formatRelativeTime(inquiry.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/inquiries/${inquiry.id}`}
                        aria-label={`Open inquiry #${inquiry.id}`}
                        className="inline-flex size-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                      >
                        <ArrowUpRightIcon className="size-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List */}
          <div className="divide-y divide-zinc-200 md:hidden">
            {data.data.map((inquiry) => (
              <Link
                key={inquiry.id}
                href={`/inquiries/${inquiry.id}`}
                className="block space-y-2.5 p-4 transition-colors hover:bg-zinc-50/70"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-zinc-500 tabular-nums">
                    #{inquiry.id}
                  </span>
                  <StatusBadge status={inquiry.status} />
                </div>
                <div>
                  <p className="font-medium text-zinc-950">{inquiry.subject}</p>
                  <p className="text-xs text-zinc-500">
                    {inquiry.customerName} · {inquiry.contact}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 text-xs text-zinc-500">
                  <OwnerCell inquiry={inquiry} currentUserId={user?.id} isAdmin={isAdmin} />
                  <span className="tabular-nums">{formatRelativeTime(inquiry.updatedAt)}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-600 tabular-nums sm:flex-row sm:items-center sm:justify-between">
            <span>
              Page <strong className="text-zinc-950">{data.meta.page}</strong> of{" "}
              <strong className="text-zinc-950">{Math.max(1, data.meta.totalPages)}</strong> ·{" "}
              {data.meta.total} {data.meta.total === 1 ? "inquiry" : "inquiries"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={data.meta.page <= 1}
              >
                <ChevronLeftIcon className="size-4" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={data.meta.page >= data.meta.totalPages}
              >
                Next
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
