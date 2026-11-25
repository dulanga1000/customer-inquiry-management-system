"use client";

import * as React from "react";
import { AlertCircleIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import type { InquiryDetail, InquiryStatus } from "@cims/shared";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useUpdateStatus } from "@/features/inquiries/hooks/useUpdateStatus";
import { ApiError } from "@/lib/apiClient";
import { formatInquiryStatus } from "@/lib/formatters";

interface StatusActionsProps {
  inquiry: InquiryDetail;
  onReload: () => void;
}

function getActionLabel(fromStatus: InquiryStatus, toStatus: InquiryStatus): string {
  if (fromStatus === "resolved" && toStatus === "in_progress") {
    return "Reopen Inquiry";
  }
  if (toStatus === "in_progress") {
    return "Move to In Progress";
  }
  if (toStatus === "resolved") {
    return "Mark Resolved";
  }
  return `Move to ${formatInquiryStatus(toStatus)}`;
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
    <div className="space-y-3">
      {activeConflict ? (
        <Alert variant="destructive">
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

      <div className="flex flex-wrap items-center gap-2">
        {inquiry.allowedTransitions.map((targetStatus) => (
          <Button
            key={targetStatus}
            type="button"
            variant={targetStatus === "resolved" ? "default" : "outline"}
            disabled={updateMutation.isPending}
            onClick={() => void handleTransition(targetStatus)}
          >
            {updateMutation.isPending && updateMutation.variables?.status === targetStatus ? (
              <Loader2Icon className="animate-spin" />
            ) : null}
            {getActionLabel(inquiry.status, targetStatus)}
          </Button>
        ))}
      </div>
    </div>
  );
}
