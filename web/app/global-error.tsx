'use client'

import { Instrument_Sans } from 'next/font/google'
import './globals.css'

const sans = Instrument_Sans({ subsets: ['latin'], display: 'swap' })

// global-error replaces the root layout, so it carries its own html/body.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        className={`${sans.className} flex min-h-screen flex-col items-center justify-center bg-[#FAF8F4] p-6 text-center text-[#23201B]`}
      >
        <p style={{ fontFamily: 'monospace' }} className="text-xs uppercase tracking-[0.2em] text-[#6F6A61]">
          Something interrupted
        </p>
        <h1 className="mt-4 max-w-md text-2xl font-semibold tracking-tight">
          SatyaShift couldn&rsquo;t start.
        </h1>
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-[#575148]">
          A rare error stopped the app from loading. Your data is safe and untouched.
          Reloading usually resolves it.
        </p>
        <button
          onClick={() => reset()}
          className="mt-8 inline-flex h-11 items-center rounded-lg bg-[#23201B] px-6 text-sm font-semibold text-[#FAF8F4] transition-colors hover:bg-[#34302A]"
        >
          Reload
        </button>
      </body>
    </html>
  )
}
