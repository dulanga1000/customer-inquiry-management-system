import { z } from "zod";

export const USER_ROLES = ["staff", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const INQUIRY_STATUSES = ["new", "in_progress", "resolved"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

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
