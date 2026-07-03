// The verification seal — SatyaShift's own glyph, not a stock shield.
// It echoes the brand bindu: a closed ring pressed with a solid center point
// means the extension confirmed this time (सत्य — sealed). A single hollow ring,
// open at the top, means the time is honest but unverified — nothing was pressed.
// Inherits color via currentColor and scales with the size prop.

export function VerifiedMark({
  verified,
  size = 16,
  className = '',
}: {
  verified: boolean
  size?: number
  className?: string
}) {
  if (verified) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3.4" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* an open ring — honest, but nothing was sealed */}
      <path
        d="M12 3.5 A8.5 8.5 0 1 1 8.6 4.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  )
}
