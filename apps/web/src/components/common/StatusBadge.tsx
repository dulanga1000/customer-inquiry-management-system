import type { InquiryStatus } from "@cims/shared";
import { Badge } from "@/components/ui/badge";
import { formatInquiryStatus } from "@/lib/formatters";
import { cn } from "cn";

const STATUS_STYLES: Record<InquiryStatus, string> = {
  new: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  in_progress: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  resolved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export function StatusBadge({ status, className }: { status: InquiryStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status], className)}>
      {formatInquiryStatus(status)}
    </Badge>
  );
}
