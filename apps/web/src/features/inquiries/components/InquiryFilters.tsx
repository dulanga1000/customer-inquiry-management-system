"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { INQUIRY_STATUSES, type InquiryStatus } from "@cims/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InquiryCounts } from "@/features/inquiries/hooks/useInquiryCounts";
import { formatInquiryStatus } from "@/lib/formatters";
import { cn } from "cn";

export type StatusFilterValue = "all" | InquiryStatus;

interface InquiryFiltersProps {
  status: StatusFilterValue;
  search: string;
  counts?: InquiryCounts;
  onStatusChange: (status: StatusFilterValue) => void;
  onSearchChange: (search: string) => void;
  onClear: () => void;
}

const STATUS_OPTIONS: ReadonlyArray<StatusFilterValue> = ["all", ...INQUIRY_STATUSES];

function getCountForOption(option: StatusFilterValue, counts?: InquiryCounts): number | null {
  if (!counts) {
    return null;
  }
  switch (option) {
    case "all":
      return counts.total;
    case "new":
      return counts.newCount;
    case "in_progress":
      return counts.inProgressCount;
    case "resolved":
      return counts.resolvedCount;
  }
}

export function InquiryFilters({
  status,
  search,
  counts,
  onStatusChange,
  onSearchChange,
  onClear,
}: InquiryFiltersProps) {
  const hasFilters = status !== "all" || search.trim().length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
      <div
        role="tablist"
        aria-label="Filter inquiries by status"
        className="flex flex-wrap items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50/80 p-1"
      >
        {STATUS_OPTIONS.map((option) => {
          const isSelected = status === option;
          const label = option === "all" ? "All" : formatInquiryStatus(option);
          const count = getCountForOption(option, counts);

          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onStatusChange(option)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "bg-white text-zinc-950 shadow-xs ring-1 ring-zinc-200"
                  : "text-zinc-600 hover:text-zinc-950",
              )}
            >
              <span>{label}</span>
              {count !== null ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
                    isSelected ? "bg-blue-50 text-blue-700" : "bg-zinc-200/70 text-zinc-600",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 items-center gap-2 lg:max-w-md">
        <div className="relative flex-1">
          <Label htmlFor="inquiry-search" className="sr-only">
            Search inquiries
          </Label>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            id="inquiry-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by customer, contact, or subject..."
            className="h-9 bg-white pl-9"
          />
        </div>

        {hasFilters ? (
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            <XIcon className="size-3.5" />
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
