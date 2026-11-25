import type { ApiErrorResponse } from "@cims/shared";

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly fields?: Record<string, string[]>;
  public readonly meta?: Record<string, unknown>;
  public readonly requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string[]>,
    meta?: Record<string, unknown>,
    requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    if (fields !== undefined) {
      this.fields = fields;
    }
    if (meta !== undefined) {
      this.meta = meta;
    }
    if (requestId !== undefined) {
      this.requestId = requestId;
    }
  }
}

export interface ApiFetchOptions extends RequestInit {
  skipAuthRefresh?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const NO_REFRESH_AUTH_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",
]);

let refreshInFlight: Promise<boolean> | null = null;

function buildUrl(path: string): string {
  const normalizedBase = API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function performRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(buildUrl("/api/auth/refresh"), {
          method: "POST",
          credentials: "include",
          headers: {
            "X-Requested-With": "cims",
          },
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  const headerRequestId = res.headers.get("x-request-id") ?? undefined;

  try {
    const data = (await res.json()) as Partial<ApiErrorResponse>;
    if (data && typeof data === "object" && data.error) {
      return new ApiError(
        res.status,
        data.error.code ?? "HTTP_ERROR",
        data.error.message ?? res.statusText ?? "Request failed",
        data.error.fields,
        data.error.meta,
        data.error.requestId ?? headerRequestId,
      );
    }
  } catch {
    // Non-JSON error body
  }

  return new ApiError(
    res.status,
    res.status >= 500 ? "INTERNAL_ERROR" : "HTTP_ERROR",
    res.statusText || "Request failed",
    undefined,
    undefined,
    headerRequestId,
  );
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { skipAuthRefresh = false, headers: customHeaders, body, ...rest } = options;

  const headers = new Headers(customHeaders);
  headers.set("X-Requested-With", "cims");
  if (body !== undefined && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      ...rest,
      body,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Unable to reach the server. Please check your connection and try again.",
    );
  }

  const normalizedPathname = (path.startsWith("/") ? path : `/${path}`).split("?")[0] ?? "";
  const isNoRefreshAuthPath = NO_REFRESH_AUTH_PATHS.has(normalizedPathname);
  if (response.status === 401 && !skipAuthRefresh && !isNoRefreshAuthPath) {
    const refreshed = await performRefresh();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, skipAuthRefresh: true });
    }
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
