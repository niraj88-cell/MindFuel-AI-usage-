import Link from 'next/link'
import { SearchX, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center animate-fade-in-up">
      <div className="w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-8">
        <SearchX className="w-12 h-12 text-indigo-400" />
      </div>
      <h1 className="text-5xl font-black tracking-tight mb-4">404</h1>
      <h2 className="text-2xl font-bold text-slate-200 mb-3">Lost in the digital void</h2>
      <p className="text-slate-400 max-w-md mb-10 leading-relaxed">
        The content or page you're looking for doesn't exist. It may have been moved or deleted.
      </p>
      
      <Link href="/dashboard">
        <Button className="h-12 px-8 rounded-full bg-white text-black hover:bg-slate-200 font-bold transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return to Dashboard
        </Button>
      </Link>
    </div>
  )
}
