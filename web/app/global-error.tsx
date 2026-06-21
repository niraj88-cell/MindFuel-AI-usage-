'use client'

import { Inter } from 'next/font/google'
import { AlertTriangle } from 'lucide-react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// global-error must have its own html/body tags
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#FAF8F4] text-[#111827] min-h-screen flex flex-col items-center justify-center p-4`}>
        <div className="text-center max-w-md animate-fade-in-up">
          <div className="w-20 h-20 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-4xl font-semibold mb-4">Something went wrong</h1>
          <p className="text-[#4B5563] mb-8">
            A fatal application error occurred. We apologize for the disruption.
          </p>
          <button
            onClick={() => reset()}
            className="h-12 px-8 rounded-full bg-[#111827] hover:bg-[#1f2937] text-white font-semibold transition-all inline-flex items-center justify-center shadow-md"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  )
}
