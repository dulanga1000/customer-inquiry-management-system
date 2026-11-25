import { z } from "zod";
import { INQUIRY_STATUSES } from "../constants/inquiry.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

function isValidContact(value: string): boolean {
  if (EMAIL_REGEX.test(value)) {
    return true;
  }
  if (!PHONE_REGEX.test(value)) {
    return false;
  }
  const digitCount = value.replace(/\D/g, "").length;
  return digitCount >= 7 && digitCount <= 15;
}

export const createInquirySchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Customer name must be at least 2 characters")
    .max(100, "Customer name must be at most 100 characters"),
  contact: z
    .string()
    .trim()
    .min(1, "Contact email or phone is required")
    .max(150, "Contact must be at most 150 characters")
    .refine(isValidContact, "Enter a valid email address or phone number"),
  subject: z
    .string()
    .trim()
    .min(3, "Subject must be at least 3 characters")
    .max(150, "Subject must be at most 150 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be at most 2000 characters"),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;

export const inquiryIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/, "Inquiry ID must be a positive integer")
    .transform((value) => Number.parseInt(value, 10)),
});

export const listInquiriesQuerySchema = z.object({
  status: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(INQUIRY_STATUSES).optional(),
  ),
  q: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(100).optional(),
  ),
  page: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.coerce.number().int().min(1).default(1),
  ),
  limit: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.coerce.number().int().min(1).max(100).default(20),
  ),
});

export type ListInquiriesQuery = z.infer<typeof listInquiriesQuerySchema>;

export const updateInquiryStatusSchema = z.object({
  status: z.enum(INQUIRY_STATUSES),
  updatedAt: z.string().datetime({ message: "Valid ISO timestamp is required" }),
});

export type UpdateInquiryStatusInput = z.infer<typeof updateInquiryStatusSchema>;

export const assignInquirySchema = z.object({
  assignedTo: z.number().int().positive("Assignee user ID must be a positive integer").nullable(),
  updatedAt: z.string().datetime({ message: "Valid ISO timestamp is required" }),
});

export type AssignInquiryInput = z.infer<typeof assignInquirySchema>;
