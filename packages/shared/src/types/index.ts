import { z } from "zod";
import type { InquiryStatus, UserRole } from "../constants/inquiry.js";

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  db: z.enum(["up", "down"]),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
    meta?: Record<string, unknown>;
    requestId: string;
  };
}

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InquiryUserSummary {
  id: number;
  name: string;
  email: string;
}

export interface StatusHistoryEntry {
  id: number;
  inquiryId: number;
  fromStatus: InquiryStatus;
  toStatus: InquiryStatus;
  changedAt: string;
  changedBy: InquiryUserSummary;
}

export interface InquirySummary {
  id: number;
  customerName: string;
  contact: string;
  subject: string;
  status: InquiryStatus;
  createdBy: InquiryUserSummary;
  assignedTo: InquiryUserSummary | null;
  assignedUser: InquiryUserSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface InquiryDetail extends InquirySummary {
  description: string;
  allowedTransitions: InquiryStatus[];
  statusHistory: StatusHistoryEntry[];
}
