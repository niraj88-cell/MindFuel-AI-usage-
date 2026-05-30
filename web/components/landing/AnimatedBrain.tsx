'use client'

import React from 'react'

export function AnimatedBrain({ className = '', size = 120 }: { className?: string; size?: number }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Outer glow ring */}
      <div 
        className="absolute rounded-full animate-glow-ring"
        style={{
          width: size * 1.4,
          height: size * 1.4,
          background: 'radial-gradient(circle, rgba(130, 140, 255, 0.1) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        {/* Brain outline — left hemisphere */}
        <path
          d="M60 25 C45 25, 28 35, 28 55 C28 68, 35 78, 45 82 C42 86, 42 92, 48 95 L60 95"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Brain outline — right hemisphere */}
        <path
          d="M60 25 C75 25, 92 35, 92 55 C92 68, 85 78, 75 82 C78 86, 78 92, 72 95 L60 95"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Center line */}
        <line x1="60" y1="25" x2="60" y2="95" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

        {/* Neural network nodes */}
        {[
          { cx: 42, cy: 40 }, { cx: 52, cy: 35 }, { cx: 68, cy: 35 }, { cx: 78, cy: 40 },
          { cx: 38, cy: 55 }, { cx: 50, cy: 50 }, { cx: 60, cy: 45 }, { cx: 70, cy: 50 }, { cx: 82, cy: 55 },
          { cx: 40, cy: 68 }, { cx: 52, cy: 62 }, { cx: 60, cy: 58 }, { cx: 68, cy: 62 }, { cx: 80, cy: 68 },
          { cx: 45, cy: 78 }, { cx: 55, cy: 74 }, { cx: 65, cy: 74 }, { cx: 75, cy: 78 },
          { cx: 50, cy: 86 }, { cx: 60, cy: 82 }, { cx: 70, cy: 86 },
        ].map((node, i) => (
          <circle
            key={`node-${i}`}
            cx={node.cx}
            cy={node.cy}
            r="2"
            fill="rgba(255,255,255,0.3)"
            className="animate-node-pulse"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}

        {/* Neural connections — signal paths */}
        {[
          // Top cluster
          'M42,40 L52,35', 'M52,35 L60,45', 'M68,35 L60,45', 'M68,35 L78,40',
          // Middle connections
          'M42,40 L38,55', 'M42,40 L50,50', 'M52,35 L50,50', 'M78,40 L82,55', 'M78,40 L70,50',
          'M68,35 L70,50', 'M50,50 L60,45', 'M70,50 L60,45',
          // Mid-lower
          'M38,55 L40,68', 'M50,50 L52,62', 'M60,45 L60,58', 'M70,50 L68,62', 'M82,55 L80,68',
          'M38,55 L52,62', 'M82,55 L68,62', 'M52,62 L60,58', 'M68,62 L60,58',
          // Lower
          'M40,68 L45,78', 'M52,62 L55,74', 'M60,58 L60,82', 'M68,62 L65,74', 'M80,68 L75,78',
          'M40,68 L55,74', 'M80,68 L65,74',
          // Bottom
          'M45,78 L50,86', 'M55,74 L50,86', 'M55,74 L60,82', 'M65,74 L60,82', 'M65,74 L70,86', 'M75,78 L70,86',
        ].map((d, i) => (
          <path
            key={`conn-${i}`}
            d={d}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.8"
            fill="none"
          />
        ))}

        {/* Animated signal pulses traveling along paths */}
        {[
          { d: 'M42,40 L50,50 L60,58 L60,82', delay: 0, dur: 3 },
          { d: 'M78,40 L70,50 L68,62 L65,74 L70,86', delay: 1, dur: 3.5 },
          { d: 'M52,35 L60,45 L60,58 L55,74 L50,86', delay: 0.5, dur: 3.2 },
          { d: 'M68,35 L78,40 L82,55 L80,68 L75,78', delay: 1.5, dur: 3 },
          { d: 'M42,40 L38,55 L40,68 L45,78 L50,86', delay: 2, dur: 3.3 },
          { d: 'M52,35 L50,50 L52,62 L55,74 L60,82', delay: 0.8, dur: 2.8 },
        ].map((signal, i) => (
          <g key={`signal-${i}`}>
            <path
              d={signal.d}
              stroke="url(#signal-gradient)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              opacity="0"
              className="animate-signal-path"
              style={{ animationDelay: `${signal.delay}s`, animationDuration: `${signal.dur}s` }}
            />
            <circle r="3" fill="rgba(180, 170, 255, 0.8)" className="animate-signal-dot" style={{ animationDelay: `${signal.delay}s`, animationDuration: `${signal.dur}s` }}>
              <animateMotion
                dur={`${signal.dur}s`}
                begin={`${signal.delay}s`}
                repeatCount="indefinite"
                path={signal.d}
              />
            </circle>
          </g>
        ))}

        {/* Gradient definitions */}
        <defs>
          <linearGradient id="signal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(140, 130, 255, 0)" />
            <stop offset="50%" stopColor="rgba(140, 130, 255, 0.4)" />
            <stop offset="100%" stopColor="rgba(140, 130, 255, 0)" />
          </linearGradient>
          <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(180, 170, 255, 0.6)" />
            <stop offset="100%" stopColor="rgba(180, 170, 255, 0)" />
          </radialGradient>
        </defs>
      </svg>

      {/* Center brain icon glow */}
      <div 
        className="absolute rounded-full animate-breathe"
        style={{
          width: size * 0.3,
          height: size * 0.3,
          background: 'radial-gradient(circle, rgba(180, 170, 255, 0.15) 0%, transparent 70%)',
        }}
      />
    </div>
  )
}
