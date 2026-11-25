import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/apiClient";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiFetch silent token refresh", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refreshes and retries GET /api/auth/me once on 401 when refresh succeeds", async () => {
    let meCalls = 0;
    let refreshCalls = 0;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/auth/me") && method === "GET") {
        meCalls += 1;
        if (meCalls === 1) {
          return jsonResponse(
            { error: { code: "UNAUTHENTICATED", message: "Token expired", requestId: "req-1" } },
            401,
          );
        }
        return jsonResponse({
          data: {
            user: {
              id: 1,
              email: "admin@cims.local",
              name: "Admin User",
              role: "admin",
              createdAt: "2026-11-25T00:00:00.000Z",
            },
          },
        });
      }

      if (url.endsWith("/api/auth/refresh") && method === "POST") {
        refreshCalls += 1;
        return jsonResponse({ data: { user: { id: 1 } } }, 200);
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await apiFetch<{ data: { user: { email: string } } }>("/api/auth/me");
    expect(result.data.user.email).toBe("admin@cims.local");
    expect(refreshCalls).toBe(1);
    expect(meCalls).toBe(2);
  });

  it("throws ApiError 401 without looping when refresh fails for GET /api/auth/me", async () => {
    let meCalls = 0;
    let refreshCalls = 0;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/auth/me") && method === "GET") {
        meCalls += 1;
        return jsonResponse(
          { error: { code: "UNAUTHENTICATED", message: "Token expired", requestId: "req-1" } },
          401,
        );
      }

      if (url.endsWith("/api/auth/refresh") && method === "POST") {
        refreshCalls += 1;
        return jsonResponse(
          { error: { code: "UNAUTHENTICATED", message: "Refresh expired", requestId: "req-2" } },
          401,
        );
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/api/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(refreshCalls).toBe(1);
    expect(meCalls).toBe(1);
  });

  it("skips refresh retry for /api/auth/login, /api/auth/refresh, and /api/auth/logout", async () => {
    let refreshCalls = 0;

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/auth/refresh")) {
        refreshCalls += 1;
      }
      return jsonResponse(
        { error: { code: "UNAUTHENTICATED", message: "Unauthorized", requestId: "req-3" } },
        401,
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/api/auth/login", { method: "POST", body: "{}" })).rejects.toMatchObject({
      status: 401,
    });
    await expect(apiFetch("/api/auth/logout", { method: "POST" })).rejects.toMatchObject({
      status: 401,
    });
    await expect(apiFetch("/api/auth/refresh", { method: "POST" })).rejects.toMatchObject({
      status: 401,
    });

    expect(refreshCalls).toBe(1);
  });
});
