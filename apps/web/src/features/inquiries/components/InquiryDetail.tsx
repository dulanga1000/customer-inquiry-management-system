"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusActions } from "@/features/inquiries/components/StatusActions";
import { StatusHistory } from "@/features/inquiries/components/StatusHistory";
import { useInquiry } from "@/features/inquiries/hooks/useInquiry";
import { ApiError } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/formatters";

export function InquiryDetail({ inquiryId }: { inquiryId: number }) {
  if (!Number.isInteger(inquiryId) || inquiryId <= 0) {
    notFound();
  }

  const { data: inquiry, isLoading, isError, error, refetch } = useInquiry(inquiryId);

  if (isLoading) {
    return <LoadingState variant="detail" />;
  }

  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    const apiError = error instanceof ApiError ? error : null;
    return (
      <div className="space-y-4">
        <Link href="/inquiries" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeftIcon className="size-4" />
          Back to inquiries
        </Link>
        <ErrorBanner
          title="Could not load inquiry"
          message={apiError?.message ?? "Unable to fetch inquiry details."}
          requestId={apiError?.requestId}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!inquiry) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inquiries" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeftIcon className="size-4" />
          Back to inquiries
        </Link>
      </div>

      <Card>
        <CardHeader className="gap-3 border-b">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">#{inquiry.id}</span>
                <StatusBadge status={inquiry.status} />
              </div>
              <CardTitle className="text-xl">{inquiry.subject}</CardTitle>
              <CardDescription>
                Created by {inquiry.createdBy.name} ({inquiry.createdBy.email}) on{" "}
                {formatDateTime(inquiry.createdAt)}
              </CardDescription>
            </div>
            <StatusActions inquiry={inquiry} onReload={() => void refetch()} />
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          <div>
            <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Description
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{inquiry.description}</p>
          </div>

          <dl className="grid gap-4 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Customer</dt>
              <dd className="font-medium">{inquiry.customerName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Contact</dt>
              <dd className="font-medium">{inquiry.contact}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Assigned To</dt>
              <dd className="font-medium">{inquiry.assignedTo?.name ?? "Unassigned"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Last Updated</dt>
              <dd className="font-medium">{formatDateTime(inquiry.updatedAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <StatusHistory entries={inquiry.statusHistory} />
    </div>
  );
}
