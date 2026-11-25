"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from "lucide-react";
import { INQUIRY_STATUSES, type InquiryStatus } from "@cims/shared";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AssigneeSelect } from "@/features/inquiries/components/AssigneeSelect";
import { StatusActions } from "@/features/inquiries/components/StatusActions";
import { StatusHistory } from "@/features/inquiries/components/StatusHistory";
import { useInquiry } from "@/features/inquiries/hooks/useInquiry";
import { ApiError } from "@/lib/apiClient";
import {
  formatDateTime,
  formatInquiryStatus,
  formatRelativeTime,
  getInitials,
} from "@/lib/formatters";
import { cn } from "cn";

function WorkflowStepper({ currentStatus }: { currentStatus: InquiryStatus }) {
  const currentIndex = INQUIRY_STATUSES.indexOf(currentStatus);

  return (
    <ol className="space-y-2.5">
      {INQUIRY_STATUSES.map((step, index) => {
        const isCurrent = step === currentStatus;
        const isCompleted = index < currentIndex || (currentStatus === "resolved" && index === 2);

        return (
          <li key={step} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border text-[11px] font-semibold",
                  isCurrent
                    ? step === "resolved"
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-blue-700 bg-blue-700 text-white"
                    : isCompleted
                      ? "border-teal-600/30 bg-teal-50 text-teal-700"
                      : "border-zinc-200 bg-zinc-50 text-zinc-400",
                )}
              >
                {isCompleted ? <CheckIcon className="size-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-sm",
                  isCurrent ? "font-medium text-zinc-950" : "text-zinc-500",
                )}
              >
                {formatInquiryStatus(step)}
              </span>
            </div>
            {isCurrent ? (
              <span className="font-mono text-[11px] font-medium text-blue-700">Current</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function InquiryDetail({ inquiryId }: { inquiryId: number }) {
  const { user } = useAuth();
  const { data: inquiry, isLoading, isError, error, refetch } = useInquiry(inquiryId);

  if (!Number.isInteger(inquiryId) || inquiryId <= 0) {
    notFound();
  }

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

  const assignedRecord = inquiry.assignedUser ?? inquiry.assignedTo;
  const isEmailContact = inquiry.contact.includes("@");

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link
          href="/inquiries"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950",
          )}
        >
          <ArrowLeftIcon className="size-3.5" />
          Inquiries
        </Link>
        <span aria-hidden="true" className="text-zinc-300">
          /
        </span>
        <span className="font-mono text-xs font-medium text-zinc-700 tabular-nums">
          Case #{inquiry.id}
        </span>
      </div>

      {/* Two-Column Case Workspace */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Main Case Brief & Timeline */}
        <div className="space-y-6 lg:col-span-8">
          <Card className="border border-zinc-200 bg-white ring-0">
            <CardHeader className="gap-4 border-b border-zinc-200">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-xs font-medium text-zinc-600 tabular-nums">
                      #{inquiry.id}
                    </span>
                    <StatusBadge status={inquiry.status} />
                    <span className="text-xs text-zinc-400 tabular-nums">
                      Updated {formatRelativeTime(inquiry.updatedAt)}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">
                    {inquiry.subject}
                  </CardTitle>
                  <CardDescription className="text-zinc-600 tabular-nums">
                    Logged by{" "}
                    <strong className="font-medium text-zinc-900">{inquiry.createdBy.name}</strong>{" "}
                    ({inquiry.createdBy.email}) on {formatDateTime(inquiry.createdAt)}
                  </CardDescription>
                </div>

                <div className="shrink-0">
                  <StatusActions inquiry={inquiry} onReload={() => void refetch()} />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-5">
              <div className="space-y-2">
                <h2 className="font-mono text-[11px] font-medium tracking-wider text-zinc-500 uppercase">
                  Customer Request Details
                </h2>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-900">
                    {inquiry.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <StatusHistory entries={inquiry.statusHistory} />
        </div>

        {/* Right Case Properties & Ownership Sidebar */}
        <aside className="space-y-6 lg:col-span-4">
          <Card className="border border-zinc-200 bg-white ring-0">
            <CardHeader className="border-b border-zinc-100 pb-4">
              <CardTitle className="text-sm font-semibold text-zinc-950">Workflow Stage</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <WorkflowStepper currentStatus={inquiry.status} />
            </CardContent>
          </Card>

          <Card className="border border-zinc-200 bg-white ring-0">
            <CardHeader className="border-b border-zinc-100 pb-4">
              <CardTitle className="text-sm font-semibold text-zinc-950">Case Properties</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-zinc-100 pt-2">
              {/* Assignee */}
              <div className="space-y-2 py-3.5">
                <p className="text-xs font-medium text-zinc-500">Assigned To</p>
                {user?.role === "admin" ? (
                  <AssigneeSelect inquiry={inquiry} onReload={() => void refetch()} />
                ) : assignedRecord ? (
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700"
                    >
                      {getInitials(assignedRecord.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-950">
                        {assignedRecord.name}
                      </p>
                      <p className="truncate text-xs text-zinc-500">{assignedRecord.email}</p>
                    </div>
                  </div>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-amber-600/25 bg-amber-50/70 font-normal text-amber-800"
                  >
                    Unassigned
                  </Badge>
                )}
              </div>

              {/* Customer */}
              <div className="space-y-2.5 py-3.5">
                <p className="text-xs font-medium text-zinc-500">Customer</p>
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
                    <p className="flex items-center gap-1.5 truncate text-xs text-zinc-500">
                      {isEmailContact ? (
                        <MailIcon className="size-3 shrink-0 text-zinc-400" />
                      ) : (
                        <PhoneIcon className="size-3 shrink-0 text-zinc-400" />
                      )}
                      <span className="truncate">{inquiry.contact}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Audit Metadata */}
              <dl className="space-y-3 py-3.5 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-zinc-500">
                    <UserIcon className="size-3.5 text-zinc-400" />
                    Logged by
                  </dt>
                  <dd className="text-right font-medium text-zinc-900">
                    {inquiry.createdBy.name}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-zinc-500">
                    <CalendarIcon className="size-3.5 text-zinc-400" />
                    Created
                  </dt>
                  <dd className="text-right text-zinc-700 tabular-nums">
                    {formatDateTime(inquiry.createdAt)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-zinc-500">
                    <CalendarIcon className="size-3.5 text-zinc-400" />
                    Last updated
                  </dt>
                  <dd className="text-right text-zinc-700 tabular-nums">
                    {formatDateTime(inquiry.updatedAt)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
