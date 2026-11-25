import type { InquiryStatus } from "@cims/shared";

export const ALLOWED_STATUS_TRANSITIONS: Record<InquiryStatus, readonly InquiryStatus[]> = {
  new: ["in_progress"],
  in_progress: ["resolved"],
  resolved: ["in_progress"],
};

export function getAllowedTransitions(status: InquiryStatus): InquiryStatus[] {
  return [...ALLOWED_STATUS_TRANSITIONS[status]];
}

export function isValidStatusTransition(from: InquiryStatus, to: InquiryStatus): boolean {
  return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}
