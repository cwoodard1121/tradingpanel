import { forwardRef, type ButtonHTMLAttributes } from "react";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-black shadow-sm hover:bg-brand-hover",
  secondary:
    "border border-border bg-bg-elevated text-content-primary hover:border-border-strong hover:bg-bg-hover",
  ghost:
    "text-content-secondary hover:bg-bg-hover hover:text-content-primary",
  danger: "bg-loss text-white shadow-sm hover:bg-loss/90",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        className="opacity-90"
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Button — tactile, brand-accented button with variants, sizes and a loading
 * state. Primary uses Bitcoin orange on black; danger uses loss tones.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    className,
    children,
    type,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});
