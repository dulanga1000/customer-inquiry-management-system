import type { InquiryStatus, UserRole } from "@cims/shared";

const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const ROLE_LABELS: Record<UserRole, string> = {
  staff: "Staff",
  admin: "Admin",
};

export function formatInquiryStatus(status: InquiryStatus): string {
  return STATUS_LABELS[status];
}

export function formatUserRole(role: UserRole): string {
  return ROLE_LABELS[role];
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
