import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateUserInput } from "@cims/shared";
import { createUser } from "@/features/users/api";

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
