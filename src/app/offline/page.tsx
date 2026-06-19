import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline — BTC Risk & Journal",
};

// Static offline fallback served by the service worker when a navigation
// fails. Server component, no client-only APIs, fully prerendered.
export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft ring-1 ring-inset ring-brand/30">
        <svg
          viewBox="0 0 24 24"
          className="h-9 w-9 text-brand"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M14.24 10.56c.34-1.4-.72-2.15-2.17-2.65l.47-1.88-1.15-.29-.46 1.83c-.3-.07-.61-.15-.92-.22l.46-1.85-1.14-.28-.47 1.88c-.25-.06-.49-.11-.73-.17v-.01l-1.58-.4-.3 1.22s.85.2.83.21c.46.12.55.42.53.67l-.53 2.14c.03.01.07.02.12.04l-.12-.03-.75 3c-.06.14-.2.35-.52.27.01.02-.83-.21-.83-.21l-.57 1.31 1.49.37c.28.07.55.14.82.21l-.48 1.9 1.14.29.47-1.88c.31.08.62.16.92.24l-.47 1.87 1.15.29.48-1.9c1.96.37 3.43.22 4.05-1.55.5-1.43-.02-2.25-1.06-2.79.76-.17 1.33-.67 1.48-1.7zm-2.65 3.69c-.35 1.43-2.76.66-3.54.46l.63-2.52c.78.2 3.29.58 2.91 2.06zm.36-3.71c-.32 1.3-2.33.64-2.98.48l.57-2.29c.65.16 2.75.47 2.41 1.81z" />
        </svg>
      </span>

      <h1 className="mt-6 text-lg font-semibold tracking-tight text-content-primary">
        You&rsquo;re offline
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-content-secondary">
        No network connection right now. BTC Risk &amp; Journal will reconnect
        and refresh automatically as soon as you&rsquo;re back online.
      </p>
      <p className="mt-4 text-xs text-content-muted">
        Your locally saved data is safe on this device.
      </p>
    </div>
  );
}
