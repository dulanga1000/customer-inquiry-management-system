"use client";

import * as React from "react";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  CheckCircle2Icon,
  CheckIcon,
  CircleDotIcon,
  Clock3Icon,
  HistoryIcon,
  InboxIcon,
  LogOutIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PhoneIcon,
  PlusCircleIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  ShieldIcon,
  UserCheckIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import type { InquiryStatus } from "@cims/shared";
import { BrandLogo } from "@/components/brand-logo";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getInitials } from "@/lib/formatters";
import { cn } from "cn";

type PreviewTab = "queue" | "detail" | "team";
type QueueFilter = "all" | InquiryStatus;

const PREVIEW_TABS: ReadonlyArray<{ id: PreviewTab; label: string; route: string }> = [
  { id: "queue", label: "Inquiry Queue", route: "inquiries" },
  { id: "detail", label: "Case Details", route: "inquiries/1041" },
  { id: "team", label: "Team & Access", route: "team" },
];

const SAMPLE_QUEUE = [
  {
    id: 1042,
    subject: "Duplicate shipping charge on order #8821",
    customer: "Dilani Jayawardena",
    contact: "dilani@example.lk",
    status: "new" as const,
    assignee: null,
    updatedAt: "12m ago",
  },
  {
    id: 1041,
    subject: "VAT invoice PDF correction request",
    customer: "Kasun Fernando",
    contact: "+94 77 412 8890",
    status: "in_progress" as const,
    assignee: "Staff One",
    updatedAt: "45m ago",
  },
  {
    id: 1039,
    subject: "Account contact phone number update",
    customer: "Ruwan Silva",
    contact: "ruwan@coffee.lk",
    status: "resolved" as const,
    assignee: "Staff Two",
    updatedAt: "1d ago",
  },
  {
    id: 1036,
    subject: "Wholesale espresso bean delivery schedule",
    customer: "Malith Perera",
    contact: "malith@roasters.lk",
    status: "in_progress" as const,
    assignee: "Staff One",
    updatedAt: "3d ago",
  },
] as const;

const SAMPLE_TEAM = [
  { id: 1, name: "Admin User", email: "admin@cims.local", role: "Admin" as const, joined: "14d ago" },
  { id: 2, name: "Staff One", email: "staff1@cims.local", role: "Staff" as const, joined: "10d ago" },
  { id: 3, name: "Staff Two", email: "staff2@cims.local", role: "Staff" as const, joined: "6d ago" },
] as const;

