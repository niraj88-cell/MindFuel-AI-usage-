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
      <div className="w-20 h-20 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-red-400" />
      </div>
      <h2 className="text-3xl font-semibold text-[#111827] mb-3">Something went wrong</h2>
      <p className="text-[#4B5563] text-center max-w-md mb-8 leading-relaxed">
        We encountered an unexpected error while loading this page. Our team has been notified.
      </p>
      <Button
        onClick={() => reset()}
        className="h-12 px-8 rounded-full bg-[#111827] hover:bg-[#1f2937] text-white shadow-md transition-all font-semibold"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </div>
  )
}
