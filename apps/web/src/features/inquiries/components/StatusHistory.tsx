import { ArrowRightIcon, HistoryIcon } from "lucide-react";
import type { StatusHistoryEntry } from "@cims/shared";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatRelativeTime, getInitials } from "@/lib/formatters";
import { cn } from "cn";

export function StatusHistory({ entries }: { entries: StatusHistoryEntry[] }) {
  return (
    <Card className="border border-zinc-200 bg-white ring-0">
      <CardHeader className="border-b border-zinc-100 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HistoryIcon className="size-4 text-zinc-500" />
            <CardTitle className="text-base font-semibold text-zinc-950">Status History</CardTitle>
          </div>
          <span className="font-mono text-xs text-zinc-500 tabular-nums">
            {entries.length} {entries.length === 1 ? "update" : "updates"}
          </span>
        </div>
        <CardDescription className="text-xs text-zinc-500">
          Chronological record of status changes on this inquiry.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-5">
        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 p-4 text-center text-sm text-zinc-500">
            No status transitions recorded yet.
          </div>
        ) : (
          <ol className="relative ml-2.5 space-y-5 border-l border-zinc-200 pl-6">
            {entries.map((entry) => (
              <li key={entry.id} className="relative">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -left-[29px] top-1.5 size-2.5 rounded-full ring-4 ring-white",
                    entry.toStatus === "resolved" ? "bg-teal-600" : "bg-blue-700",
                  )}
                />

                <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50/40 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={entry.fromStatus} />
                    <ArrowRightIcon className="size-3.5 text-zinc-400" />
                    <StatusBadge status={entry.toStatus} />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-500 tabular-nums">
                    <span
                      aria-hidden="true"
                      className="flex size-5 items-center justify-center rounded-full bg-zinc-200/80 text-[10px] font-semibold text-zinc-700"
                    >
                      {getInitials(entry.changedBy.name)}
                    </span>
                    <span className="font-medium text-zinc-900">{entry.changedBy.name}</span>
                    <span aria-hidden="true">·</span>
                    <span title={formatDateTime(entry.changedAt)}>
                      {formatRelativeTime(entry.changedAt)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
