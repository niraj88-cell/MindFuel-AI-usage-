import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  Network,
  PenLine,
  Sparkles,
  Users,
} from 'lucide-react'
import { AnimatedBackground } from '@/components/landing/AnimatedBackground'
import { ScrollReveal } from '@/components/landing/ScrollReveal'

export const metadata: Metadata = {
  title: 'MindFuel - Digital Wellness for Screen Time',
  description:
    'MindFuel helps you log digital content, understand how it affects your mood and focus, and choose one better next move.',
  alternates: {
    canonical: 'https://getmindfuel.vercel.app',
  },
}

const CORE_STEPS = [
  {
    title: 'Log what you consumed',
    body: 'Capture a scroll session, video, article, podcast, or app moment in seconds.',
    icon: PenLine,
  },
  {
    title: 'See the effect',
    body: 'MindFuel connects content, mood, focus, timing, and patterns into a clear daily signal.',
    icon: BarChart3,
  },
  {
    title: 'Take one better step',
    body: 'Get a practical reset, swap, focus block, or reflection instead of another vague dashboard.',
    icon: CheckCircle2,
  },
]

const FEATURE_CARDS = [
  {
    title: 'Today',
    body: 'A calm daily view of your mental energy, recent logs, and the one action that matters now.',
    icon: Network,
  },
  {
    title: 'Insights',
    body: 'Patterns across content, mood, focus, and time of day without making you interpret raw charts.',
    icon: Sparkles,
  },
  {
    title: 'Coach',
    body: 'AI guidance that uses your actual history to help you reset, reflect, and plan.',
    icon: Bot,
  },
  {
    title: 'Squad',
    body: 'Private circles for daily check-ins, supportive nudges, and simple shared missions.',
    icon: Users,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-slate-200 selection:bg-white/20 flex flex-col font-sans relative overflow-x-hidden">
      <AnimatedBackground variant="landing" />

      <nav className="w-full border-b border-white/5 bg-black/60 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center transition-all group-hover:scale-105 shadow-[0_0_15px_rgba(255,255,255,0.25)]">
              <Network className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white">MindFuel</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-bold text-zinc-400 hover:text-white transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/signup" className="px-5 py-2 text-sm font-black tracking-wide text-black bg-white rounded-full hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.18)]">
              Start free
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 px-4 sm:px-6 pt-20 pb-14">
        <section className="max-w-6xl mx-auto min-h-[calc(100vh-7rem)] flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-zinc-400 mb-6 animate-fade-in-up">
            <Sparkles className="w-3 h-3 text-white" />
            <span>Private digital wellness tracking</span>
          </div>

          <h1 className="max-w-5xl text-5xl sm:text-7xl md:text-8xl font-black text-white leading-[0.95] tracking-tighter mb-8 animate-fade-in-up">
            Understand how screen time affects your mood and focus.
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 font-medium leading-relaxed animate-fade-in-up">
            Log what you consumed, see the mental impact, and get one clear next action. No guilt, no noisy dashboard, just better awareness.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-12 animate-fade-in-up">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-4 text-base font-black text-black bg-white rounded-full hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2">
              Start free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 text-base font-black text-white bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all">
              Sign in
            </Link>
          </div>

          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-3 text-left animate-fade-in-up">
            {CORE_STEPS.map((step) => (
              <div key={step.title} className="bg-zinc-950/70 border border-white/10 rounded-2xl p-5 backdrop-blur-2xl">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <step.icon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-base font-black text-white mb-2">{step.title}</h2>
                <p className="text-sm leading-relaxed text-zinc-400">{step.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 w-full max-w-4xl rounded-3xl border border-white/10 bg-zinc-950/70 backdrop-blur-2xl p-4 sm:p-6 text-left shadow-2xl animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              <div className="w-24 h-24 rounded-3xl bg-white text-black flex flex-col items-center justify-center shrink-0">
                <span className="text-4xl font-black leading-none">72</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Today</span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Latest insight</p>
                <h2 className="text-2xl font-serif text-white mb-2">Short video sessions after 9 PM are pulling your focus down tomorrow.</h2>
                <p className="text-sm text-zinc-400">Try a 20-minute focus block before your next scroll session. MindFuel will compare the shift tomorrow.</p>
              </div>
              <div className="md:w-48 rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 mb-3">
                  <Bell className="w-4 h-4" />
                  Suggested reset
                </div>
                <p className="text-sm text-white font-medium">Swap one late scroll for a saved article or reflection.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <section className="py-24 px-6 relative z-10 border-t border-white/5 bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal direction="up">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter mb-4">Built around the daily loop.</h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                MindFuel is not another generic dashboard. Each surface is designed to move you from awareness to one useful action.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURE_CARDS.map((feature, index) => (
              <ScrollReveal key={feature.title} delay={0.1 + index * 0.1} direction="up">
                <div className="group h-full p-7 rounded-2xl bg-gradient-to-br from-zinc-900 to-black border border-white/10 hover:border-white/20 transition-all relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <feature.icon className="w-7 h-7 text-white mb-6 relative z-10" />
                  <h3 className="text-xl font-black text-white mb-3 relative z-10">{feature.title}</h3>
                  <p className="text-zinc-400 leading-relaxed text-sm relative z-10">{feature.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-white/5 bg-black relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black tracking-tight text-white mb-12">Designed for private, repeatable awareness.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
              <div className="text-4xl font-black text-white mb-2">1 min</div>
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">to log a moment</div>
            </div>
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
              <div className="text-4xl font-black text-white mb-2">7 days</div>
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">to see patterns</div>
            </div>
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
              <div className="text-4xl font-black text-white mb-2">1 action</div>
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">recommended at a time</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-28 px-6 border-t border-white/5 relative z-10 overflow-hidden">
        <div className="max-w-3xl mx-auto text-center">
          <Network className="w-12 h-12 text-white mx-auto mb-6" />
          <h2 className="text-5xl font-black text-white tracking-tighter mb-6">Start with one log.</h2>
          <p className="text-xl text-zinc-400 mb-10 max-w-lg mx-auto">
            Give MindFuel one recent scroll session, video, or article. You will see the product value immediately.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-10 py-5 text-lg font-black text-black bg-white rounded-full hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.24)]">
            Start free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12 px-6 relative z-10 bg-black">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-white" />
            <span className="text-lg font-black tracking-tight text-white">MindFuel</span>
          </div>
          <div className="text-sm font-bold text-zinc-600">
            &copy; {new Date().getFullYear()} MindFuel. Private digital wellness tracking.
          </div>
        </div>
      </footer>
    </div>
  )
}
