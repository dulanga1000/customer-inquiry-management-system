"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { INQUIRY_STATUSES, type InquiryStatus } from "@cims/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatInquiryStatus } from "@/lib/formatters";

export type StatusFilterValue = "all" | InquiryStatus;

interface InquiryFiltersProps {
  status: StatusFilterValue;
  search: string;
  onStatusChange: (status: StatusFilterValue) => void;
  onSearchChange: (search: string) => void;
  onClear: () => void;
}

export function InquiryFilters({
  status,
  search,
  onStatusChange,
  onSearchChange,
  onClear,
}: InquiryFiltersProps) {
  const hasFilters = status !== "all" || search.trim().length > 0;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="inquiry-search">Search inquiries</Label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="inquiry-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by customer, contact, or subject..."
            className="pl-8"
          />
        </div>
      </div>

      <div className="w-full space-y-1.5 sm:w-48">
        <Label htmlFor="inquiry-status-filter">Status</Label>
        <Select
          value={status}
          onValueChange={(value) => onStatusChange((value ?? "all") as StatusFilterValue)}
        >
          <SelectTrigger id="inquiry-status-filter" className="w-full">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {INQUIRY_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {formatInquiryStatus(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasFilters ? (
        <Button type="button" variant="outline" onClick={onClear}>
          <XIcon className="size-4" />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
