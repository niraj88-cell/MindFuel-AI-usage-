// components/ui/input.tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ghost focus-visible:outline-none focus-visible:border-green focus-visible:ring-2 focus-visible:ring-green-tint disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
