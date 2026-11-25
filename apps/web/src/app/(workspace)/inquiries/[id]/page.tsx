import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LoadingState } from "@/components/common/LoadingState";
import { InquiryDetail } from "@/features/inquiries/components/InquiryDetail";

async function InquiryDetailLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) {
    notFound();
  }
  const numericId = Number.parseInt(id, 10);
  return <InquiryDetail inquiryId={numericId} />;
}

export default function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<LoadingState variant="detail" />}>
      <InquiryDetailLoader params={params} />
    </Suspense>
  );
}
