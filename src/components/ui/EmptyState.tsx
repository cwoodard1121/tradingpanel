import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

function DefaultIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M3 7.5 5 4.5h14l2 3" />
      <path d="M3 7.5h6l1.5 2.5h3L15 7.5h6v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5Z" />
    </svg>
  );
}

/**
 * EmptyState — friendly, on-brand placeholder for empty lists / first runs.
 * Centered icon medallion, title, optional description and a call-to-action.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border-subtle bg-bg-elevated text-content-secondary">
        {icon ?? <DefaultIcon />}
      </div>
      <h3 className="text-sm font-semibold text-content-primary">{title}</h3>
      {description != null && (
        <p className="mt-1.5 max-w-sm text-sm text-content-secondary">
          {description}
        </p>
      )}
      {action != null && <div className="mt-5">{action}</div>}
    </div>
  );
}