export function WorkspacePreview() {
  const [activeTab, setActiveTab] = React.useState<PreviewTab>("queue");
  const [queueFilter, setQueueFilter] = React.useState<QueueFilter>("all");
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const currentTabMeta = PREVIEW_TABS.find((tab) => tab.id === activeTab) ?? PREVIEW_TABS[0];

  const filteredQueue =
    queueFilter === "all"
      ? SAMPLE_QUEUE
      : SAMPLE_QUEUE.filter((row) => row.status === queueFilter);

  const newCount = SAMPLE_QUEUE.filter((item) => item.status === "new").length;
  const inProgressCount = SAMPLE_QUEUE.filter((item) => item.status === "in_progress").length;
  const resolvedCount = SAMPLE_QUEUE.filter((item) => item.status === "resolved").length;
  const resolutionRate = Math.round((resolvedCount / SAMPLE_QUEUE.length) * 100);

  return (
    <div id="preview" className="mx-auto mt-12 max-w-6xl">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {/* Top Browser / Preview Switcher Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50/80 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-zinc-300" />
              <span className="size-2.5 rounded-full bg-zinc-300" />
              <span className="size-2.5 rounded-full bg-zinc-300" />
            </span>
            <span className="ml-1 font-mono text-[11px] text-zinc-500">
              casebox.app/{currentTabMeta.route}
            </span>
          </div>

          <div
            role="tablist"
            aria-label="Product preview views"
            className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5"
          >
            {PREVIEW_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-blue-700 text-white"
                    : "text-zinc-600 hover:text-zinc-950",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Mirror of the Actual Workspace Shell */}
        <div className="flex min-h-[470px] bg-background text-left">
          {/* Collapsible Preview Sidebar */}
          <aside
            className={cn(
              "hidden shrink-0 flex-col justify-between border-r border-zinc-200 bg-white transition-[width] duration-200 md:flex",
              sidebarCollapsed ? "w-14" : "w-52",
            )}
          >
            <div>
              <div
                className={cn(
                  "flex h-12 items-center border-b border-zinc-200",
                  sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5",
                )}
              >
                <BrandLogo
                  size={22}
                  href={null}
                  showLabel={!sidebarCollapsed}
                  labelClassName="text-sm"
                />
                {!sidebarCollapsed ? (
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed(true)}
                    aria-label="Collapse preview sidebar"
                    className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    <PanelLeftCloseIcon className="size-3.5" />
                  </button>
                ) : null}
              </div>

              <div className={cn("space-y-4", sidebarCollapsed ? "p-2" : "p-3")}>
                <div className="space-y-1">
                  {!sidebarCollapsed ? (
                    <p className="px-2 font-mono text-[10px] font-medium tracking-wider text-zinc-400 uppercase">
                      Workspace
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setActiveTab("queue")}
                    className={cn(
                      "flex w-full items-center rounded-lg text-xs transition-colors",
                      sidebarCollapsed
                        ? "mx-auto size-9 justify-center"
                        : "justify-between px-2 py-1.5",
                      activeTab === "queue" || activeTab === "detail"
                        ? "bg-blue-50 font-medium text-blue-700"
                        : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-950",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <InboxIcon className="size-3.5 shrink-0" />
                      {!sidebarCollapsed ? <span>Inquiries</span> : null}
                    </span>
                    {!sidebarCollapsed ? (
                      <span className="rounded-full bg-blue-100/80 px-1.5 py-0.5 font-mono text-[10px] text-blue-700 tabular-nums">
                        {SAMPLE_QUEUE.length}
                      </span>
                    ) : null}
                  </button>

                  <div
                    className={cn(
                      "flex items-center rounded-lg text-xs text-zinc-600",
                      sidebarCollapsed ? "mx-auto size-9 justify-center" : "gap-2 px-2 py-1.5",
                    )}
                  >
                    <PlusCircleIcon className="size-3.5 shrink-0 text-zinc-400" />
                    {!sidebarCollapsed ? <span>New Inquiry</span> : null}
                  </div>
                </div>

                <div className="space-y-1">
                  {!sidebarCollapsed ? (
                    <p className="px-2 font-mono text-[10px] font-medium tracking-wider text-zinc-400 uppercase">
                      Administration
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setActiveTab("team")}
                    className={cn(
                      "flex w-full items-center rounded-lg text-xs transition-colors",
                      sidebarCollapsed
                        ? "mx-auto size-9 justify-center"
                        : "justify-between px-2 py-1.5",
                      activeTab === "team"
                        ? "bg-blue-50 font-medium text-blue-700"
                        : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-950",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <UsersIcon className="size-3.5 shrink-0" />
                      {!sidebarCollapsed ? <span>Team</span> : null}
                    </span>
                    {!sidebarCollapsed ? (
                      <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 tabular-nums">
                        {SAMPLE_TEAM.length}
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>
            </div>

            <div className={cn("border-t border-zinc-200", sidebarCollapsed ? "p-2" : "p-3")}>
              {sidebarCollapsed ? (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-blue-700 text-[10px] font-semibold text-white">
                    AU
                  </div>
                  <div className="flex size-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500">
                    <LogOutIcon className="size-3.5" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/70 p-2">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-[10px] font-semibold text-white">
                      AU
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-medium text-zinc-950">
                          Admin User
                        </span>
                        <Badge
                          variant="outline"
                          className="border-blue-600/25 bg-blue-50 px-1 py-0 text-[9px] text-blue-700"
                        >
                          Admin
                        </Badge>
                      </div>
                      <p className="truncate text-[10px] text-zinc-500">admin@cims.local</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white py-1 text-[11px] font-medium text-zinc-700">
                    <LogOutIcon className="size-3" />
                    <span>Sign out</span>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Right Main Workspace Area */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Top Utility Header */}
            <div className="flex h-12 items-center justify-between border-b border-zinc-200 bg-white px-4 sm:px-5">
              <div className="flex items-center gap-2.5">
                {sidebarCollapsed ? (
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed(false)}
                    aria-label="Expand preview sidebar"
                    className="hidden rounded border border-zinc-200 p-1 text-zinc-500 transition-colors hover:text-zinc-950 md:inline-flex"
                  >
                    <PanelLeftOpenIcon className="size-3.5" />
                  </button>
                ) : null}
                <span className="text-xs font-semibold text-zinc-950">
                  {activeTab === "queue"
                    ? "Operations Dashboard"
                    : activeTab === "detail"
                      ? "Case Details"
                      : "Team & Access"}
                </span>
                <span className="text-zinc-300" aria-hidden="true">
                  /
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                  <ShieldIcon className="size-3 text-blue-600" />
                  Admin
                </span>
              </div>
              <span className="font-mono text-[10px] text-zinc-400">Interactive preview</span>
            </div>

            {/* Tab 1: Operations Dashboard / Inquiry Queue */}
            {activeTab === "queue" ? (
              <div className="space-y-4 p-4 sm:p-5">
                {/* Header Card */}
                <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-[10px] font-medium tracking-wider text-teal-700 uppercase">
                      Workspace Overview
                    </p>
                    <p className="text-base font-semibold tracking-tight text-zinc-950">
                      Operations Dashboard
                    </p>
                    <p className="text-xs text-zinc-600">
                      Monitor incoming inquiries, assign team owners, and track resolution progress.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("team")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      <UsersIcon className="size-3.5" />
                      Team ({SAMPLE_TEAM.length})
                    </button>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-2.5 py-1.5 text-xs font-medium text-white">
                      <PlusIcon className="size-3.5" />
                      New Inquiry
                    </span>
                  </div>
                </div>

                {/* 4 KPI Cards */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    {
                      id: "all" as const,
                      label: "Total Inquiries",
                      value: SAMPLE_QUEUE.length,
                      hint: "All workspace cases",
                      icon: InboxIcon,
                      iconBg: "bg-zinc-100",
                      iconColor: "text-zinc-700",
                      activeBorder: "border-zinc-900 ring-1 ring-zinc-900/10",
                    },
                    {
                      id: "new" as const,
                      label: "New Queue",
                      value: newCount,
                      hint: "Awaiting initial triage",
                      icon: CircleDotIcon,
                      iconBg: "bg-blue-50",
                      iconColor: "text-blue-700",
                      activeBorder: "border-blue-600 ring-1 ring-blue-600/15",
                    },
                    {
                      id: "in_progress" as const,
                      label: "In Progress",
                      value: inProgressCount,
                      hint: "Currently under review",
                      icon: Clock3Icon,
                      iconBg: "bg-amber-50",
                      iconColor: "text-amber-700",
                      activeBorder: "border-amber-600 ring-1 ring-amber-600/15",
                    },
                    {
                      id: "resolved" as const,
                      label: "Resolved",
                      value: resolvedCount,
                      hint: `${resolutionRate}% resolution rate`,
                      icon: CheckCircle2Icon,
                      iconBg: "bg-teal-50",
                      iconColor: "text-teal-700",
                      activeBorder: "border-teal-600 ring-1 ring-teal-600/15",
                    },
                  ].map((kpi) => {
                    const Icon = kpi.icon;
                    const active = queueFilter === kpi.id;
                    return (
                      <button
                        key={kpi.id}
                        type="button"
                        onClick={() => setQueueFilter(kpi.id)}
                        className={cn(
                          "rounded-xl border border-zinc-200 bg-white p-3.5 text-left transition-colors hover:border-zinc-300",
                          active ? kpi.activeBorder : null,
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-medium text-zinc-500">{kpi.label}</p>
                            <p className="mt-0.5 text-lg font-semibold text-zinc-950 tabular-nums">
                              {kpi.value}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "flex size-7 items-center justify-center rounded-lg",
                              kpi.iconBg,
                            )}
                          >
                            <Icon className={cn("size-3.5", kpi.iconColor)} />
                          </span>
                        </div>
                        <p className="mt-1.5 text-[10px] text-zinc-500">{kpi.hint}</p>
                        {kpi.id === "resolved" ? (
                          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-teal-600"
                              style={{ width: `${resolutionRate}%` }}
                            />
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {/* Segmented Filter Bar */}
                <div className="flex flex-col gap-2.5 rounded-xl border border-zinc-200 bg-white p-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50/80 p-0.5">
                    {(
                      [
                        { id: "all", label: "All", count: SAMPLE_QUEUE.length },
                        { id: "new", label: "New", count: newCount },
                        { id: "in_progress", label: "In Progress", count: inProgressCount },
                        { id: "resolved", label: "Resolved", count: resolvedCount },
                      ] as const
                    ).map((tab) => {
                      const selected = queueFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setQueueFilter(tab.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                            selected
                              ? "bg-white text-zinc-950 shadow-xs ring-1 ring-zinc-200"
                              : "text-zinc-600 hover:text-zinc-950",
                          )}
                        >
                          <span>{tab.label}</span>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
                              selected ? "bg-blue-50 text-blue-700" : "bg-zinc-200/70 text-zinc-600",
                            )}
                          >
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] text-zinc-400 sm:w-64">
                    <SearchIcon className="size-3.5" />
                    <span className="truncate">Search customer, contact, or subject...</span>
                  </div>
                </div>

                {/* Queue Table */}
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-200 bg-zinc-50/70 hover:bg-zinc-50/70">
                        <TableHead className="w-16 text-[11px] text-zinc-500">Case</TableHead>
                        <TableHead className="text-[11px] text-zinc-500">Subject</TableHead>
                        <TableHead className="hidden text-[11px] text-zinc-500 sm:table-cell">
                          Customer
                        </TableHead>
                        <TableHead className="text-[11px] text-zinc-500">Status</TableHead>
                        <TableHead className="hidden text-[11px] text-zinc-500 lg:table-cell">
                          Assignee
                        </TableHead>
                        <TableHead className="text-right text-[11px] text-zinc-500">
                          Updated
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQueue.map((row) => (
                        <TableRow
                          key={row.id}
                          onClick={() => setActiveTab("detail")}
                          className="cursor-pointer border-zinc-200 hover:bg-zinc-50/80"
                        >
                          <TableCell className="font-mono text-xs text-zinc-500 tabular-nums">
                            #{row.id}
                          </TableCell>
                          <TableCell className="max-w-[210px] truncate text-xs font-medium text-zinc-950">
                            {row.subject}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-[10px] font-medium text-zinc-700">
                                {getInitials(row.customer)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-zinc-950">
                                  {row.customer}
                                </p>
                                <p className="truncate text-[10px] text-zinc-500">{row.contact}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={row.status} />
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {row.assignee ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-zinc-700">
                                <span className="flex size-5 items-center justify-center rounded-full bg-zinc-100 text-[9px] font-semibold text-zinc-700">
                                  {getInitials(row.assignee)}
                                </span>
                                {row.assignee}
                              </span>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-amber-600/25 bg-amber-50/70 text-[10px] font-normal text-amber-800"
                              >
                                Unassigned
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-[11px] text-zinc-500 tabular-nums">
                            <span className="inline-flex items-center gap-1">
                              {row.updatedAt}
                              <ArrowUpRightIcon className="size-3 text-zinc-400" />
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}

            {/* Tab 2: Two-Column Case Details & Vertical Timeline */}
            {activeTab === "detail" ? (
              <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-12">
                <div className="space-y-4 lg:col-span-8">
                  <div className="rounded-xl border border-zinc-200 bg-white">
                    <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-zinc-600">
                            #1041
                          </span>
                          <StatusBadge status="in_progress" />
                          <span className="text-[11px] text-zinc-400">Updated 45m ago</span>
                        </div>
                        <p className="text-base font-semibold text-zinc-950">
                          VAT invoice PDF correction request
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Logged by <strong className="text-zinc-900">Staff One</strong>{" "}
                          (staff1@cims.local)
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white">
                        <CheckCircle2Icon className="size-3.5" />
                        Mark Resolved
                      </span>
                    </div>

                    <div className="space-y-1.5 p-4">
                      <p className="font-mono text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
                        Customer Request Details
                      </p>
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 text-xs leading-relaxed text-zinc-800">
                        Customer requested an updated VAT tax invoice reflecting the corrected
                        billing address before month-end reconciliation.
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-950">
                        <HistoryIcon className="size-3.5 text-zinc-500" />
                        Status History
                      </span>
                      <span className="font-mono text-[11px] text-zinc-500">1 update</span>
                    </div>
                    <div className="relative ml-2 border-l border-zinc-200 pl-4">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[5px] top-2 size-2.5 rounded-full bg-blue-700 ring-4 ring-white"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status="new" />
                          <ArrowRightIcon className="size-3 text-zinc-400" />
                          <StatusBadge status="in_progress" />
                        </div>
                        <span className="text-[11px] text-zinc-500">
                          <strong className="text-zinc-900">Staff One</strong> · 45m ago
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 lg:col-span-4">
                  <div className="rounded-xl border border-zinc-200 bg-white p-4">
                    <p className="mb-3 border-b border-zinc-100 pb-2 text-xs font-semibold text-zinc-950">
                      Workflow Stage
                    </p>
                    <ol className="space-y-2 text-xs">
                      <li className="flex items-center gap-2 text-zinc-500">
                        <span className="flex size-5 items-center justify-center rounded-full border border-teal-600/30 bg-teal-50 text-teal-700">
                          <CheckIcon className="size-3" />
                        </span>
                        <span>New</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-medium text-zinc-950">
                          <span className="flex size-5 items-center justify-center rounded-full bg-blue-700 text-[10px] font-semibold text-white">
                            2
                          </span>
                          <span>In Progress</span>
                        </span>
                        <span className="font-mono text-[10px] font-medium text-blue-700">
                          Current
                        </span>
                      </li>
                      <li className="flex items-center gap-2 text-zinc-500">
                        <span className="flex size-5 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-[10px]">
                          3
                        </span>
                        <span>Resolved</span>
                      </li>
                    </ol>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-white p-4">
                    <p className="mb-3 border-b border-zinc-100 pb-2 text-xs font-semibold text-zinc-950">
                      Case Properties
                    </p>
                    <div className="space-y-3 text-xs">
                      <div>
                        <p className="mb-1 text-[11px] text-zinc-500">Assigned To</p>
                        <div className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-zinc-900">
                          Staff One (staff1@cims.local)
                        </div>
                      </div>
                      <div className="flex items-center gap-2 border-t border-zinc-100 pt-2.5">
                        <span className="flex size-6 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-[10px] font-medium text-zinc-700">
                          KF
                        </span>
                        <div>
                          <p className="font-medium text-zinc-950">Kasun Fernando</p>
                          <p className="flex items-center gap-1 text-[10px] text-zinc-500">
                            <PhoneIcon className="size-2.5" />
                            +94 77 412 8890
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-zinc-100 pt-2.5 text-[11px]">
                        <span className="flex items-center gap-1 text-zinc-500">
                          <CalendarIcon className="size-3" />
                          Updated
                        </span>
                        <span className="text-zinc-700 tabular-nums">Today, 09:42</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Tab 3: Admin Team & Access */}
            {activeTab === "team" ? (
              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-[10px] font-medium tracking-wider text-blue-700 uppercase">
                      Administration
                    </p>
                    <p className="text-base font-semibold text-zinc-950">Team &amp; Access</p>
                    <p className="text-xs text-zinc-600">
                      Manage provisioned staff accounts, review access roles, and onboard team
                      members.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-2.5 py-1.5 text-xs font-medium text-white">
                    <UserPlusIcon className="size-3.5" />
                    Create Staff Account
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-medium text-zinc-500">Total Members</p>
                        <p className="text-lg font-semibold text-zinc-950 tabular-nums">3</p>
                      </div>
                      <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-100">
                        <UsersIcon className="size-3.5 text-zinc-700" />
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-500">Provisioned workspace accounts</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-medium text-zinc-500">Administrators</p>
                        <p className="text-lg font-semibold text-zinc-950 tabular-nums">1</p>
                      </div>
                      <span className="flex size-7 items-center justify-center rounded-lg bg-blue-50">
                        <ShieldCheckIcon className="size-3.5 text-blue-700" />
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-500">Full queue &amp; team management</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-medium text-zinc-500">Support Staff</p>
                        <p className="text-lg font-semibold text-zinc-950 tabular-nums">2</p>
                      </div>
                      <span className="flex size-7 items-center justify-center rounded-lg bg-teal-50">
                        <UserCheckIcon className="size-3.5 text-teal-700" />
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-500">
                      Assigned &amp; created inquiry access
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-200 bg-zinc-50/70 hover:bg-zinc-50/70">
                        <TableHead className="w-16 text-[11px] text-zinc-500">ID</TableHead>
                        <TableHead className="text-[11px] text-zinc-500">Member</TableHead>
                        <TableHead className="hidden text-[11px] text-zinc-500 sm:table-cell">
                          Email
                        </TableHead>
                        <TableHead className="text-[11px] text-zinc-500">Role</TableHead>
                        <TableHead className="text-right text-[11px] text-zinc-500">
                          Provisioned
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SAMPLE_TEAM.map((member) => (
                        <TableRow key={member.id} className="border-zinc-200 hover:bg-zinc-50/70">
                          <TableCell className="font-mono text-xs text-zinc-500">
                            #{member.id}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "flex size-6 items-center justify-center rounded-full text-[10px] font-semibold",
                                  member.role === "Admin"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-teal-50 text-teal-700",
                                )}
                              >
                                {getInitials(member.name)}
                              </span>
                              <span className="text-xs font-medium text-zinc-950">
                                {member.name}
                                {member.id === 1 ? (
                                  <span className="ml-1 font-normal text-zinc-500">(You)</span>
                                ) : null}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden text-xs text-zinc-600 sm:table-cell">
                            {member.email}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                member.role === "Admin"
                                  ? "border-blue-600/25 bg-blue-50 text-[10px] text-blue-700"
                                  : "border-teal-600/25 bg-teal-50 text-[10px] text-teal-700"
                              }
                            >
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-[11px] text-zinc-500 tabular-nums">
                            {member.joined}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
