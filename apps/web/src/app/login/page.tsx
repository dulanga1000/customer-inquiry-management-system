import { BrandLogo } from "@/components/brand-logo";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LoginForm } from "@/features/auth/components/LoginForm";

const SAMPLE_QUEUE = [
  {
    id: "INQ-1042",
    subject: "Invoice copy for April billing cycle",
    requester: "Malith Perera",
    timeAgo: "12m ago",
    status: "new" as const,
  },
  {
    id: "INQ-1039",
    subject: "Additional team seat request",
    requester: "Kavindi Silva",
    timeAgo: "1h ago",
    status: "in_progress" as const,
  },
  {
    id: "INQ-1034",
    subject: "Order delivery schedule confirmation",
    requester: "Ruwan Fernando",
    timeAgo: "3h ago",
    status: "resolved" as const,
  },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-12">
      {/* Left Brand & Workspace Preview Panel */}
      <aside className="relative hidden flex-col justify-between border-r border-zinc-200 bg-white p-10 lg:col-span-5 lg:flex xl:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] [background-size:20px_20px] opacity-55 [mask-image:radial-gradient(ellipse_80%_60%_at_30%_20%,#000_50%,transparent_100%)]"
        />

        <div className="relative">
          <BrandLogo size={32} />
        </div>

        <div className="relative space-y-7">
          <div className="space-y-3">
            <p className="font-mono text-xs font-medium tracking-wider text-teal-700 uppercase">
              Support Desk
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Every customer inquiry, handled with clarity.
            </h2>
            <p className="text-sm leading-relaxed text-zinc-600">
              Sign in to review open requests, coordinate follow-ups with your team, and keep
              customers updated from first reply to resolution.
            </p>
          </div>

          <div
            aria-hidden="true"
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-4 py-2.5">
              <span className="text-xs font-medium text-zinc-700">Team Inbox</span>
              <span className="font-mono text-[11px] text-zinc-500">Active queue</span>
            </div>
            <div className="divide-y divide-zinc-100">
              {SAMPLE_QUEUE.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium text-zinc-900">{item.subject}</p>
                    <p className="truncate text-xs text-zinc-500">
                      <span className="font-mono text-[11px] text-zinc-400">{item.id}</span>
                      {" \u00B7 "}
                      {item.requester}
                      {" \u00B7 "}
                      {item.timeAgo}
                    </p>
                  </div>
                  <StatusBadge status={item.status} className="shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="relative text-xs text-zinc-500">
          <span className="font-semibold">
            <span className="text-slate-900">Case</span>
            <span className="text-blue-600">Box</span>
          </span>{" "}
          • Customer Inquiry Management System
        </p>
      </aside>

      {/* Right Sign-In Panel */}
      <main className="flex items-center justify-center px-4 py-12 sm:px-6 lg:col-span-7">
        <LoginForm />
      </main>
    </div>
  );
}
