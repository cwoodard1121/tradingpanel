import type { SVGProps } from "react";

// ---------------------------------------------------------------------
//  Shared inline icons for the journal — stroke style, 1.7px weight, to
//  match the app's existing icon language (see Nav). All use currentColor
//  so they tint with their parent's text color.
// ---------------------------------------------------------------------

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function Base({ className, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Base>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </Base>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </Base>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Base>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Base {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Base>
  );
}

export function ImportIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </Base>
  );
}

export function ExportIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 17V5" />
      <path d="m7 10 5-5 5 5" />
      <path d="M5 21h14" />
    </Base>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Base>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Base>
  );
}

export function JournalGlyph(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6.5 3H18a1 1 0 0 1 1 1v15.5a.5.5 0 0 1-.5.5H6.5A1.5 1.5 0 0 1 5 18.5v-14A1.5 1.5 0 0 1 6.5 3Z" />
      <path d="M5 18.5A1.5 1.5 0 0 1 6.5 17H19" />
      <line x1="9" y1="7.5" x2="15" y2="7.5" />
      <line x1="9" y1="10.5" x2="13" y2="10.5" />
    </Base>
  );
}
