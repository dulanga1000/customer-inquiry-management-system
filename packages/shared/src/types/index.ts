import { z } from "zod";

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
