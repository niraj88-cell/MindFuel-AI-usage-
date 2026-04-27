'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[Web App Crash Caught]', error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 animate-fade-in-up">
      <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-red-400" />
      </div>
      <h2 className="text-3xl font-black mb-3">System Glitch</h2>
      <p className="text-slate-400 text-center max-w-md mb-8 leading-relaxed">
        We encountered an unexpected error while loading this page. Our team has been notified.
      </p>
      <Button
        onClick={() => reset()}
        className="h-12 px-8 rounded-full bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all font-semibold"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Attempt Recovery
      </Button>
    </div>
  )
}
