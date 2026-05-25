import Link from 'next/link'
import { Brain, ArrowRight, Shield, Zap, Activity, CheckCircle2 } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-slate-200 selection:bg-indigo-500/30 flex flex-col font-sans">
      {/* Minimal Navbar */}
      <nav className="w-full border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
               <Brain className="w-5 h-5 text-black" />
            </div>
            <span className="text-lg font-black tracking-tight text-white">MindFuel</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-zinc-400 hover:text-white transition-colors hidden sm:block">
              Log in
            </Link>
            <Link href="/signup" className="px-5 py-2 text-sm font-bold text-black bg-white rounded-lg hover:bg-zinc-200 transition-colors shadow-none">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-16 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        
        {/* Social Proof Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 animate-fade-in-up">
          <div className="flex -space-x-1.5">
            {['A', 'B', 'C'].map((initial, i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-zinc-800 border border-black flex items-center justify-center text-[8px] font-bold text-zinc-400">
                {initial}
              </div>
            ))}
          </div>
          <span className="text-xs font-bold text-zinc-400">
            Join <span className="text-white">50,000+</span> users optimizing their digital diet
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white leading-[1.1] tracking-tight mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Reclaim 2+ Hours of <br className="hidden sm:block" /> Focus Every Day.
        </h1>

        {/* Value Prop */}
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 font-medium leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          MindFuel is your personal AI coach for digital habits. Analyze content impact, break doomscrolling loops, and automatically build a healthier relationship with your screens.
        </p>

        {/* CTAs */}
        <div className="w-full max-w-md mx-auto space-y-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <Link href="/signup" className="flex items-center justify-center gap-2 w-full h-14 bg-white text-black rounded-xl font-black text-lg hover:bg-zinc-200 transition-all active:scale-[0.98]">
            Start My Free Analysis <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-sm text-zinc-500 font-medium mt-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>No credit card required.</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Setup takes 30 seconds.</span>
            </div>
          </div>
        </div>
      </main>

      {/* Trust & Features Section */}
      <section className="border-t border-white/5 bg-zinc-900/20 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">Everything you need to regain control</h2>
            <p className="text-zinc-400">Powerful features designed to optimize your cognitive nutrition.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Zap} 
              title="AI Content Analysis" 
              desc="Paste any link. Our AI scores its impact on your mental health and suggests better alternatives." 
            />
            <FeatureCard 
              icon={Activity} 
              title="Mood Tracking" 
              desc="Log how screen time makes you feel. Visualize trends and identify apps draining your energy." 
            />
            <FeatureCard 
              icon={Shield} 
              title="Personal AI Coach" 
              desc="Chat with an AI that understands your habits. Get personalized strategies to beat content addiction." 
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6 text-center text-sm text-zinc-600 font-medium">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center justify-center gap-2">
            <Brain className="w-4 h-4" />
            <span className="font-bold">MindFuel</span>
          </div>
          <p>&copy; {new Date().getFullYear()} MindFuel. All rights reserved.</p>
          <div className="flex items-center justify-center gap-6">
            <Link href="/login" className="hover:text-white transition-colors">Log In</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="p-6 sm:p-8 bg-zinc-900/50 border border-white/5 rounded-2xl hover:bg-zinc-800/50 transition-colors">
      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-black text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}
