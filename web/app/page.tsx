import Link from 'next/link'
import { Brain, ArrowRight, Shield, Zap, Activity, CheckCircle2, Sparkles } from 'lucide-react'
import { InteractiveHero } from '@/components/landing/InteractiveHero'
import { SocialProofToasts } from '@/components/landing/SocialProofToasts'

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
              Get Your Focus Score
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-16 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        
        {/* Platinum Pill Badge */}
        <Link href="#pricing" className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors mb-6 animate-fade-in-up">
          <span className="text-xs font-bold text-white">✨ Unlock advanced cognitive coaching with MindFuel Platinum &rarr;</span>
        </Link>
        
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
        <InteractiveHero />
        
        {/* Mockup / Curiosity Gap */}
        <div className="mt-16 relative max-w-3xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10 flex flex-col items-center justify-end pb-10">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md mb-3 border border-white/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <p className="text-white font-bold text-sm">Premium AI Insights Locked</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900 overflow-hidden opacity-50 blur-[2px]">
            {/* Fake Dashboard Mockup */}
            <div className="h-12 border-b border-white/5 flex items-center px-4 gap-2">
               <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
               <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
               <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="h-32 bg-white/5 rounded-xl border border-white/5"></div>
              <div className="h-32 bg-white/5 rounded-xl border border-white/5"></div>
              <div className="col-span-2 h-48 bg-white/5 rounded-xl border border-white/5 mt-2"></div>
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

      {/* Pricing Bento Box */}
      <section id="pricing" className="border-t border-white/5 py-24 px-6 bg-black relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-white/[0.02] blur-[100px] rounded-full pointer-events-none"></div>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">Ready to rewire your mind?</h2>
            <p className="text-lg text-zinc-400">Choose the plan that fits your mental nutrition goals.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="p-8 sm:p-10 bg-zinc-900/40 border border-white/10 rounded-3xl hover:border-white/20 transition-colors flex flex-col h-full">
              <div className="flex-1">
                <h3 className="text-2xl font-black text-white mb-2">Free</h3>
                <p className="text-zinc-400 mb-8 text-sm">Essential tools to track your daily digital diet.</p>
                <div className="text-4xl font-black text-white mb-8">$0</div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-sm text-zinc-300 font-medium"><CheckCircle2 className="w-5 h-5 text-white" /> 3 Daily Entries</li>
                  <li className="flex items-center gap-3 text-sm text-zinc-300 font-medium"><CheckCircle2 className="w-5 h-5 text-white" /> Basic AI Analysis</li>
                  <li className="flex items-center gap-3 text-sm text-zinc-300 font-medium"><CheckCircle2 className="w-5 h-5 text-white" /> Public Challenges</li>
                </ul>
              </div>
              <Link href="/signup" className="w-full py-4 rounded-xl border border-white/20 text-center font-bold hover:bg-white/5 transition-colors text-white">Start Free</Link>
            </div>
            
            {/* Platinum Tier */}
            <div className="p-8 sm:p-10 bg-white rounded-3xl relative flex flex-col h-full shadow-[0_0_50px_rgba(255,255,255,0.1)] scale-100 md:scale-105 z-10">
              <div className="absolute top-0 right-8 -translate-y-1/2 px-4 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                Recommended
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black text-black mb-2 flex items-center gap-2">Platinum <Sparkles className="w-5 h-5" /></h3>
                <p className="text-zinc-600 mb-8 text-sm">Transformative insights and unlimited cognitive coaching.</p>
                <div className="text-4xl font-black text-black mb-8">$9.99<span className="text-lg text-zinc-500 font-medium">/mo</span></div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-sm text-black font-bold"><CheckCircle2 className="w-5 h-5 text-black" /> Unlimited Daily Entries</li>
                  <li className="flex items-center gap-3 text-sm text-black font-bold"><CheckCircle2 className="w-5 h-5 text-black" /> Deep Psychological Insights</li>
                  <li className="flex items-center gap-3 text-sm text-black font-bold"><CheckCircle2 className="w-5 h-5 text-black" /> Bespoke Habit Challenges</li>
                  <li className="flex items-center gap-3 text-sm text-black font-bold"><CheckCircle2 className="w-5 h-5 text-black" /> Always-On AI Coach</li>
                </ul>
              </div>
              <Link href="/signup" className="w-full py-4 rounded-xl bg-black text-white text-center font-bold hover:bg-zinc-800 transition-colors shadow-xl">Go Platinum</Link>
            </div>
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

      <SocialProofToasts />
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
