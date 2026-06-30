// SatyaShift brand mark — a cross that sprouts at the top (grounding + growth).
// Inherits color via currentColor and size via width/height props or className.

export function SatyaMark({ className = '', size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="12" y1="7" x2="12" y2="22" />
      <line x1="12" y1="7" x2="8.5" y2="3" />
      <line x1="12" y1="7" x2="15.5" y2="3" />
      <line x1="12" y1="7" x2="12" y2="2.5" />
      <line x1="6" y1="14" x2="18" y2="14" />
      <circle cx="6" cy="14" r="1.4" fill="currentColor" />
      <circle cx="18" cy="14" r="1.4" fill="currentColor" />
    </svg>
  )
}
