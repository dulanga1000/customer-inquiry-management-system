import { useQuery } from "@tanstack/react-query";
import { fetchUsers } from "@/features/users/api";

export function useUsers(enabled: boolean) {
  return useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled,
  });
}
