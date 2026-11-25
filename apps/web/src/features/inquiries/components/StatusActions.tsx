"use client";

import * as React from "react";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  Loader2Icon,
  RefreshCwIcon,
  RotateCcwIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { InquiryDetail, InquiryStatus } from "@cims/shared";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useUpdateStatus } from "@/features/inquiries/hooks/useUpdateStatus";
import { ApiError } from "@/lib/apiClient";
import { formatInquiryStatus } from "@/lib/formatters";
import { cn } from "cn";

interface StatusActionsProps {
  inquiry: InquiryDetail;
  onReload: () => void;
}

function getActionMeta(fromStatus: InquiryStatus, toStatus: InquiryStatus) {
  if (fromStatus === "resolved" && toStatus === "in_progress") {
    return {
      label: "Reopen Inquiry",
      icon: RotateCcwIcon,
      variant: "outline" as const,
      className: "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 hover:text-zinc-950",
    };
  }
  if (toStatus === "in_progress") {
    return {
      label: "Move to In Progress",
      icon: ArrowRightIcon,
      variant: "default" as const,
      className: "",
    };
  }
  if (toStatus === "resolved") {
    return {
      label: "Mark Resolved",
      icon: CheckCircle2Icon,
      variant: "default" as const,
      className: "bg-teal-600 text-white hover:bg-teal-700",
    };
  }
  return {
    label: `Move to ${formatInquiryStatus(toStatus)}`,
    icon: ArrowRightIcon,
    variant: "outline" as const,
    className: "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
  };
}

export function StatusActions({ inquiry, onReload }: StatusActionsProps) {
  const updateMutation = useUpdateStatus(inquiry.id);
  const [conflictState, setConflictState] = React.useState<{
    code: "STALE_DATA" | "INVALID_TRANSITION" | "OTHER";
    message: string;
    forUpdatedAt: string;
  } | null>(null);

  const activeConflict =
    conflictState && conflictState.forUpdatedAt === inquiry.updatedAt ? conflictState : null;

  const allowedTransitions = Array.isArray(inquiry.allowedTransitions)
    ? inquiry.allowedTransitions
    : [];

  const handleTransition = async (targetStatus: InquiryStatus) => {
    setConflictState(null);
    try {
      await updateMutation.mutateAsync({
        status: targetStatus,
        updatedAt: inquiry.updatedAt,
      });
      toast.success(`Status updated to ${formatInquiryStatus(targetStatus)}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "STALE_DATA") {
          setConflictState({
            code: "STALE_DATA",
            message: "This inquiry was changed elsewhere. Reload to see the latest.",
            forUpdatedAt: inquiry.updatedAt,
          });
          return;
        }
        if (error.code === "INVALID_TRANSITION") {
          setConflictState({
            code: "INVALID_TRANSITION",
            message: error.message,
            forUpdatedAt: inquiry.updatedAt,
          });
          onReload();
          return;
        }
        setConflictState({
          code: "OTHER",
          message: error.message,
          forUpdatedAt: inquiry.updatedAt,
        });
        return;
      }
      setConflictState({
        code: "OTHER",
        message: "Unable to update status.",
        forUpdatedAt: inquiry.updatedAt,
      });
    }
  };

  return (
    <div className="flex flex-col items-start gap-3 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        {allowedTransitions.length > 0 ? (
          allowedTransitions.map((targetStatus) => {
            const meta = getActionMeta(inquiry.status, targetStatus);
            const Icon = meta.icon;
            const isUpdatingThis =
              updateMutation.isPending && updateMutation.variables?.status === targetStatus;

            return (
              <Button
                key={targetStatus}
                type="button"
                variant={meta.variant}
                size="default"
                className={cn("h-9 px-3.5", meta.className)}
                disabled={updateMutation.isPending}
                onClick={() => void handleTransition(targetStatus)}
              >
                {isUpdatingThis ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <Icon className="size-4" />
                )}
                <span>{meta.label}</span>
              </Button>
            );
          })
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            onClick={onReload}
          >
            <RefreshCwIcon className="size-3.5" />
            Reload status actions
          </Button>
        )}
      </div>

      {activeConflict ? (
        <Alert variant="destructive" className="w-full max-w-md text-left">
          <AlertCircleIcon />
          <AlertTitle>
            {activeConflict.code === "STALE_DATA"
              ? "Outdated inquiry version"
              : "Status update blocked"}
          </AlertTitle>
          <AlertDescription>{activeConflict.message}</AlertDescription>
          {activeConflict.code === "STALE_DATA" ? (
            <AlertAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setConflictState(null);
                  onReload();
                }}
              >
                <RefreshCwIcon className="size-3.5" />
                Reload
              </Button>
            </AlertAction>
          ) : null}
        </Alert>
      ) : null}
    </div>
  );
}
