import type { ApiSuccessResponse, CreateUserInput, UserSummary } from "@cims/shared";
import { apiFetch } from "@/lib/apiClient";

export async function fetchUsers(): Promise<UserSummary[]> {
  const response = await apiFetch<ApiSuccessResponse<{ users: UserSummary[] }>>("/api/users");
  return response.data.users;
}

export async function createUser(input: CreateUserInput): Promise<UserSummary> {
  const response = await apiFetch<ApiSuccessResponse<{ user: UserSummary }>>("/api/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.data.user;
}
