import { cn } from '@/lib/utils';

interface BrandWordmarkProps {
  className?: string;
}

/**
 * Two-tone "RentStar" wordmark used in the navbar, footer and any branded surface.
 * Style is purely typographic so it inherits sizing from the parent.
 */
export function BrandWordmark({ className }: BrandWordmarkProps): React.JSX.Element {
  return (
    <span className={cn('font-bold leading-none', className)}>
      <span className="text-primary">Rent</span>
      <span className="text-foreground">Star</span>
    </span>
  );
}
