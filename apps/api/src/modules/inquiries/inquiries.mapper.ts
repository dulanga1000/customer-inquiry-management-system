import type {
  InquiryDetail,
  InquirySummary,
  InquiryUserSummary,
  StatusHistoryEntry,
} from "@cims/shared";
import type { InquiryStatus } from "../../generated/prisma/enums.js";
import { getAllowedTransitions } from "./statusTransitions.js";

export interface InquiryUserRow {
  id: number;
  name: string;
  email: string;
}

export interface StatusHistoryRow {
  id: number;
  inquiryId: number;
  fromStatus: InquiryStatus;
  toStatus: InquiryStatus;
  changedAt: Date;
  changer: InquiryUserRow;
}

export interface InquirySummaryRow {
  id: number;
  customerName: string;
  contact: string;
  subject: string;
  status: InquiryStatus;
  createdAt: Date;
  updatedAt: Date;
  creator: InquiryUserRow;
  assignee: InquiryUserRow | null;
}

export interface InquiryDetailRow extends InquirySummaryRow {
  description: string;
  statusHistory: StatusHistoryRow[];
}

function toUserSummary(user: InquiryUserRow): InquiryUserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

function toStatusHistoryEntry(entry: StatusHistoryRow): StatusHistoryEntry {
  return {
    id: entry.id,
    inquiryId: entry.inquiryId,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    changedAt: entry.changedAt.toISOString(),
    changedBy: toUserSummary(entry.changer),
  };
}

export function toInquirySummary(row: InquirySummaryRow): InquirySummary {
  return {
    id: row.id,
    customerName: row.customerName,
    contact: row.contact,
    subject: row.subject,
    status: row.status,
    createdBy: toUserSummary(row.creator),
    assignedTo: row.assignee ? toUserSummary(row.assignee) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toInquiryDetail(row: InquiryDetailRow): InquiryDetail {
  return {
    ...toInquirySummary(row),
    description: row.description,
    allowedTransitions: getAllowedTransitions(row.status),
    statusHistory: row.statusHistory.map(toStatusHistoryEntry),
  };
}
