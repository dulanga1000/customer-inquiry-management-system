"use client";

import * as React from "react";
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import type { InquiryDetail } from "@cims/shared";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssignInquiry } from "@/features/inquiries/hooks/useAssignInquiry";
import { useUsers } from "@/features/users/hooks/useUsers";
import { ApiError } from "@/lib/apiClient";

interface AssigneeSelectProps {
  inquiry: InquiryDetail;
  onReload: () => void;
}

const UNASSIGNED_VALUE = "unassigned";

export function AssigneeSelect({ inquiry, onReload }: AssigneeSelectProps) {
  const { data: users, isLoading: usersLoading } = useUsers(true);
  const assignMutation = useAssignInquiry(inquiry.id);
  const [staleError, setStaleError] = React.useState<{
    message: string;
    forUpdatedAt: string;
  } | null>(null);

  const activeStaleError =
    staleError && staleError.forUpdatedAt === inquiry.updatedAt ? staleError : null;

  const assignedRecord = inquiry.assignedUser ?? inquiry.assignedTo;
  const currentValue = assignedRecord ? String(assignedRecord.id) : UNASSIGNED_VALUE;
  const selectedMember = users?.find((member) => String(member.id) === currentValue);

  const selectedLabel =
    currentValue === UNASSIGNED_VALUE
      ? "Unassigned"
      : selectedMember
        ? `${selectedMember.name} (${selectedMember.email})`
        : assignedRecord
          ? `${assignedRecord.name} (${assignedRecord.email})`
          : "Unassigned";

  const handleChange = async (nextValue: string | null) => {
    const resolved = nextValue ?? UNASSIGNED_VALUE;
    if (resolved === currentValue) {
      return;
    }

    const assignedTo = resolved === UNASSIGNED_VALUE ? null : Number.parseInt(resolved, 10);
    setStaleError(null);

    try {
      const updated = await assignMutation.mutateAsync({
        assignedTo,
        updatedAt: inquiry.updatedAt,
      });
      const updatedAssignee = updated.assignedUser ?? updated.assignedTo;
      toast.success(
        updatedAssignee
          ? `Assigned to ${updatedAssignee.name}`
          : "Inquiry unassigned",
      );
    } catch (error) {
      if (error instanceof ApiError && error.code === "STALE_DATA") {
        setStaleError({
          message: "Changed elsewhere. Reload before reassigning.",
          forUpdatedAt: inquiry.updatedAt,
        });
        return;
      }
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }
      toast.error("Unable to update assignee.");
    }
  };

  return (
    <div className="space-y-2">
      <Select
        value={currentValue}
        onValueChange={(val) => void handleChange(val)}
        disabled={usersLoading || assignMutation.isPending}
      >
        <SelectTrigger
          id="inquiry-assignee-select"
          aria-label="Assigned To"
          size="sm"
          className="w-full bg-white"
        >
          <SelectValue>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
          {(users ?? []).map((member) => (
            <SelectItem key={member.id} value={String(member.id)}>
              {member.name} ({member.email})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeStaleError ? (
        <Alert variant="destructive" className="py-1.5 text-xs">
          <AlertCircleIcon />
          <AlertDescription className="text-xs">{activeStaleError.message}</AlertDescription>
          <AlertAction>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => {
                setStaleError(null);
                onReload();
              }}
            >
              <RefreshCwIcon className="size-3" />
              Reload
            </Button>
          </AlertAction>
        </Alert>
      ) : null}
    </div>
  );
}
