// components/ui/badge.tsx
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#4CAF50]/20 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#4CAF50]/10 text-[#4CAF50]',
        secondary: 'border-transparent bg-[#F5F7F6] text-[#4B5563]',
        destructive: 'border-transparent bg-[#E57373]/10 text-[#E57373]',
        outline: 'border-black/[0.08] text-[#111827]',
        success: 'border-transparent bg-[#4CAF50]/10 text-[#388E3C]',
        warning: 'border-transparent bg-amber-100 text-amber-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
