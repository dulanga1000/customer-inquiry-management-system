import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AssignInquiryInput } from "@cims/shared";
import { assignInquiry } from "@/features/inquiries/api";

export function useAssignInquiry(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssignInquiryInput) => assignInquiry(id, input),
    onSuccess: (inquiry) => {
      queryClient.setQueryData(["inquiry", id], inquiry);
      void queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });
}
