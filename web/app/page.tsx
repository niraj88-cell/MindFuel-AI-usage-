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
import { DemoScanner } from '@/components/landing/DemoScanner'

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
    <div className="min-h-screen bg-[#FAF8F4] text-[#111827] selection:bg-[#4CAF50]/20 flex flex-col font-sans relative overflow-x-hidden">
      <AnimatedBackground variant="landing" />

      <nav className="w-full border-b border-black/[0.04] bg-[#FAF8F4]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-[#111827] rounded-xl flex items-center justify-center transition-all group-hover:scale-105 shadow-sm">
              <Network className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#111827]">MindFuel</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-[#4B5563] hover:text-[#111827] transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/signup" className="px-5 py-2 text-sm font-semibold tracking-wide text-white bg-[#111827] rounded-full hover:bg-[#1f2937] transition-all shadow-sm">
              Start free
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 px-4 sm:px-6 pt-20 pb-14">
        <section className="max-w-6xl mx-auto min-h-[calc(100vh-7rem)] flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4CAF50]/8 border border-[#4CAF50]/15 text-xs font-medium text-[#4CAF50] mb-6 animate-fade-in-up">
            <Sparkles className="w-3 h-3 text-[#4CAF50]" />
            <span>Private digital wellness tracking</span>
          </div>

          <h1 className="max-w-5xl text-5xl sm:text-7xl md:text-8xl font-bold text-[#111827] leading-[0.95] tracking-tight mb-8 animate-fade-in-up" style={{ fontFamily: 'var(--font-serif)' }}>
            Understand how screen time affects your mind.
          </h1>

          <p className="text-lg md:text-xl text-[#4B5563] max-w-2xl mx-auto mb-10 font-normal leading-relaxed animate-fade-in-up">
            Log what you consumed, see the mental impact, and get one clear next action. No guilt, no noisy dashboard — just better awareness.
          </p>

          <DemoScanner />

          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-3 text-left animate-fade-in-up">
            {CORE_STEPS.map((step) => (
              <div key={step.title} className="bg-white border border-black/[0.04] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#F5F7F6] border border-black/[0.06] flex items-center justify-center mb-4">
                  <step.icon className="w-5 h-5 text-[#111827]" />
                </div>
                <h2 className="text-base font-semibold text-[#111827] mb-2">{step.title}</h2>
                <p className="text-sm leading-relaxed text-[#4B5563]">{step.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 w-full max-w-4xl rounded-2xl border border-black/[0.04] bg-white p-4 sm:p-6 text-left shadow-sm animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              <div className="w-24 h-24 rounded-2xl bg-[#111827] text-white flex flex-col items-center justify-center shrink-0 shadow-md">
                <span className="text-4xl font-bold leading-none">72</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest opacity-70">Today</span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.2em] mb-2">Latest insight</p>
                <h2 className="text-2xl text-[#111827] mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Short video sessions after 9 PM are pulling your focus down tomorrow.</h2>
                <p className="text-sm text-[#4B5563]">Try a 20-minute focus block before your next scroll session. MindFuel will compare the shift tomorrow.</p>
              </div>
              <div className="md:w-48 rounded-xl bg-[#F5F7F6] border border-black/[0.06] p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-[#4B5563] mb-3">
                  <Bell className="w-4 h-4" />
                  Suggested reset
                </div>
                <p className="text-sm text-[#111827] font-medium">Swap one late scroll for a saved article or reflection.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <section className="py-24 px-6 relative z-10 border-t border-black/[0.04] bg-[#F5F7F6]">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal direction="up">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-bold text-[#111827] tracking-tight mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Built around the daily loop.</h2>
              <p className="text-[#4B5563] text-lg max-w-2xl mx-auto">
                MindFuel is not another generic dashboard. Each surface is designed to move you from awareness to one useful action.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURE_CARDS.map((feature, index) => (
              <ScrollReveal key={feature.title} delay={0.1 + index * 0.1} direction="up">
                <div className="group h-full p-7 rounded-2xl bg-white border border-black/[0.04] hover:border-black/[0.1] hover:shadow-md transition-all relative overflow-hidden shadow-sm">
                  <div className="absolute inset-0 bg-[#F5F7F6] opacity-0 group-hover:opacity-50 transition-opacity" />
                  <feature.icon className="w-7 h-7 text-[#111827] mb-6 relative z-10" />
                  <h3 className="text-xl font-semibold text-[#111827] mb-3 relative z-10">{feature.title}</h3>
                  <p className="text-[#4B5563] leading-relaxed text-sm relative z-10">{feature.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-black/[0.04] bg-[#FAF8F4] relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#111827] mb-12" style={{ fontFamily: 'var(--font-serif)' }}>Designed for private, repeatable awareness.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-white border border-black/[0.04] p-6 shadow-sm">
              <div className="text-4xl font-bold text-[#111827] mb-2" style={{ fontFamily: 'var(--font-serif)' }}>1 min</div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-widest">to log a moment</div>
            </div>
            <div className="rounded-2xl bg-white border border-black/[0.04] p-6 shadow-sm">
              <div className="text-4xl font-bold text-[#111827] mb-2" style={{ fontFamily: 'var(--font-serif)' }}>7 days</div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-widest">to see patterns</div>
            </div>
            <div className="rounded-2xl bg-white border border-black/[0.04] p-6 shadow-sm">
              <div className="text-4xl font-bold text-[#111827] mb-2" style={{ fontFamily: 'var(--font-serif)' }}>1 action</div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-widest">recommended at a time</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-28 px-6 border-t border-black/[0.04] relative z-10 overflow-hidden bg-[#FAF8F4]">
        <div className="max-w-3xl mx-auto text-center">
          <Network className="w-12 h-12 text-[#111827] mx-auto mb-6" />
          <h2 className="text-5xl font-bold text-[#111827] tracking-tight mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Start with one log.</h2>
          <p className="text-xl text-[#4B5563] mb-10 max-w-lg mx-auto">
            Give MindFuel one recent scroll session, video, or article. You will see the product value immediately.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-10 py-5 text-lg font-semibold text-white bg-[#111827] rounded-full hover:bg-[#1f2937] hover:scale-[1.02] transition-all shadow-md">
            Start free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-black/[0.04] py-12 px-6 relative z-10 bg-[#FAF8F4]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-[#111827]" />
            <span className="text-lg font-bold tracking-tight text-[#111827]">MindFuel</span>
          </div>
          <div className="text-sm font-medium text-gray-400">
            &copy; {new Date().getFullYear()} MindFuel. Private digital wellness tracking.
          </div>
        </div>
      </footer>
    </div>
  )
}
