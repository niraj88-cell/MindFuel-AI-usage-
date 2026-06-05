'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { HTMLMotionProps } from 'framer-motion';

type AccentButtonVariant = 'red' | 'blue' | 'gradient';
type AccentButtonSize = 'sm' | 'md' | 'lg';

interface AccentButtonProps
  extends Omit<HTMLMotionProps<"button">, 'style'> {
  variant?: AccentButtonVariant;
  size?: AccentButtonSize;
  loading?: boolean;
  glow?: boolean;
  children?: ReactNode;
  className?: string;
}

/* ── size presets ─────────────────────────────────────── */
const sizeClasses: Record<AccentButtonSize, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
};

/* ── background styles per variant ───────────────────── */
const variantBg: Record<AccentButtonVariant, React.CSSProperties> = {
  red: { backgroundColor: 'var(--accent-red, #DC2626)' },
  blue: { backgroundColor: 'var(--accent-blue, #3B82F6)' },
  gradient: {
    background:
      'var(--gradient-brand, linear-gradient(135deg, #DC2626 0%, #3B82F6 100%))',
  },
};

/* ── glow shadows per variant ────────────────────────── */
const glowShadow: Record<AccentButtonVariant, string> = {
  red: '0 0 20px rgba(220, 38, 38, 0.25), 0 0 40px rgba(220, 38, 38, 0.1)',
  blue: '0 0 20px rgba(59, 130, 246, 0.25), 0 0 40px rgba(59, 130, 246, 0.1)',
  gradient:
    '0 0 20px rgba(220, 38, 38, 0.18), 0 0 40px rgba(59, 130, 246, 0.12)',
};

/* ── loading spinner ─────────────────────────────────── */
function WebSpinner({ size }: { size: AccentButtonSize }) {
  const dim = size === 'sm' ? 14 : size === 'md' ? 16 : 18;
  return (
    <motion.svg
      width={dim}
      height={dim}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      style={{ flexShrink: 0 }}
    >
      {/* Outer ring */}
      <circle
        cx={10}
        cy={10}
        r={8}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={2}
      />
      {/* Spinning arc */}
      <path
        d="M10 2a8 8 0 0 1 8 8"
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Center node */}
      <circle cx={10} cy={10} r={1.5} fill="rgba(255,255,255,0.6)" />
    </motion.svg>
  );
}

export function AccentButton({
  variant = 'red',
  size = 'md',
  loading = false,
  glow = true,
  children,
  disabled,
  className = '',
  ...rest
}: AccentButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      disabled={isDisabled}
      className={[
        'relative inline-flex items-center justify-center gap-2',
        'rounded-full font-bold text-white',
        'select-none outline-none',
        'transition-[filter] duration-200',
        sizeClasses[size],
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        ...variantBg[variant],
        boxShadow: glow && !isDisabled ? glowShadow[variant] : 'none',
      }}
      /* ── hover → brighten ─────────────────────── */
      whileHover={
        isDisabled
          ? undefined
          : {
              scale: 1.02,
              filter: 'brightness(1.15)',
            }
      }
      /* ── active → spidey-snap bounce ──────────── */
      whileTap={
        isDisabled
          ? undefined
          : {
              scale: 0.96,
              transition: {
                type: 'spring',
                stiffness: 500,
                damping: 15,
              },
            }
      }
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 20,
      }}
      {...rest}
    >
      {loading && <WebSpinner size={size} />}
      {children}
    </motion.button>
  );
}
