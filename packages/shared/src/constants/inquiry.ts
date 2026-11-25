export const USER_ROLES = ["staff", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const INQUIRY_STATUSES = ["new", "in_progress", "resolved"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];
