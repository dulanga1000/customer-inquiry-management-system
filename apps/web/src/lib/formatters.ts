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

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) {
    return iso;
  }

  const diffSeconds = Math.round((Date.now() - timestamp) / 1000);
  if (diffSeconds < 60) {
    return "Just now";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
