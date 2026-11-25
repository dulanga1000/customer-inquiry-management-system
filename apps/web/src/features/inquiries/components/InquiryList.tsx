"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
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
import {
  InquiryFilters,
  type StatusFilterValue,
} from "@/features/inquiries/components/InquiryFilters";
import { useInquiries } from "@/features/inquiries/hooks/useInquiries";
import { ApiError } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/formatters";

const PAGE_LIMIT = 20;

export function InquiryList() {
  const [status, setStatus] = React.useState<StatusFilterValue>("all");
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
    setStatus(nextStatus);
    setPage(1);
  };

  const handleClearFilters = () => {
    setStatus("all");
    setSearchInput("");
    setDebouncedQuery("");
    setPage(1);
  };

  const queryParams = {
    ...(status !== "all" ? { status } : {}),
    ...(debouncedQuery.length > 0 ? { q: debouncedQuery } : {}),
    page,
    limit: PAGE_LIMIT,
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useInquiries(queryParams);

  const hasActiveFilters = status !== "all" || debouncedQuery.length > 0;
  const apiError = error instanceof ApiError ? error : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customer Inquiries</h1>
          <p className="text-sm text-muted-foreground">
            Track incoming requests and move them cleanly through their lifecycle.
          </p>
        </div>
        <Link href="/inquiries/new" className={buttonVariants()}>
          <PlusIcon className="size-4" />
          New Inquiry
        </Link>
      </div>

      <InquiryFilters
        status={status}
        search={searchInput}
        onStatusChange={handleStatusChange}
        onSearchChange={setSearchInput}
        onClear={handleClearFilters}
      />

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
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((inquiry) => (
                <TableRow key={inquiry.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #{inquiry.id}
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-medium">
                    <Link
                      href={`/inquiries/${inquiry.id}`}
                      className="hover:underline focus-visible:underline focus-visible:outline-none"
                    >
                      {inquiry.subject}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{inquiry.customerName}</span>
                      <span className="text-xs text-muted-foreground">{inquiry.contact}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={inquiry.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {inquiry.assignedTo?.name ?? inquiry.createdBy.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(inquiry.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>
              Showing page <strong className="text-foreground">{data.meta.page}</strong> of{" "}
              <strong className="text-foreground">{Math.max(1, data.meta.totalPages)}</strong> (
              {data.meta.total} total)
              {isFetching ? " · Refreshing..." : ""}
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
