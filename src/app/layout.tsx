import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DataProvider } from "@/components/providers/DataProvider";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "BTC Risk & Journal",
  description:
    "Personal Bitcoin trading toolkit — risk/position-size calculator, trade journal & prop-firm analytics for BTC day trading.",
  applicationName: "BTC Risk & Journal",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0e14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <DataProvider>
          <div className="min-h-screen">
            {/* Sticky top bar: brand wordmark + desktop nav + backend status.
                On mobile this carries the wordmark + status; navigation moves
                to the fixed bottom tab bar rendered inside <Nav/>. */}
            <header className="sticky top-0 z-40 border-b border-border-subtle bg-bg-base/80 backdrop-blur-md supports-[backdrop-filter]:bg-bg-base/70">
              <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:h-16">
                <a
                  href="/"
                  className="group flex shrink-0 items-center gap-2.5"
                  aria-label="BTC Risk & Journal — home"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft ring-1 ring-inset ring-brand/30 transition-colors group-hover:bg-brand/20">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-[18px] w-[18px] text-brand"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M14.24 10.56c.34-1.4-.72-2.15-2.17-2.65l.47-1.88-1.15-.29-.46 1.83c-.3-.07-.61-.15-.92-.22l.46-1.85-1.14-.28-.47 1.88c-.25-.06-.49-.11-.73-.17v-.01l-1.58-.4-.3 1.22s.85.2.83.21c.46.12.55.42.53.67l-.53 2.14c.03.01.07.02.12.04l-.12-.03-.75 3c-.06.14-.2.35-.52.27.01.02-.83-.21-.83-.21l-.57 1.31 1.49.37c.28.07.55.14.82.21l-.48 1.9 1.14.29.47-1.88c.31.08.62.16.92.24l-.47 1.87 1.15.29.48-1.9c1.96.37 3.43.22 4.05-1.55.5-1.43-.02-2.25-1.06-2.79.76-.17 1.33-.67 1.48-1.7zm-2.65 3.69c-.35 1.43-2.76.66-3.54.46l.63-2.52c.78.2 3.29.58 2.91 2.06zm.36-3.71c-.32 1.3-2.33.64-2.98.48l.57-2.29c.65.16 2.75.47 2.41 1.81z" />
                    </svg>
                  </span>
                  <span className="flex flex-col leading-none">
                    <span className="text-[13px] font-semibold tracking-tight text-content-primary sm:text-sm">
                      BTC Risk
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-content-muted">
                      &amp; Journal
                    </span>
                  </span>
                </a>

                {/* Desktop links + backend badge live here (client). */}
                <Nav />
              </div>
            </header>

            {/* Centered content column. Bottom padding clears the mobile tab
                bar; restored to normal on md+ where the tab bar is hidden. */}
            <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:pt-6 md:pb-12">
              {children}
            </main>
          </div>
        </DataProvider>
      </body>
    </html>
  );
}
