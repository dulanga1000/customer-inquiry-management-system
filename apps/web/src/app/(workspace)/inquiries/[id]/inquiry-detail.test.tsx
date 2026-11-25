import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InquiryDetail as InquiryDetailDto } from "@cims/shared";
import { InquiryDetail } from "@/features/inquiries/components/InquiryDetail";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: 2,
      name: "Staff One",
      email: "staff1@cims.local",
      role: "staff" as const,
    },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    isLoggingOut: false,
  }),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildInquiry(overrides: Partial<InquiryDetailDto> = {}): InquiryDetailDto {
  return {
    id: 42,
    customerName: "Nimal Jayawardena",
    contact: "nimal@example.com",
    subject: "Order delivery delay",
    description: "Package #8812 has been delayed by four business days.",
    status: "new",
    createdBy: {
      id: 2,
      name: "Staff One",
      email: "staff1@cims.local",
    },
    assignedTo: null,
    assignedUser: null,
    createdAt: "2026-11-25T08:00:00.000Z",
    updatedAt: "2026-11-25T08:00:00.000Z",
    allowedTransitions: ["in_progress"],
    statusHistory: [],
    ...overrides,
  };
}

function renderInquiryDetail(inquiryId = 42) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <InquiryDetail inquiryId={inquiryId} />
    </QueryClientProvider>,
  );
}

describe("InquiryDetail status transitions & optimistic lock conflict", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows only valid transition for new inquiry and updates UI on status change", async () => {
    const initialInquiry = buildInquiry();
    const updatedInquiry = buildInquiry({
      status: "in_progress",
      updatedAt: "2026-11-25T09:15:00.000Z",
      allowedTransitions: ["resolved"],
      statusHistory: [
        {
          id: 1,
          inquiryId: 42,
          fromStatus: "new",
          toStatus: "in_progress",
          changedAt: "2026-11-25T09:15:00.000Z",
          changedBy: {
            id: 2,
            name: "Staff One",
            email: "staff1@cims.local",
          },
        },
      ],
    });

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/inquiries/42") && method === "GET") {
        return jsonResponse({ data: { inquiry: initialInquiry } });
      }
      if (url.endsWith("/api/inquiries/42/status") && method === "PATCH") {
        return jsonResponse({ data: { inquiry: updatedInquiry } });
      }
      throw new Error(`Unexpected fetch call: ${method} ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderInquiryDetail(42);

    const moveButton = await screen.findByRole("button", { name: /move to in progress/i });
    expect(moveButton).toBeEnabled();
    expect(screen.queryByRole("button", { name: /mark resolved/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reopen inquiry/i })).not.toBeInTheDocument();

    await user.click(moveButton);

    expect(await screen.findByRole("button", { name: /mark resolved/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /move to in progress/i })).not.toBeInTheDocument();
    expect(screen.getByText(/1 update/i)).toBeInTheDocument();

    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) => String(url).endsWith("/api/inquiries/42/status") && init?.method === "PATCH",
    );
    expect(patchCall).toBeDefined();
    expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({
      status: "in_progress",
      updatedAt: initialInquiry.updatedAt,
    });
  });

  it("displays stale-data reload warning when status update fails with 409 STALE_DATA", async () => {
    const initialInquiry = buildInquiry();
    const refreshedInquiry = buildInquiry({
      status: "in_progress",
      updatedAt: "2026-11-25T10:00:00.000Z",
      allowedTransitions: ["resolved"],
    });

    let getCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/inquiries/42") && method === "GET") {
        getCount += 1;
        return jsonResponse({
          data: { inquiry: getCount === 1 ? initialInquiry : refreshedInquiry },
        });
      }
      if (url.endsWith("/api/inquiries/42/status") && method === "PATCH") {
        return jsonResponse(
          {
            error: {
              code: "STALE_DATA",
              message: "This inquiry was changed elsewhere. Reload to see the latest.",
              requestId: "req-stale-42",
            },
          },
          409,
        );
      }
      throw new Error(`Unexpected fetch call: ${method} ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderInquiryDetail(42);

    const moveButton = await screen.findByRole("button", { name: /move to in progress/i });
    await user.click(moveButton);

    expect(await screen.findByText(/outdated inquiry version/i)).toBeInTheDocument();
    expect(
      screen.getByText(/this inquiry was changed elsewhere\. reload to see the latest\./i),
    ).toBeInTheDocument();

    const reloadButton = screen.getByRole("button", { name: /^reload$/i });
    await user.click(reloadButton);

    await waitFor(() => {
      expect(getCount).toBe(2);
    });
    expect(await screen.findByRole("button", { name: /mark resolved/i })).toBeInTheDocument();
  });
});
