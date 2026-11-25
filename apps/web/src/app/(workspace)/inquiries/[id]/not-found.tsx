import { EmptyState } from "@/components/common/EmptyState";

export default function InquiryNotFoundPage() {
  return (
    <EmptyState
      title="Inquiry not found or you don't have access"
      description="The inquiry may not exist, or your account may not have permission to view it."
      actionLabel="Back to inquiries"
      actionHref="/inquiries"
    />
  );
}
