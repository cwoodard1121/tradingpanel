"use client";

import type { ReactNode } from "react";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export type SegmentedSize = "sm" | "md" | "lg";

export interface SegmentedOption<T> {
  label: ReactNode;
  value: T;
}

export interface SegmentedProps<T> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: SegmentedSize;
  className?: string;
}

const sizeBtn: Record<SegmentedSize, string> = {
  sm: "h-7 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

/**
 * Segmented — pill-style control with a sliding brand indicator behind the
 * active option. Options are equal width; the indicator translates between them.
 */
export function Segmented<T extends string | number | boolean>({
  options,
  value,
  onChange,
  size = "md",
  className,
}: SegmentedProps<T>) {
  const activeIndex = options.findIndex((o) => o.value === value);
  const n = Math.max(options.length, 1);

  return (
    <div
      role="tablist"
      className={cn(
        "relative inline-flex w-full rounded-full border border-border-subtle bg-bg-elevated p-1",
        className,
      )}
    >
      {activeIndex >= 0 && (
        <span
          aria-hidden="true"
          className="absolute bottom-1 top-1 rounded-full bg-brand shadow-glow transition-[transform,width] duration-200 ease-out"
          style={{
            width: `calc((100% - 0.5rem) / ${n})`,
            left: "0.25rem",
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
      )}

      {options.map((o, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-10 flex flex-1 items-center justify-center rounded-full font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
              sizeBtn[size],
              active
                ? "text-black"
                : "text-content-secondary hover:text-content-primary",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
