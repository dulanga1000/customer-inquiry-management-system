import { useQuery } from "@tanstack/react-query";
import { fetchInquiries } from "@/features/inquiries/api";

export interface InquiryCounts {
  total: number | null;
  newCount: number | null;
  inProgressCount: number | null;
  resolvedCount: number | null;
  isLoading: boolean;
}

export function useInquiryCounts(enabled = true): InquiryCounts {
  const totalQuery = useQuery({
    queryKey: ["inquiries", "summary", "all"],
    queryFn: () => fetchInquiries({ page: 1, limit: 1 }),
    enabled,
  });

  const newQuery = useQuery({
    queryKey: ["inquiries", "summary", "new"],
    queryFn: () => fetchInquiries({ status: "new", page: 1, limit: 1 }),
    enabled,
  });

  const inProgressQuery = useQuery({
    queryKey: ["inquiries", "summary", "in_progress"],
    queryFn: () => fetchInquiries({ status: "in_progress", page: 1, limit: 1 }),
    enabled,
  });

  const resolvedQuery = useQuery({
    queryKey: ["inquiries", "summary", "resolved"],
    queryFn: () => fetchInquiries({ status: "resolved", page: 1, limit: 1 }),
    enabled,
  });

  return {
    total: totalQuery.data?.meta.total ?? null,
    newCount: newQuery.data?.meta.total ?? null,
    inProgressCount: inProgressQuery.data?.meta.total ?? null,
    resolvedCount: resolvedQuery.data?.meta.total ?? null,
    isLoading:
      totalQuery.isLoading ||
      newQuery.isLoading ||
      inProgressQuery.isLoading ||
      resolvedQuery.isLoading,
  };
}
