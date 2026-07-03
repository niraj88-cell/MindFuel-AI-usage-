'use client'

import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Web App Crash Caught]', error)
  }, [error])

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center text-ink">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">Something interrupted</p>
      <h1 className="mt-4 max-w-md text-2xl font-semibold tracking-tight">
        This page didn&rsquo;t load.
      </h1>
      <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-soft">
        A one-off error, not your data. Your sessions and your privacy are untouched.
        Try again in a moment.
      </p>
      <button
        onClick={() => reset()}
        className="mt-8 inline-flex h-11 items-center rounded-lg bg-ink px-6 text-sm font-semibold text-paper transition-colors hover:bg-ink-hover"
      >
        Try again
      </button>
    </main>
  )
}
