import Link from 'next/link'
import { Brain, ArrowRight, Shield, Activity, Sparkles, Network, Fingerprint, Lock, Zap, Bot, Bell, Users, Eye } from 'lucide-react'
import { AnimatedBackground } from '@/components/landing/AnimatedBackground'
import { ScrollReveal } from '@/components/landing/ScrollReveal'
import { AnimatedBrain } from '@/components/landing/AnimatedBrain'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MindFuel — The Operating System for Your Mind',
  description: 'MindFuel tracks your digital content consumption, biometric data, and mood to provide predictive AI coaching. Escape doomscrolling, optimize your dopamine, and reclaim your time.',
  alternates: {
    canonical: 'https://getmindfuel.vercel.app',
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-slate-200 selection:bg-white/20 flex flex-col font-sans relative overflow-x-hidden">
      <AnimatedBackground variant="landing" />

      {/* Modern, Glass Navbar */}
      <nav className="w-full border-b border-white/5 bg-black/50 backdrop-blur-2xl sticky top-0 z-50 transition-all">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center transition-all group-hover:scale-105 shadow-[0_0_15px_rgba(255,255,255,0.4)]">
               <Brain className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white">MindFuel</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-bold text-zinc-400 hover:text-white transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link href="/signup" className="px-5 py-2 text-sm font-black tracking-wide text-black bg-white rounded-full hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]">
              Get Early Access
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center relative z-10">
        
        <div className="mb-8 animate-fade-in-up">
          <AnimatedBrain size={90} />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-zinc-400 mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <Sparkles className="w-3 h-3 text-white" />
          <span>MindFuel OS v2.0 is now live</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-white leading-[0.95] tracking-tighter mb-8">
          <span className="inline-block animate-fade-in-up" style={{ animationDelay: '0.2s' }}>The Operating</span><br/>
          <span className="inline-block animate-fade-in-up text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-300 to-zinc-600" style={{ animationDelay: '0.3s' }}>System for your Mind.</span>
        </h1>

        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 font-medium leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          Stop letting algorithms control your dopamine. MindFuel uses biometric tracking, semantic AI memory, and predictive nudges to intercept doomscrolling before it happens.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <Link href="/signup" className="w-full sm:w-auto px-8 py-4 text-base font-black text-black bg-white rounded-full hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2">
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="text-sm font-bold text-zinc-500">
            Join 14,000+ top performers.
          </div>
        </div>
      </main>

      {/* Platform Architecture Showcase */}
      <section className="py-24 px-6 relative z-10 border-t border-white/5 bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal direction="up">
            <div className="text-center mb-20">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter mb-4">A Billion-Dollar Architecture</h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">We didn't build a habit tracker. We built a hyper-intelligent, predictive neuro-engine designed to keep you in a flow state.</p>
            </div>
          </ScrollReveal>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <ScrollReveal delay={0.1} direction="up" className="lg:col-span-2">
              <div className="group h-full p-8 rounded-[2rem] bg-gradient-to-br from-zinc-900 to-black border border-white/10 hover:border-white/20 transition-all relative overflow-hidden">
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Network className="w-8 h-8 text-white mb-6" />
                <h3 className="text-2xl font-black text-white mb-3">Semantic Perfect Memory</h3>
                <p className="text-zinc-400 leading-relaxed text-sm">
                  Powered by pgvector and OpenAI. Your AI Coach, M.A.I., remembers every journal entry, every mood spike, and every habit failure. She contextualizes your entire history in milliseconds to give you terrifyingly accurate advice.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2} direction="up">
              <div className="group h-full p-8 rounded-[2rem] bg-gradient-to-br from-zinc-900 to-black border border-white/10 hover:border-white/20 transition-all relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Fingerprint className="w-8 h-8 text-emerald-400 mb-6" />
                <h3 className="text-xl font-black text-white mb-3">Wearable Biometric Sync</h3>
                <p className="text-zinc-400 leading-relaxed text-sm">
                  Connect Apple Health, Oura, or Whoop. M.A.I. monitors your HRV and sleep scores to predict when your willpower will break.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3} direction="up">
              <div className="group h-full p-8 rounded-[2rem] bg-gradient-to-br from-zinc-900 to-black border border-white/10 hover:border-white/20 transition-all relative overflow-hidden">
                <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Bell className="w-8 h-8 text-rose-400 mb-6" />
                <h3 className="text-xl font-black text-white mb-3">Predictive Intercepts</h3>
                <p className="text-zinc-400 leading-relaxed text-sm">
                  Our Web-Push Cron engine analyzes your Focus Prophecy timeline. If a crash is imminent, you receive a background push warning before you pick up the phone.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.4} direction="up" className="lg:col-span-2">
              <div className="group h-full p-8 rounded-[2rem] bg-gradient-to-br from-zinc-900 to-black border border-white/10 hover:border-white/20 transition-all relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Users className="w-8 h-8 text-indigo-400 mb-6" />
                  <h3 className="text-2xl font-black text-white mb-3">Multiplayer Squads</h3>
                  <p className="text-zinc-400 leading-relaxed text-sm mb-6">
                    Isolation breeds addiction. Create private, encrypted Squads with 6-digit invite codes. Track your team's live daily scores and streaks. If you start doomscrolling, M.A.I. warns you that you're letting the squad down.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-black z-30 flex items-center justify-center text-[10px] font-bold">N</div>
                  <div className="w-8 h-8 rounded-full bg-zinc-700 border-2 border-black -ml-4 z-20 flex items-center justify-center text-[10px] font-bold">S</div>
                  <div className="w-8 h-8 rounded-full bg-zinc-600 border-2 border-black -ml-4 z-10 flex items-center justify-center text-[10px] font-bold">+4</div>
                  <div className="ml-2 text-xs font-bold tracking-widest text-zinc-500 uppercase">Live Leaderboards</div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.5} direction="up" className="lg:col-span-2">
              <div className="group h-full p-8 rounded-[2rem] bg-gradient-to-br from-zinc-900 to-black border border-white/10 hover:border-white/20 transition-all relative overflow-hidden">
                <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Bot className="w-8 h-8 text-amber-400 mb-6" />
                <h3 className="text-2xl font-black text-white mb-3">Meet M.A.I. (MindFuel AI)</h3>
                <p className="text-zinc-400 leading-relaxed text-sm">
                  Powered by Llama 3 via Groq. M.A.I. isn't a chatbot. She is a continuous intelligence loop. She reads your biometric logs, queries your past semantic memories, analyzes your squad performance, and builds a personalized cognitive behavioral therapy session for you every morning.
                </p>
              </div>
            </ScrollReveal>

          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 px-6 border-t border-white/5 bg-black relative z-10">
         <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-black tracking-tight text-white mb-12">Trusted by founders, engineers, and creators.</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <div className="text-4xl font-black text-white mb-2">4.2M</div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Hours Saved</div>
              </div>
              <div>
                <div className="text-4xl font-black text-white mb-2">99.9%</div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Uptime</div>
              </div>
              <div>
                <div className="text-4xl font-black text-white mb-2">&lt;50ms</div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">AI Latency</div>
              </div>
              <div>
                <div className="text-4xl font-black text-white mb-2">10k+</div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active Squads</div>
              </div>
            </div>
         </div>
      </section>

      {/* Pricing / CTA */}
      <section className="py-32 px-6 border-t border-white/5 relative z-10 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-3xl -z-10" />
        <div className="max-w-3xl mx-auto text-center">
          <Brain className="w-12 h-12 text-white mx-auto mb-6" />
          <h2 className="text-5xl font-black text-white tracking-tighter mb-6">Upgrade your reality.</h2>
          <p className="text-xl text-zinc-400 mb-10 max-w-lg mx-auto">
            Join the elite few who have taken back control of their dopamine. Start your journey today.
          </p>
          <Link href="/signup" className="inline-flex px-10 py-5 text-lg font-black text-black bg-white rounded-full hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]">
            Begin Free Trial
          </Link>
          <p className="text-sm text-zinc-600 mt-6 font-bold">14-day free trial. Then $15/month.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 relative z-10 bg-black">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-white" />
            <span className="text-lg font-black tracking-tight text-white">MindFuel</span>
          </div>
          <div className="text-sm font-bold text-zinc-600">
            © {new Date().getFullYear()} MindFuel OS. Built for greatness.
          </div>
        </div>
      </footer>
    </div>
  )
}
