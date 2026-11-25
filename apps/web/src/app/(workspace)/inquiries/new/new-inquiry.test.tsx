import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InquiryForm } from "@/features/inquiries/components/InquiryForm";

const pushMock = vi.fn();

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
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
  }),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderInquiryForm() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <InquiryForm />
    </QueryClientProvider>,
  );
}

async function fillAndSubmitInquiryForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/customer name/i), "Nimal Jayawardena");
  await user.type(screen.getByLabelText(/contact/i), "nimal@example.com");
  await user.type(screen.getByLabelText(/subject/i), "Order delivery delay");
  await user.type(
    screen.getByLabelText(/description/i),
    "Customer reported order #8821 has not arrived after five days.",
  );
  await user.click(screen.getByRole("button", { name: /create inquiry/i }));
}

describe("InquiryForm duplicate inquiry handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows existing inquiry link on 409 DUPLICATE_INQUIRY when canViewExisting is true", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        {
          error: {
            code: "DUPLICATE_INQUIRY",
            message: "A duplicate inquiry was already submitted within the last 24 hours.",
            meta: {
              canViewExisting: true,
              existingInquiryId: 77,
            },
            requestId: "req-dup-visible",
          },
        },
        409,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderInquiryForm();

    await fillAndSubmitInquiryForm(user);

    expect(await screen.findByText(/duplicate inquiry detected/i)).toBeInTheDocument();
    expect(
      screen.getByText(/a duplicate inquiry was already submitted within the last 24 hours\./i),
    ).toBeInTheDocument();

    const existingLink = screen.getByRole("link", { name: /view existing inquiry #77/i });
    expect(existingLink).toHaveAttribute("href", "/inquiries/77");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("hides existing inquiry link on 409 DUPLICATE_INQUIRY when canViewExisting is false", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        {
          error: {
            code: "DUPLICATE_INQUIRY",
            message:
              "A duplicate inquiry for this customer was already logged by another team member within the last 24 hours.",
            meta: {
              canViewExisting: false,
            },
            requestId: "req-dup-hidden",
          },
        },
        409,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderInquiryForm();

    await fillAndSubmitInquiryForm(user);

    expect(await screen.findByText(/duplicate inquiry detected/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /a duplicate inquiry for this customer was already logged by another team member within the last 24 hours\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view existing inquiry/i })).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
