'use client';

import { motion } from 'framer-motion';

type WebPatternDensity = 'sparse' | 'normal' | 'dense';
type WebPatternColor = 'red' | 'blue' | 'neutral';

interface WebPatternProps {
  density?: WebPatternDensity;
  color?: WebPatternColor;
  animated?: boolean;
  className?: string;
}

const densityConfig: Record<WebPatternDensity, { rings: number; radials: number }> = {
  sparse: { rings: 3, radials: 6 },
  normal: { rings: 4, radials: 8 },
  dense: { rings: 5, radials: 8 },
};

const colorMap: Record<WebPatternColor, string> = {
  red: 'var(--accent-red, #DC2626)',
  blue: 'var(--accent-blue, #3B82F6)',
  neutral: 'var(--web-line, rgba(255, 255, 255, 0.05))',
};

const nodeColorMap: Record<WebPatternColor, string> = {
  red: 'var(--accent-red, #DC2626)',
  blue: 'var(--accent-blue, #3B82F6)',
  neutral: 'var(--web-node, rgba(255, 255, 255, 0.15))',
};

export function WebPattern({
  density = 'normal',
  color = 'neutral',
  animated = true,
  className = '',
}: WebPatternProps) {
  const { rings, radials } = densityConfig[density];
  const strokeColor = colorMap[color];
  const nodeColor = nodeColorMap[color];

  const viewSize = 200;
  const center = viewSize / 2;
  const maxRadius = center - 4; // small padding

  // Generate concentric ring radii evenly spaced
  const ringRadii = Array.from({ length: rings }, (_, i) =>
    ((i + 1) / rings) * maxRadius
  );

  // Generate radial line angles
  const radialAngles = Array.from({ length: radials }, (_, i) =>
    (i * 360) / radials
  );

  // Compute intersection nodes (each radial × each ring)
  const nodes: { cx: number; cy: number; key: string }[] = [];
  for (const angle of radialAngles) {
    const rad = (angle * Math.PI) / 180;
    for (const r of ringRadii) {
      nodes.push({
        cx: center + r * Math.cos(rad),
        cy: center + r * Math.sin(rad),
        key: `${angle}-${r}`,
      });
    }
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      {/* Concentric rings */}
      {ringRadii.map((r, i) => (
        <circle
          key={`ring-${i}`}
          cx={center}
          cy={center}
          r={r}
          stroke={strokeColor}
          strokeWidth={0.6}
          opacity={0.04 + i * 0.005}
        />
      ))}

      {/* Radial lines from center to edge */}
      {radialAngles.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x2 = center + maxRadius * Math.cos(rad);
        const y2 = center + maxRadius * Math.sin(rad);
        return (
          <line
            key={`radial-${i}`}
            x1={center}
            y1={center}
            x2={x2}
            y2={y2}
            stroke={strokeColor}
            strokeWidth={0.5}
            opacity={0.035}
          />
        );
      })}

      {/* Intersection nodes */}
      {nodes.map((node, i) =>
        animated ? (
          <motion.circle
            key={node.key}
            cx={node.cx}
            cy={node.cy}
            r={1.5}
            fill={nodeColor}
            initial={{ opacity: 0.03 }}
            animate={{ opacity: [0.03, 0.06, 0.03] }}
            transition={{
              duration: 4 + (i % 3),
              repeat: Infinity,
              ease: 'easeInOut',
              delay: (i % 5) * 0.6,
            }}
          />
        ) : (
          <circle
            key={node.key}
            cx={node.cx}
            cy={node.cy}
            r={1.5}
            fill={nodeColor}
            opacity={0.04}
          />
        )
      )}
    </svg>
  );
}
