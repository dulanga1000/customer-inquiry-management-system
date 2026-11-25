import { EmptyState } from "@/components/common/EmptyState";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4">
      <EmptyState
        title="Page not found"
        description="The page you requested does not exist."
        actionLabel="Go to inquiries"
        actionHref="/inquiries"
      />
    </main>
  );
}
