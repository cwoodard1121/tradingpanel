"use client";

import {
  forwardRef,
  useEffect,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

const controlBase =
  "w-full rounded-xl border border-border bg-bg-elevated px-3.5 py-2.5 text-sm text-content-primary placeholder:text-content-muted outline-none transition-colors duration-150 focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50";

// ---------------------------------------------------------------------
//  Field — label / hint / error wrapper around any control.
// ---------------------------------------------------------------------
export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, className, children }: FieldProps) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      {label != null && (
        <span className="text-xs font-medium text-content-secondary">
          {label}
        </span>
      )}
      {children}
      {error != null ? (
        <span className="text-xs text-loss">{error}</span>
      ) : hint != null ? (
        <span className="text-xs text-content-muted">{hint}</span>
      ) : null}
    </label>
  );
}

// ---------------------------------------------------------------------
//  Input — styled text input.
// ---------------------------------------------------------------------
export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, type, ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type ?? "text"}
      className={cn(controlBase, className)}
      {...props}
    />
  );
});

// ---------------------------------------------------------------------
//  TextArea — styled multiline input.
// ---------------------------------------------------------------------
export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, rows, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows ?? 3}
      className={cn(controlBase, "min-h-[4.5rem] resize-y leading-relaxed", className)}
      {...props}
    />
  );
});

// ---------------------------------------------------------------------
//  NumberInput — numeric control that emits number | null (never NaN).
//  Keeps a local text buffer so intermediate states ("", "-", "1.") work.
// ---------------------------------------------------------------------
export interface NumberInputProps {
  value: number | null;
  onValueChange: (n: number | null) => void;
  placeholder?: string;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  id?: string;
}

function parseNum(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === "-" || t === "." || t === "-." || t === "+") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function NumberInput({
  value,
  onValueChange,
  placeholder,
  step,
  min,
  max,
  className,
  id,
}: NumberInputProps) {
  const [text, setText] = useState<string>(value == null ? "" : String(value));

  // Re-sync the local buffer when the external value diverges from what the
  // current text parses to (e.g. a form reset or a prefill).
  useEffect(() => {
    const parsed = parseNum(text);
    if (parsed !== value) {
      setText(value == null ? "" : String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function clamp(n: number): number {
    let out = n;
    if (typeof min === "number" && out < min) out = min;
    if (typeof max === "number" && out > max) out = max;
    return out;
  }

  function handleChange(raw: string) {
    setText(raw);
    onValueChange(parseNum(raw));
  }

  function handleBlur() {
    const parsed = parseNum(text);
    if (parsed === null) {
      setText("");
      onValueChange(null);
      return;
    }
    const clamped = clamp(parsed);
    setText(String(clamped));
    if (clamped !== parsed) onValueChange(clamped);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const stepBy = typeof step === "number" && step > 0 ? step : 1;
    const current = parseNum(text) ?? 0;
    const next = clamp(
      Number((current + (e.key === "ArrowUp" ? stepBy : -stepBy)).toFixed(10)),
    );
    setText(String(next));
    onValueChange(next);
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn(controlBase, "font-mono tabular-nums", className)}
    />
  );
}
