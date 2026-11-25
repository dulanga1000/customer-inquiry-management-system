import { ArrowRightIcon } from "lucide-react";
import type { StatusHistoryEntry } from "@cims/shared";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";

export function StatusHistory({ entries }: { entries: StatusHistoryEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Status History</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No status transitions recorded yet.</p>
        ) : (
          <ol className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-2 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={entry.fromStatus} />
                  <ArrowRightIcon className="size-3.5 text-muted-foreground" />
                  <StatusBadge status={entry.toStatus} />
                </div>
                <div className="text-xs text-muted-foreground">
                  Changed by <strong className="text-foreground">{entry.changedBy.name}</strong> ·{" "}
                  {formatDateTime(entry.changedAt)}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
