import { useQuery } from "@tanstack/react-query";
import { fetchInquiries, type ListInquiriesParams } from "@/features/inquiries/api";

export function useInquiries(params: ListInquiriesParams) {
  return useQuery({
    queryKey: ["inquiries", params],
    queryFn: () => fetchInquiries(params),
  });
}
