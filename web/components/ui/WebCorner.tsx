'use client';

type CornerPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface WebCornerProps {
  position?: CornerPosition;
  size?: number;
  color?: string;
  className?: string;
}

const positionStyles: Record<CornerPosition, React.CSSProperties> = {
  'top-left': { top: 0, left: 0 },
  'top-right': { top: 0, right: 0 },
  'bottom-left': { bottom: 0, left: 0 },
  'bottom-right': { bottom: 0, right: 0 },
};

/**
 * Transforms to orient the filament lines toward the correct corner.
 * Base drawing assumes lines emanate from top-left (0,0).
 */
const positionTransforms: Record<CornerPosition, string> = {
  'top-left': '',
  'top-right': 'scale(-1, 1)',
  'bottom-left': 'scale(1, -1)',
  'bottom-right': 'scale(-1, -1)',
};

export function WebCorner({
  position = 'top-right',
  size = 40,
  color = 'var(--accent-blue, #3B82F6)',
  className = '',
}: WebCornerProps) {
  const transform = positionTransforms[position];

  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        ...positionStyles[position],
      }}
    >
      <g transform={transform} style={{ transformOrigin: 'center' }}>
        {/* Primary filament — shallow angle */}
        <line
          x1={0}
          y1={0}
          x2={size * 0.95}
          y2={size * 0.35}
          stroke={color}
          strokeWidth={0.75}
          opacity={0.2}
          strokeLinecap="round"
        />
        {/* Secondary filament — steeper angle */}
        <line
          x1={0}
          y1={0}
          x2={size * 0.35}
          y2={size * 0.95}
          stroke={color}
          strokeWidth={0.75}
          opacity={0.18}
          strokeLinecap="round"
        />
        {/* Tertiary filament — diagonal */}
        <line
          x1={0}
          y1={0}
          x2={size * 0.7}
          y2={size * 0.7}
          stroke={color}
          strokeWidth={0.5}
          opacity={0.15}
          strokeLinecap="round"
        />
        {/* Corner node — tiny dot at the origin */}
        <circle
          cx={1.5}
          cy={1.5}
          r={1.5}
          fill={color}
          opacity={0.25}
        />
      </g>
    </svg>
  );
}
