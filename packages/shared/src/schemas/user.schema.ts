import { z } from "zod";
import { USER_ROLES } from "../constants/inquiry.js";

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(150, "Email must be at most 150 characters")
    .email("Enter a valid email address")
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  role: z.enum(USER_ROLES),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
