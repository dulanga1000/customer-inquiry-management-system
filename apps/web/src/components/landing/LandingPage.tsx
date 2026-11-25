"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  HistoryIcon,
  LockIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { StatusBadge } from "@/components/common/StatusBadge";
import { WorkspacePreview } from "@/components/landing/WorkspacePreview";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { cn } from "cn";

export function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();

  const primaryHref = !isLoading && isAuthenticated ? "/inquiries" : "/login";
  const primaryLabel = !isLoading && isAuthenticated ? "Open workspace" : "Sign in to CaseBox";

  return (
    <div className="flex min-h-screen flex-col bg-background text-zinc-950">
      {/* Top Navigation */}
      <header className="sticky top-0 z-20 h-16 border-b border-zinc-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <BrandLogo size={32} />

          <nav aria-label="Landing sections" className="hidden items-center gap-6 md:flex">
            <a href="#preview" className="text-sm text-zinc-600 transition-colors hover:text-zinc-950">
              Workspace
            </a>
            <a href="#workflow" className="text-sm text-zinc-600 transition-colors hover:text-zinc-950">
              Workflow
            </a>
            <a href="#security" className="text-sm text-zinc-600 transition-colors hover:text-zinc-950">
              Controls
            </a>
          </nav>

          <Link href={primaryHref} className={cn(buttonVariants({ size: "default" }), "px-4")}>
            {!isLoading && isAuthenticated ? "Open workspace" : "Sign in"}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Centered Hero with Subtle Architectural Dot Grid */}
        <section className="relative border-b border-zinc-200 bg-white">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_20%,#000_60%,transparent_100%)]"
          />

          <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-14 sm:px-6 sm:pt-20 sm:pb-20">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700">
                <span className="size-1.5 rounded-full bg-teal-600" />
                <span>
                  <span className="font-semibold">
                    <span className="text-slate-900">Case</span>
                    <span className="text-blue-600">Box</span>
                  </span>{" "}
                  · Customer Inquiry Management
                </span>
              </div>

              <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                One reliable place for every customer inquiry.
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
                Capture requests, assign ownership, and move cases through an enforced status
                workflow—with optimistic locking and a permanent audit trail.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link href={primaryHref} className={cn(buttonVariants({ size: "lg" }), "h-10 px-5")}>
                  {primaryLabel}
                  <ArrowRightIcon className="size-4" />
                </Link>
                <a
                  href="#workflow"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-10 border-zinc-200 bg-white px-5 text-zinc-700 hover:bg-zinc-50",
                  )}
                >
                  How it works
                </a>
              </div>

              <p className="mt-4 text-xs text-zinc-500">
                Accounts are provisioned by your workspace administrator.
              </p>
            </div>

            {/* Interactive Product Window Showcase matching actual dashboard */}
            <WorkspacePreview />
          </div>
        </section>

        {/* Architectural Bento Grid */}
        <section id="workflow" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-10 max-w-2xl">
            <p className="font-mono text-xs font-medium tracking-wider text-blue-700 uppercase">
              Built-In Workflow Rules
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
              Every guardrail runs on the server.
            </h2>
            <p className="mt-2 text-sm text-zinc-600 sm:text-base">
              Shared Zod schemas validate inputs end-to-end while PostgreSQL transactions enforce
              state integrity.
            </p>
          </div>

          <div className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {/* Top 2-column row */}
            <div className="grid divide-y divide-zinc-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              <div className="space-y-4 p-6 sm:p-8">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                  <HistoryIcon className="size-4 text-blue-600" />
                  <span>Enforced Lifecycle & Audit Trail</span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-600">
                  Inquiries follow one explicit state machine. Invalid jumps return{" "}
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-900">
                    422 INVALID_TRANSITION
                  </code>
                  , and every valid change writes an immutable history entry in the same
                  transaction.
                </p>
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5">
                  <StatusBadge status="new" />
                  <ArrowRightIcon className="size-3.5 text-zinc-400" />
                  <StatusBadge status="in_progress" />
                  <ArrowRightIcon className="size-3.5 text-zinc-400" />
                  <StatusBadge status="resolved" />
                  <span className="ml-auto font-mono text-[11px] text-zinc-500">
                    reopen → in_progress
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-6 sm:p-8">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                  <ShieldCheckIcon className="size-4 text-teal-600" />
                  <span>24-Hour Global Deduplication</span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-600">
                  Duplicate contact + subject submissions within 24 hours are blocked across all
                  staff. If the existing case belongs to another staff member, CaseBox hides the
                  record ID to protect ownership boundaries.
                </p>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 font-mono text-xs text-zinc-600">
                  409 DUPLICATE_INQUIRY · meta.canViewExisting = true | false
                </div>
              </div>
            </div>

            {/* Bottom 3-column row */}
            <div
              id="security"
              className="grid divide-y divide-zinc-200 md:grid-cols-3 md:divide-x md:divide-y-0"
            >
              <div className="space-y-2 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                  <LockIcon className="size-4 text-blue-600" />
                  <span>Optimistic Concurrency</span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-600">
                  Updates include <code className="font-mono text-xs text-zinc-900">updatedAt</code>{" "}
                  so stale browser tabs receive a clean reload prompt instead of clobbering changes.
                </p>
              </div>

              <div className="space-y-2 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                  <UsersIcon className="size-4 text-teal-600" />
                  <span>Scoped Ownership & Admin Triage</span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-600">
                  Staff only access cases they created or were assigned to; admins assign ownership
                  and provision accounts from{" "}
                  <code className="font-mono text-xs text-zinc-900">/team</code>.
                </p>
              </div>

              <div className="space-y-2 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                  <ShieldCheckIcon className="size-4 text-blue-600" />
                  <span>Rotating Cookie Sessions</span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-600">
                  15-minute JWTs and SHA-256 hashed refresh tokens live in{" "}
                  <code className="font-mono text-xs text-zinc-900">HttpOnly</code> cookies with
                  token-family reuse detection.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quiet Bottom CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
                Ready to triage customer inquiries?
              </h2>
              <p className="text-sm text-zinc-600">
                Sign in with your administrator-provisioned CaseBox account.
              </p>
            </div>
            <Link href={primaryHref} className={cn(buttonVariants({ size: "lg" }), "shrink-0 px-5")}>
              {primaryLabel}
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6">
          <BrandLogo size={24} labelClassName="text-base" />
          <p className="text-xs text-zinc-500">
            <span className="font-semibold">
              <span className="text-slate-900">Case</span>
              <span className="text-blue-600">Box</span>
            </span>{" "}
            • Customer Inquiry Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
