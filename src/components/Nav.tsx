"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useData } from "@/components/providers/DataProvider";
import { Tooltip } from "@/components/ui/Tooltip";

// ---------------------------------------------------------------------
//  Inline icons (stroke, currentColor) — consistent 1.7px weight.
// ---------------------------------------------------------------------
type IconProps = { className?: string };

function iconBase(className?: string) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: className ?? "h-5 w-5",
    "aria-hidden": true,
  };
}

function CalculatorIcon({ className }: IconProps) {
  return (
    <svg {...iconBase(className)}>
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11.5" x2="8.01" y2="11.5" />
      <line x1="12" y1="11.5" x2="12.01" y2="11.5" />
      <line x1="16" y1="11.5" x2="16.01" y2="11.5" />
      <line x1="8" y1="15" x2="8.01" y2="15" />
      <line x1="12" y1="15" x2="12.01" y2="15" />
      <line x1="16" y1="15" x2="16" y2="17.5" />
      <line x1="8" y1="17.5" x2="12" y2="17.5" />
    </svg>
  );
}

function JournalIcon({ className }: IconProps) {
  return (
    <svg {...iconBase(className)}>
      <path d="M6.5 3H18a1 1 0 0 1 1 1v15.5a.5.5 0 0 1-.5.5H6.5A1.5 1.5 0 0 1 5 18.5v-14A1.5 1.5 0 0 1 6.5 3Z" />
      <path d="M5 18.5A1.5 1.5 0 0 1 6.5 17H19" />
      <line x1="9" y1="7.5" x2="15" y2="7.5" />
      <line x1="9" y1="10.5" x2="13" y2="10.5" />
    </svg>
  );
}

function AnalyticsIcon({ className }: IconProps) {
  return (
    <svg {...iconBase(className)}>
      <path d="M4 19h16" />
      <rect x="5.5" y="12" width="3" height="5" rx="1" />
      <rect x="10.5" y="8" width="3" height="9" rx="1" />
      <rect x="15.5" y="5" width="3" height="12" rx="1" />
    </svg>
  );
}

function SavingsIcon({ className }: IconProps) {
  return (
    <svg {...iconBase(className)}>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v5c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
      <path d="M5 11v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" />
    </svg>
  );
}

function SettingsIcon({ className }: IconProps) {
  return (
    <svg {...iconBase(className)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

type NavItem = {
  href: string;
  label: string;
  Icon: (p: IconProps) => JSX.Element;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Calculator", Icon: CalculatorIcon },
  { href: "/journal", label: "Journal", Icon: JournalIcon },
  { href: "/analytics", label: "Analytics", Icon: AnalyticsIcon },
  { href: "/savings", label: "Savings", Icon: SavingsIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ---------------------------------------------------------------------
//  Backend status badge (Synced / Local) — gated behind a mounted flag
//  so server HTML and first client render always match.
// ---------------------------------------------------------------------
function BackendBadge() {
  const { backend } = useData();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-surface px-2.5 py-1 text-xs font-medium text-content-muted"
        aria-hidden="true"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-content-muted/50" />
        <span className="opacity-60">···</span>
      </span>
    );
  }

  const synced = backend === "supabase";

  const tip = synced
    ? "Synced to Supabase — your trades follow you across phone & desktop."
    : "Local only: data lives in this browser. There's no account backup — export a CSV from Settings regularly.";

  return (
    <Tooltip content={tip}>
      <span
        className={[
          "inline-flex select-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
          synced
            ? "border-profit/25 bg-profit-soft text-profit"
            : "border-warn/25 bg-warn-soft text-warn",
        ].join(" ")}
      >
        <span
          className={[
            "h-1.5 w-1.5 rounded-full",
            synced ? "bg-profit" : "bg-warn",
          ].join(" ")}
        />
        {synced ? "Synced" : "Local"}
      </span>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------
//  Nav — desktop links live in the top bar; a fixed bottom tab bar takes
//  over on mobile. The backend badge sits on the right of the top bar.
// ---------------------------------------------------------------------
export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: horizontal links inside the sticky top bar. */}
      <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <a
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={[
                "group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
                active
                  ? "bg-brand-soft text-brand"
                  : "text-content-secondary hover:bg-bg-hover hover:text-content-primary",
              ].join(" ")}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </a>
          );
        })}
      </nav>

      {/* Backend status — right side of the top bar (both breakpoints). */}
      <div className="flex shrink-0 items-center">
        <BackendBadge />
      </div>

      {/* Mobile: fixed bottom tab bar with big tap targets. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-bg-surface/95 backdrop-blur-md md:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-5 px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <a
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium tracking-wide transition-colors duration-150 active:scale-[0.97]",
                  active
                    ? "text-brand"
                    : "text-content-muted hover:text-content-secondary",
                ].join(" ")}
              >
                {active && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" />
                )}
                <Icon className="h-[22px] w-[22px]" />
                <span className="leading-none">{label}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}
