import type { InquiryStatus } from "@cims/shared";
import { Badge } from "@/components/ui/badge";
import { formatInquiryStatus } from "@/lib/formatters";
import { cn } from "cn";

const STATUS_STYLES: Record<InquiryStatus, string> = {
  new: "border-blue-600/25 bg-blue-50 text-blue-700",
  in_progress: "border-amber-600/25 bg-amber-50 text-amber-800",
  resolved: "border-teal-600/25 bg-teal-50 text-teal-700",
};

const STATUS_DOT_STYLES: Record<InquiryStatus, string> = {
  new: "bg-blue-600",
  in_progress: "bg-amber-500",
  resolved: "bg-teal-600",
};

export function StatusBadge({ status, className }: { status: InquiryStatus; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium", STATUS_STYLES[status], className)}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", STATUS_DOT_STYLES[status])}
      />
      {formatInquiryStatus(status)}
    </Badge>
  );
}
