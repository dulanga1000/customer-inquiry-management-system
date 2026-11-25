import Image from "next/image";
import Link from "next/link";
import { cn } from "cn";

interface BrandLogoProps {
  size?: number;
  href?: string | null;
  showLabel?: boolean;
  className?: string;
  labelClassName?: string;
}

export function BrandLogo({
  size = 32,
  href = "/",
  showLabel = true,
  className,
  labelClassName,
}: BrandLogoProps) {
  const content = (
    <>
      <Image
        alt="CaseBox Logo"
        className="shrink-0 rounded-md object-cover"
        height={size}
        priority
        src="/logo.jpg"
        unoptimized
        width={size}
      />
      {showLabel ? (
        <span className={cn("text-xl font-bold tracking-tight", labelClassName)}>
          <span className="text-slate-900 dark:text-zinc-50">Case</span>
          <span className="text-blue-600">Box</span>
        </span>
      ) : null}
    </>
  );

  if (href === null) {
    return <span className={cn("inline-flex items-center gap-2", className)}>{content}</span>;
  }

  return (
    <Link
      className={cn(
        "inline-flex items-center gap-2 transition-opacity hover:opacity-90 focus-visible:outline-none",
        className,
      )}
      href={href}
    >
      {content}
    </Link>
  );
}
