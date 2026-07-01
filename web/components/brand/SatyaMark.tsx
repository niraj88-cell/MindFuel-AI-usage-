// SatyaShift brand mark — a trishula (Shiva: mastery of mind, cutting through
// illusion) with a bindu on its axis (the single point of focus, ekagrata).
// Read plainly, it's a grounded, upright focus mark. Inherits color via
// currentColor and size via the size prop or className.

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
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* staff */}
      <path d="M12 10 L12 21" />
      {/* crossbar where the tines join */}
      <path d="M8.5 10 L15.5 10" />
      {/* center tine */}
      <path d="M12 10 L12 3.4" />
      {/* outer tines, curving inward like flames */}
      <path d="M8.5 10 C 8.5 6.5 9 5 10 4.3" />
      <path d="M15.5 10 C 15.5 6.5 15 5 14 4.3" />
      {/* bindu — the point of focus on the axis */}
      <circle cx="12" cy="14.6" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}
