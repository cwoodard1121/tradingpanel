type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export interface SkeletonProps {
  className?: string;
}

/**
 * Skeleton — a pulsing placeholder block for loading states. Defaults to a
 * single full-width line; pass sizing via `className`.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-lg bg-bg-elevated",
        className ?? "h-4 w-full",
      )}
    />
  );
}
