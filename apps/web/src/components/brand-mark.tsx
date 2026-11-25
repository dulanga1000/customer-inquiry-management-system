import { BrandLogo } from "@/components/brand-logo";

interface BrandMarkProps {
  size?: number;
  showLabel?: boolean;
  className?: string;
}

export function BrandMark({ size = 32, showLabel = true, className }: BrandMarkProps) {
  return (
    <BrandLogo
      size={size}
      href={null}
      showLabel={showLabel}
      className={className}
      labelClassName="text-lg"
    />
  );
}
