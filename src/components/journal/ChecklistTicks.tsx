import type { Trade } from "@/lib/types";
import { MODEL_FIELDS, type ModelKey } from "@/components/journal/model";
import { CheckIcon } from "@/components/journal/icons";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * ChecklistTicks — compact read-only display of the four model confluences.
 * Confirmed legs glow green; unmet legs stay muted, so the strength of a
 * setup reads at a glance.
 */
export function ChecklistTicks({
  trade,
  className,
}: {
  trade: Pick<Trade, ModelKey>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {MODEL_FIELDS.map((f) => {
        const on = trade[f.key];
        return (
          <span
            key={f.key}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
              on
                ? "bg-profit-soft text-profit"
                : "border border-border-subtle text-content-muted",
            )}
          >
            {on ? (
              <CheckIcon className="h-3 w-3" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-border-strong" aria-hidden="true" />
            )}
            {f.short}
          </span>
        );
      })}
    </div>
  );
}
