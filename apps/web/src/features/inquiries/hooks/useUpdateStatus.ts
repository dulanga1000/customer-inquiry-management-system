import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateInquiryStatusInput } from "@cims/shared";
import { updateInquiryStatus } from "@/features/inquiries/api";

export function useUpdateStatus(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateInquiryStatusInput) => updateInquiryStatus(id, input),
    onSuccess: (inquiry) => {
      queryClient.setQueryData(["inquiry", id], inquiry);
      void queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });
}
