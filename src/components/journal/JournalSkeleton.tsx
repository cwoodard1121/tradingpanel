import { Skeleton } from "@/components/ui/Skeleton";

/**
 * JournalSkeleton — the Suspense fallback shown on the server and while the
 * search params resolve on the client. Mirrors the real layout so the page
 * does not jump when content arrives.
 */
export function JournalSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-40" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-subtle bg-bg-surface p-4 shadow-card sm:p-5"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-7 w-24" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-card">
          <Skeleton className="h-5 w-32" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-card"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-4 h-8 w-32" />
              <Skeleton className="mt-4 h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
