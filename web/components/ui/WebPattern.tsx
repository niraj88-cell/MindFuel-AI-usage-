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

const densityConfig: Record<WebPatternDensity, { cols: number; rows: number }> = {
  sparse: { cols: 6, rows: 6 },
  normal: { cols: 8, rows: 8 },
  dense: { cols: 10, rows: 10 },
};

const colorMap: Record<WebPatternColor, string> = {
  red: '#4CAF50',
  blue: '#5DADE2',
  neutral: '#EADBC8',
};

export function WebPattern({
  density = 'normal',
  color = 'neutral',
  animated = true,
  className = '',
}: WebPatternProps) {
  const { cols, rows } = densityConfig[density];
  const dotColor = colorMap[color];

  const viewSize = 200;
  const paddingX = 16;
  const paddingY = 16;
  const spacingX = (viewSize - paddingX * 2) / (cols - 1);
  const spacingY = (viewSize - paddingY * 2) / (rows - 1);

  // Generate dot positions in a soft grid
  const dots: { cx: number; cy: number; key: string }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      dots.push({
        cx: paddingX + col * spacingX,
        cy: paddingY + row * spacingY,
        key: `${row}-${col}`,
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
      {/* Soft dot grid */}
      {dots.map((dot, i) =>
        animated ? (
          <motion.circle
            key={dot.key}
            cx={dot.cx}
            cy={dot.cy}
            r={1}
            fill={dotColor}
            initial={{ opacity: 0.04 }}
            animate={{ opacity: [0.04, 0.08, 0.04] }}
            transition={{
              duration: 4 + (i % 3),
              repeat: Infinity,
              ease: 'easeInOut',
              delay: (i % 5) * 0.6,
            }}
          />
        ) : (
          <circle
            key={dot.key}
            cx={dot.cx}
            cy={dot.cy}
            r={1}
            fill={dotColor}
            opacity={0.06}
          />
        )
      )}
    </svg>
  );
}
