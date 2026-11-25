"use client";

export default function GlobalErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background p-6 font-sans text-foreground">
        <div className="max-w-md space-y-4 rounded-xl border p-6 text-center">
          <h1 className="text-lg font-semibold">Application Error</h1>
          <p className="text-sm text-muted-foreground">
            Something went wrong. Please reload the page to continue.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
