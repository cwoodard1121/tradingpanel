import { Suspense } from "react";
import { JournalView } from "@/components/journal/JournalView";
import { JournalSkeleton } from "@/components/journal/JournalSkeleton";

// The journal reads useSearchParams (for the calculator prefill deep link),
// so the client view must live inside a Suspense boundary for `next build`.
export default function JournalPage() {
  return (
    <Suspense fallback={<JournalSkeleton />}>
      <JournalView />
    </Suspense>
  );
}
