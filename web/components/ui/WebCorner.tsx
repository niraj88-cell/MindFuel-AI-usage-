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
 * Transforms to orient the decorative curves toward the correct corner.
 * Base drawing assumes curves emanate from top-left (0,0).
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
  color = '#EADBC8',
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
        {/* Primary curve — gentle arc */}
        <path
          d={`M0,0 Q${size * 0.5},${size * 0.1} ${size * 0.95},${size * 0.35}`}
          stroke={color}
          strokeWidth={0.75}
          opacity={0.3}
          strokeLinecap="round"
          fill="none"
        />
        {/* Secondary curve — steeper arc */}
        <path
          d={`M0,0 Q${size * 0.1},${size * 0.5} ${size * 0.35},${size * 0.95}`}
          stroke={color}
          strokeWidth={0.75}
          opacity={0.25}
          strokeLinecap="round"
          fill="none"
        />
        {/* Tertiary curve — diagonal arc */}
        <path
          d={`M0,0 Q${size * 0.25},${size * 0.4} ${size * 0.7},${size * 0.7}`}
          stroke={color}
          strokeWidth={0.5}
          opacity={0.2}
          strokeLinecap="round"
          fill="none"
        />
        {/* Corner accent — soft dot at the origin */}
        <circle
          cx={1.5}
          cy={1.5}
          r={1.5}
          fill={color}
          opacity={0.3}
        />
      </g>
    </svg>
  );
}
