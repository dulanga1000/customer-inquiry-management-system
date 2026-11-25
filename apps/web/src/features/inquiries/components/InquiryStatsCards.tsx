import { CheckCircle2Icon, CircleDotIcon, Clock3Icon, InboxIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { StatusFilterValue } from "@/features/inquiries/components/InquiryFilters";
import type { InquiryCounts } from "@/features/inquiries/hooks/useInquiryCounts";
import { cn } from "cn";

interface InquiryStatsCardsProps {
  counts: InquiryCounts;
  activeStatus: StatusFilterValue;
  isAdmin: boolean;
  onSelectStatus: (status: StatusFilterValue) => void;
}

export function InquiryStatsCards({
  counts,
  activeStatus,
  isAdmin,
  onSelectStatus,
}: InquiryStatsCardsProps) {
  const resolutionRate =
    counts.total !== null && counts.total > 0 && counts.resolvedCount !== null
      ? Math.round((counts.resolvedCount / counts.total) * 100)
      : null;

  const items: ReadonlyArray<{
    status: StatusFilterValue;
    label: string;
    value: number | null;
    hint: string;
    icon: typeof InboxIcon;
    iconBg: string;
    iconColor: string;
    activeBorder: string;
  }> = [
    {
      status: "all",
      label: isAdmin ? "Total Inquiries" : "My Inquiries",
      value: counts.total,
      hint: isAdmin ? "All workspace cases" : "Assigned or created by you",
      icon: InboxIcon,
      iconBg: "bg-zinc-100",
      iconColor: "text-zinc-700",
      activeBorder: "border-zinc-900 ring-1 ring-zinc-900/10",
    },
    {
      status: "new",
      label: "New Queue",
      value: counts.newCount,
      hint: "Awaiting initial triage",
      icon: CircleDotIcon,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-700",
      activeBorder: "border-blue-600 ring-1 ring-blue-600/15",
    },
    {
      status: "in_progress",
      label: "In Progress",
      value: counts.inProgressCount,
      hint: "Currently under review",
      icon: Clock3Icon,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-700",
      activeBorder: "border-amber-600 ring-1 ring-amber-600/15",
    },
    {
      status: "resolved",
      label: "Resolved",
      value: counts.resolvedCount,
      hint: resolutionRate !== null ? `${resolutionRate}% resolution rate` : "Completed cases",
      icon: CheckCircle2Icon,
      iconBg: "bg-teal-50",
      iconColor: "text-teal-700",
      activeBorder: "border-teal-600 ring-1 ring-teal-600/15",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeStatus === item.status;
        return (
          <button
            key={item.status}
            type="button"
            onClick={() => onSelectStatus(item.status)}
            aria-pressed={isActive}
            className="text-left focus-visible:outline-none"
          >
            <Card
              className={cn(
                "h-full gap-0 border border-zinc-200 bg-white p-5 ring-0 transition-colors hover:border-zinc-300",
                isActive ? item.activeBorder : null,
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-500">{item.label}</p>
                  {item.value === null ? (
                    <Skeleton className="h-8 w-14" />
                  ) : (
                    <p className="text-2xl font-semibold tracking-tight text-zinc-950 tabular-nums">
                      {item.value}
                    </p>
                  )}
                </div>
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    item.iconBg,
                  )}
                >
                  <Icon className={cn("size-4", item.iconColor)} />
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <p className="text-xs text-zinc-500">{item.hint}</p>
                {item.status === "resolved" && resolutionRate !== null ? (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-teal-600 transition-all"
                      style={{ width: `${resolutionRate}%` }}
                    />
                  </div>
                ) : null}
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
