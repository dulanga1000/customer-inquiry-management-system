import type { ApiSuccessResponse, AuthUser, LoginInput } from "@cims/shared";
import { apiFetch } from "@/lib/apiClient";

export async function getMe(): Promise<AuthUser> {
  const response = await apiFetch<ApiSuccessResponse<{ user: AuthUser }>>("/api/auth/me");
  return response.data.user;
}

export async function loginRequest(input: LoginInput): Promise<AuthUser> {
  const response = await apiFetch<ApiSuccessResponse<{ user: AuthUser }>>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.data.user;
}

export async function logoutRequest(): Promise<void> {
  await apiFetch<void>("/api/auth/logout", {
    method: "POST",
  });
}
