import type {
  ApiSuccessResponse,
  AssignInquiryInput,
  CreateInquiryInput,
  InquiryDetail,
  InquiryStatus,
  InquirySummary,
  PaginationMeta,
  UpdateInquiryStatusInput,
} from "@cims/shared";
import { apiFetch } from "@/lib/apiClient";

export interface ListInquiriesParams {
  status?: InquiryStatus;
  q?: string;
  page: number;
  limit: number;
}

export interface ListInquiriesResult {
  data: InquirySummary[];
  meta: PaginationMeta;
}

export async function fetchInquiries(params: ListInquiriesParams): Promise<ListInquiriesResult> {
  const searchParams = new URLSearchParams();
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.q) {
    searchParams.set("q", params.q);
  }
  searchParams.set("page", String(params.page));
  searchParams.set("limit", String(params.limit));

  return apiFetch<ListInquiriesResult>(`/api/inquiries?${searchParams.toString()}`);
}

export async function fetchInquiry(id: number): Promise<InquiryDetail> {
  const response = await apiFetch<ApiSuccessResponse<{ inquiry: InquiryDetail }>>(
    `/api/inquiries/${id}`,
  );
  return response.data.inquiry;
}

export async function createInquiry(input: CreateInquiryInput): Promise<InquiryDetail> {
  const response = await apiFetch<ApiSuccessResponse<{ inquiry: InquiryDetail }>>(
    "/api/inquiries",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return response.data.inquiry;
}

export async function updateInquiryStatus(
  id: number,
  input: UpdateInquiryStatusInput,
): Promise<InquiryDetail> {
  const response = await apiFetch<ApiSuccessResponse<{ inquiry: InquiryDetail }>>(
    `/api/inquiries/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return response.data.inquiry;
}

export async function assignInquiry(
  id: number,
  input: AssignInquiryInput,
): Promise<InquiryDetail> {
  const response = await apiFetch<ApiSuccessResponse<{ inquiry: InquiryDetail }>>(
    `/api/inquiries/${id}/assign`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return response.data.inquiry;
}
