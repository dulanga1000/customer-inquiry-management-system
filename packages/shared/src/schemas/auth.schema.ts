import { z } from "zod";
import { USER_ROLES } from "../constants/inquiry.js";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email").toLowerCase(),
  password: z.string().min(1, "Password is required").max(128, "Password is too long"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const authUserSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(USER_ROLES),
  createdAt: z.string(),
});

export type AuthUser = z.infer<typeof authUserSchema>;
