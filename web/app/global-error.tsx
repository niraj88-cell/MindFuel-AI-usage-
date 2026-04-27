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
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0b0f1a] text-white min-h-screen flex flex-col items-center justify-center p-4`}>
        <div className="text-center max-w-md animate-fade-in-up">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-4xl font-black mb-4">Critical Error</h1>
          <p className="text-slate-400 mb-8">
            A fatal application error occurred. We apologize for the disruption.
          </p>
          <button
            onClick={() => reset()}
            className="h-12 px-8 rounded-full bg-indigo-600 hover:bg-indigo-500 font-semibold transition-all inline-flex items-center justify-center"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  )
}
