"use client";

import { useEffect } from "react";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { Button } from "@/components/ui/button";

export default function AppErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void error;
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-4 px-4">
      <ErrorBanner
        title="Something went wrong"
        message="An unexpected error occurred while rendering this view."
        requestId={error.digest}
      />
      <div>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
