import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateInquiryInput } from "@cims/shared";
import { createInquiry } from "@/features/inquiries/api";

export function useCreateInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInquiryInput) => createInquiry(input),
    onSuccess: (inquiry) => {
      queryClient.setQueryData(["inquiry", inquiry.id], inquiry);
      void queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });
}
