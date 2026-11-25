import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState({
  variant = "table",
}: {
  variant?: "table" | "detail" | "page";
}) {
  if (variant === "page") {
    return (
      <div className="flex min-h-screen bg-background">
        <aside className="hidden w-60 border-r border-zinc-200 bg-white p-4 lg:block">
          <Skeleton className="h-8 w-36" />
          <div className="mt-8 space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </aside>
        <div className="flex flex-1 flex-col">
          <div className="h-16 border-b border-zinc-200 bg-white px-6 py-4">
            <Skeleton className="h-7 w-48" />
          </div>
          <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card className="border border-zinc-200 bg-white ring-0">
            <CardHeader className="space-y-2 border-b border-zinc-100">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Skeleton className="h-28 w-full" />
            </CardContent>
          </Card>
          <Card className="border border-zinc-200 bg-white ring-0">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-4">
          <Card className="border border-zinc-200 bg-white ring-0">
            <CardHeader className="border-b border-zinc-100">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <Card className="border border-zinc-200 bg-white ring-0">
      <CardContent className="space-y-3 pt-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </CardContent>
    </Card>
  );
}
