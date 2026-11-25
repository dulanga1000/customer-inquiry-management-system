import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <Card className="py-10 text-center">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="mx-auto max-w-md">{description}</CardDescription>
      </CardHeader>
      {actionLabel && (actionHref || onAction) ? (
        <CardContent className="flex justify-center">
          {actionHref ? (
            <Link href={actionHref} className={buttonVariants()}>
              {actionLabel}
            </Link>
          ) : (
            <Button type="button" variant="outline" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}
