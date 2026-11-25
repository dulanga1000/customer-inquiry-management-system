import { useQuery } from "@tanstack/react-query";
import { fetchInquiry } from "@/features/inquiries/api";

export function useInquiry(id: number) {
  return useQuery({
    queryKey: ["inquiry", id],
    queryFn: () => fetchInquiry(id),
    enabled: Number.isInteger(id) && id > 0,
    refetchOnMount: "always",
  });
}
