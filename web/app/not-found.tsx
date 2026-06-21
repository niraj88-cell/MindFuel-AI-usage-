import Link from 'next/link'
import { SearchX, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center animate-fade-in-up">
      <div className="w-24 h-24 rounded-full bg-[#F5F7F6] border border-black/[0.06] flex items-center justify-center mb-8">
        <SearchX className="w-12 h-12 text-gray-300" />
      </div>
      <h1 className="text-5xl font-semibold tracking-tight text-[#111827] mb-4">404</h1>
      <h2 className="text-2xl font-medium text-[#4B5563] mb-3">Page not found</h2>
      <p className="text-gray-400 max-w-md mb-10 leading-relaxed">
        The content or page you're looking for doesn't exist. It may have been moved or deleted.
      </p>
      
      <Link href="/dashboard">
        <Button className="h-12 px-8 rounded-full bg-[#111827] text-white hover:bg-[#1f2937] font-semibold transition-all shadow-md">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return to Dashboard
        </Button>
      </Link>
    </div>
  )
}
