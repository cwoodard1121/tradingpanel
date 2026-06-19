"use client";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Select — styled native <select> (great mobile UX) with a custom chevron and
 * brand focus ring. Shows a muted placeholder when value is empty.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder,
  className,
}: SelectProps) {
  const showingPlaceholder = value === "" && placeholder != null;

  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full cursor-pointer appearance-none rounded-xl border border-border bg-bg-elevated py-2.5 pl-3.5 pr-9 text-sm outline-none transition-colors duration-150 focus:border-brand focus:ring-2 focus:ring-brand/30",
          showingPlaceholder ? "text-content-muted" : "text-content-primary",
        )}
      >
        {placeholder != null && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}
            className="bg-bg-elevated text-content-primary"
          >
            {o.label}
          </option>
        ))}
      </select>
      <Chevron />
    </div>
  );
}
