import Link from 'next/link'
import { Brain, ArrowRight, Shield, Zap, Activity, CheckCircle2, Sparkles, Timer, Wind, Target } from 'lucide-react'
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
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center pt-20 pb-8 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        
        {/* Headline — 3-second clarity */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white leading-[1.1] tracking-tight mb-6 animate-fade-in-up">
          Your phone changes <br className="hidden sm:block" /> your mood. <span className="text-zinc-500">We show you how.</span>
        </h1>

        {/* Value Prop — The Noom analogy */}
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-4 font-medium leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          MindFuel is like a nutritionist — but for your screen time. Log what you watch, see how it affects your brain, and get AI coaching to build healthier habits.
        </p>

        {/* Trust line */}
        <p className="text-sm text-zinc-600 font-medium mb-8 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          Free forever · Private by default · No credit card
        </p>

        {/* Interactive Demo — moved UP, this is the conversion weapon */}
        <InteractiveHero />
      </main>

      {/* How It Works — 3 Steps */}
      <section className="border-t border-white/5 bg-zinc-900/20 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">How it works</h2>
            <p className="text-zinc-500 text-sm">Three steps. Thirty seconds. Total clarity.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard 
              step="01" 
              title="Log" 
              desc="Tell MindFuel what you just watched, scrolled, or listened to. Type it, speak it, or pick from a quick preset." 
            />
            <StepCard 
              step="02" 
              title="Score" 
              desc="AI instantly rates the mental impact on a 0–100 scale. See exactly how that content affected your mood." 
            />
            <StepCard 
              step="03" 
              title="Grow" 
              desc="Get personalized AI coaching to shift your habits. Track your streak. Watch your mental score rise over time." 
            />
          </div>
        </div>
      </section>

      {/* Full Feature Showcase — 6 real features */}
      <section className="border-t border-white/5 py-20 px-6 bg-black">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">Everything you need to take back control</h2>
            <p className="text-zinc-500 text-sm">Not just another screen time tracker. A complete system for your digital wellbeing.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Zap} 
              title="AI Content Scanner" 
              desc="Describe what you just watched. AI instantly scores the mental impact and categorizes it — doomscroll, educational, productive, or entertainment." 
            />
            <FeatureCard 
              icon={Activity} 
              title="Mood Tracking" 
              desc="Log how you feel before and after screen time. Discover which apps drain you and which energize you." 
            />
            <FeatureCard 
              icon={Shield} 
              title="AI Coach" 
              desc="Chat with an AI that actually knows your patterns. Get personalized strategies to break content addiction." 
            />
            <FeatureCard 
              icon={Timer} 
              title="Focus Timer" 
              desc="Commit to phone-free blocks with a built-in Pomodoro timer. Track your focus hours and build your streak." 
            />
            <FeatureCard 
              icon={Wind} 
              title="Mindful Intercept" 
              desc="A breathing pause before you open distracting apps. State your intent. Break the autopilot cycle." 
            />
            <FeatureCard 
              icon={Target} 
              title="Habit Challenges" 
              desc="7-day guided challenges like 'Digital Detox Morning' and 'Deep Work Sprint.' Rewire your digital habits with structure." 
            />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-t border-white/5 bg-zinc-900/20 py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-zinc-400 italic text-base leading-relaxed">&ldquo;I always knew doomscrolling was draining me, but I never had proof. MindFuel showed me exactly which apps were tanking my mood — and the AI coach helped me actually change.&rdquo;</p>
          <p className="text-zinc-600 text-sm font-bold mt-4">— Early beta user</p>
        </div>
      </section>

      {/* Pricing Bento Box */}
      <section id="pricing" className="border-t border-white/5 py-24 px-6 bg-black relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-white/[0.02] blur-[100px] rounded-full pointer-events-none"></div>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">Start understanding your mind</h2>
            <p className="text-lg text-zinc-400">Most of what you need is free. Upgrade when you want deeper insights.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="p-8 sm:p-10 bg-zinc-900/40 border border-white/10 rounded-3xl hover:border-white/20 transition-colors flex flex-col h-full">
              <div className="flex-1">
                <h3 className="text-2xl font-black text-white mb-2">Free</h3>
                <p className="text-zinc-400 mb-8 text-sm">Track your digital diet and start seeing patterns.</p>
                <div className="text-4xl font-black text-white mb-8">$0</div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-sm text-zinc-300 font-medium"><CheckCircle2 className="w-5 h-5 text-white shrink-0" /> 3 content scans per day</li>
                  <li className="flex items-center gap-3 text-sm text-zinc-300 font-medium"><CheckCircle2 className="w-5 h-5 text-white shrink-0" /> AI Coach conversations</li>
                  <li className="flex items-center gap-3 text-sm text-zinc-300 font-medium"><CheckCircle2 className="w-5 h-5 text-white shrink-0" /> Focus Timer &amp; Mood Tracking</li>
                  <li className="flex items-center gap-3 text-sm text-zinc-300 font-medium"><CheckCircle2 className="w-5 h-5 text-white shrink-0" /> Habit Challenges</li>
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
                <p className="text-zinc-600 mb-8 text-sm">Unlimited tracking, 30-day deep pattern analysis, and priority AI coaching.</p>
                <div className="text-4xl font-black text-black mb-8">$9.99<span className="text-lg text-zinc-500 font-medium">/mo</span></div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-sm text-black font-bold"><CheckCircle2 className="w-5 h-5 text-black shrink-0" /> Unlimited daily scans</li>
                  <li className="flex items-center gap-3 text-sm text-black font-bold"><CheckCircle2 className="w-5 h-5 text-black shrink-0" /> 30-day subconscious pattern analysis</li>
                  <li className="flex items-center gap-3 text-sm text-black font-bold"><CheckCircle2 className="w-5 h-5 text-black shrink-0" /> Custom AI-generated challenges</li>
                  <li className="flex items-center gap-3 text-sm text-black font-bold"><CheckCircle2 className="w-5 h-5 text-black shrink-0" /> Priority AI Coach (no rate limits)</li>
                </ul>
              </div>
              <Link href="/signup" className="w-full py-4 rounded-xl bg-black text-white text-center font-bold hover:bg-zinc-800 transition-colors shadow-xl">See what your patterns reveal</Link>
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

function StepCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="p-6 sm:p-8 bg-zinc-900/50 border border-white/5 rounded-2xl hover:bg-zinc-800/50 transition-colors text-left">
      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Step {step}</span>
      <h3 className="text-2xl font-black text-white mt-2 mb-3">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
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
