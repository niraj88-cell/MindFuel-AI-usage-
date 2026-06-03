import Link from 'next/link'
import { Brain, ArrowRight, Shield, Zap, Activity, CheckCircle2, Sparkles, Timer, Wind, Target } from 'lucide-react'
import { InteractiveHero } from '@/components/landing/InteractiveHero'
import { AnimatedBackground } from '@/components/landing/AnimatedBackground'
import { ScrollReveal } from '@/components/landing/ScrollReveal'
import { AnimatedBrain } from '@/components/landing/AnimatedBrain'
import { StatsCounter } from '@/components/landing/StatsCounter'
import { TestimonialCarousel } from '@/components/landing/TestimonialCarousel'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MindFuel — AI-Powered Focus & Productivity App | Track Your Digital Wellness',
  description: 'MindFuel is the AI-powered focus and productivity app that tracks your digital content consumption, builds healthier habits, and provides personalized coaching. Focus timer, mood tracking, habit streaks & AI insights. Start free today.',
  alternates: {
    canonical: 'https://getmindfuel.vercel.app',
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-slate-200 selection:bg-indigo-500/30 flex flex-col font-sans relative overflow-x-hidden">
      <AnimatedBackground variant="landing" />

      {/* Minimal Navbar */}
      <nav className="w-full border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
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
              Begin Your Map
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center pt-20 pb-8 px-4 sm:px-6 max-w-4xl mx-auto text-center relative z-10">
        
        <div className="mb-8 animate-fade-in-up">
          <AnimatedBrain size={80} />
        </div>

        {/* Headline with word reveal */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white leading-[1.1] tracking-tight mb-6">
          <span className="inline-block word-reveal" style={{ animationDelay: '0.1s' }}>Understand</span>{' '}
          <span className="inline-block word-reveal" style={{ animationDelay: '0.2s' }}>your</span>{' '}
          <span className="inline-block word-reveal" style={{ animationDelay: '0.3s' }}>mind.</span>{' '}
          <br className="hidden sm:block" />
          <span className="inline-block word-reveal text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" style={{ animationDelay: '0.4s' }}>Elevate</span>{' '}
          <span className="inline-block word-reveal text-zinc-500" style={{ animationDelay: '0.5s' }}>your</span>{' '}
          <span className="inline-block word-reveal text-zinc-500" style={{ animationDelay: '0.6s' }}>life.</span>
        </h1>

        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 font-medium leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
          The first mental operating system that reveals how your digital diet shapes your emotional reality. Discover patterns, build clarity, and return to center.
        </p>

        <div className="animate-fade-in-up" style={{ animationDelay: '1.2s', width: '100%' }}>
          <InteractiveHero />
        </div>
      </main>

      <div className="relative z-10">
        <StatsCounter />
      </div>

      {/* How It Works */}
      <section className="border-t border-white/5 bg-zinc-900/20 py-20 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal direction="up">
            <div className="text-center mb-16">
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">How it works</h2>
              <p className="text-zinc-500 text-sm">Three steps. Thirty seconds. Total clarity.</p>
            </div>
          </ScrollReveal>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ScrollReveal delay={0.1} direction="up">
              <StepCard step="01" title="Log" desc="Tell MindFuel what you just watched, scrolled, or listened to. Type it, speak it, or pick from a quick preset." />
            </ScrollReveal>
            <ScrollReveal delay={0.2} direction="up">
              <StepCard step="02" title="Score" desc="AI instantly rates the mental impact on a 0–100 scale. See exactly how that content affected your mood." />
            </ScrollReveal>
            <ScrollReveal delay={0.3} direction="up">
              <StepCard step="03" title="Grow" desc="Get personalized AI coaching to shift your habits. Track your streak. Watch your mental score rise over time." />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Full Feature Showcase */}
      <section className="border-t border-white/5 py-20 px-6 bg-black relative z-10">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">Everything you need to take back control</h2>
              <p className="text-zinc-500 text-sm">Not just another screen time tracker. A complete system for your digital wellbeing.</p>
            </div>
          </ScrollReveal>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: "AI Content Scanner", desc: "Describe what you just watched. AI instantly scores the mental impact and categorizes it." },
              { icon: Activity, title: "Mood Tracking", desc: "Log how you feel before and after screen time. Discover which apps drain you and which energize you." },
              { icon: Shield, title: "AI Coach", desc: "Chat with an AI that actually knows your patterns. Get personalized strategies to break content addiction." },
              { icon: Timer, title: "Focus Timer", desc: "Commit to phone-free blocks with a built-in Pomodoro timer. Track your focus hours and build your streak." },
              { icon: Wind, title: "Mindful Intercept", desc: "A breathing pause before you open distracting apps. State your intent. Break the autopilot cycle." },
              { icon: Target, title: "Habit Challenges", desc: "7-day guided challenges like 'Digital Detox Morning'. Rewire your digital habits with structure." }
            ].map((f, i) => (
              <ScrollReveal key={f.title} delay={0.1 * i} direction="up">
                <FeatureCard icon={f.icon} title={f.title} desc={f.desc} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-t border-white/5 bg-zinc-900/20 py-24 px-6 relative z-10">
        <ScrollReveal direction="scale">
          <TestimonialCarousel />
        </ScrollReveal>
      </section>

      {/* Pricing Bento Box */}
      <section id="pricing" className="border-t border-white/5 py-24 px-6 bg-black relative z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-white/[0.02] blur-[100px] rounded-full pointer-events-none"></div>
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">Start understanding your mind</h2>
              <p className="text-lg text-zinc-400">Most of what you need is free. Upgrade when you want deeper insights.</p>
            </div>
          </ScrollReveal>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <ScrollReveal delay={0.1} direction="left">
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
            </ScrollReveal>
            
            <ScrollReveal delay={0.2} direction="right">
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
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* What is MindFuel? — Featured Snippet Section */}
      <section id="what-is-mindfuel" className="border-t border-white/5 bg-zinc-900/20 py-20 px-6 relative z-10">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal direction="up">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-6 text-center">What is MindFuel?</h2>
            <p className="text-zinc-400 text-base sm:text-lg leading-relaxed">
              MindFuel is an AI-powered focus and productivity app that serves as your mental nutrition tracker. It analyzes your digital content consumption — what you watch, scroll, and listen to — and reveals how it affects your mood and focus. With features like an AI content scanner, focus timer, mood tracking, habit challenges, and personalized AI coaching, MindFuel helps you build healthier digital habits and reclaim an average of 2+ hours per day. Available as a web app with a free plan and a Platinum plan at $9.99/month.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* FAQ Section — Rich Results */}
      <section id="faq" className="border-t border-white/5 bg-black py-20 px-6 relative z-10">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal direction="up">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">Frequently Asked Questions</h2>
              <p className="text-zinc-500 text-sm">Everything you need to know about MindFuel.</p>
            </div>
          </ScrollReveal>

          <div className="space-y-4">
            <ScrollReveal delay={0.1} direction="up">
              <details className="group border border-white/10 rounded-2xl bg-zinc-900/40 transition-colors hover:border-white/20">
                <summary className="cursor-pointer list-none px-6 py-5 text-white font-bold text-sm sm:text-base flex items-center justify-between">
                  How does MindFuel track my digital content?
                  <span className="ml-4 text-zinc-500 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <div className="px-6 pb-5 text-zinc-400 text-sm leading-relaxed">
                  Simply tell MindFuel what you just watched, scrolled, or listened to. You can type it, speak it, or pick from quick presets. Our AI instantly scores the mental impact on a 0-100 scale and categorizes the content to reveal your digital consumption patterns.
                </div>
              </details>
            </ScrollReveal>

            <ScrollReveal delay={0.15} direction="up">
              <details className="group border border-white/10 rounded-2xl bg-zinc-900/40 transition-colors hover:border-white/20">
                <summary className="cursor-pointer list-none px-6 py-5 text-white font-bold text-sm sm:text-base flex items-center justify-between">
                  Is MindFuel free to use?
                  <span className="ml-4 text-zinc-500 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <div className="px-6 pb-5 text-zinc-400 text-sm leading-relaxed">
                  Yes! MindFuel offers a generous free plan that includes 3 content scans per day, AI Coach conversations, Focus Timer, Mood Tracking, and Habit Challenges. For unlimited scans, 30-day pattern analysis, custom AI challenges, and priority coaching, upgrade to Platinum at $9.99/month.
                </div>
              </details>
            </ScrollReveal>

            <ScrollReveal delay={0.2} direction="up">
              <details className="group border border-white/10 rounded-2xl bg-zinc-900/40 transition-colors hover:border-white/20">
                <summary className="cursor-pointer list-none px-6 py-5 text-white font-bold text-sm sm:text-base flex items-center justify-between">
                  What makes MindFuel different from other productivity apps?
                  <span className="ml-4 text-zinc-500 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <div className="px-6 pb-5 text-zinc-400 text-sm leading-relaxed">
                  Unlike traditional productivity apps that only track time or tasks, MindFuel is the first mental operating system that analyzes the quality of your digital consumption. It connects what you consume to how you feel, providing AI-powered insights that go beyond screen time statistics.
                </div>
              </details>
            </ScrollReveal>

            <ScrollReveal delay={0.25} direction="up">
              <details className="group border border-white/10 rounded-2xl bg-zinc-900/40 transition-colors hover:border-white/20">
                <summary className="cursor-pointer list-none px-6 py-5 text-white font-bold text-sm sm:text-base flex items-center justify-between">
                  Does MindFuel have an AI Coach?
                  <span className="ml-4 text-zinc-500 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <div className="px-6 pb-5 text-zinc-400 text-sm leading-relaxed">
                  Yes, MindFuel includes a personalized AI Coach that actually knows your patterns. It provides customized strategies to break content addiction, suggests healthier alternatives, and guides you through digital wellness challenges — all based on your real usage data.
                </div>
              </details>
            </ScrollReveal>

            <ScrollReveal delay={0.3} direction="up">
              <details className="group border border-white/10 rounded-2xl bg-zinc-900/40 transition-colors hover:border-white/20">
                <summary className="cursor-pointer list-none px-6 py-5 text-white font-bold text-sm sm:text-base flex items-center justify-between">
                  Can I use MindFuel for focus and deep work?
                  <span className="ml-4 text-zinc-500 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <div className="px-6 pb-5 text-zinc-400 text-sm leading-relaxed">
                  Absolutely. MindFuel includes a built-in Pomodoro-style focus timer that helps you commit to phone-free blocks. Track your focus hours, build streaks, and see exactly how much genuinely productive time you achieve each day.
                </div>
              </details>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-14 px-6 text-sm text-zinc-600 font-medium relative z-10 bg-black">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                  <Brain className="w-4 h-4 text-black" />
                </div>
                <span className="font-black text-white">MindFuel</span>
              </div>
              <p className="text-zinc-500 text-xs leading-relaxed">Your AI-powered mental nutrition tracker for better focus, productivity, and digital wellness.</p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-4">Product</h4>
              <ul className="space-y-2.5">
                <li><Link href="/signup" className="hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Focus Timer</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">AI Coach</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Challenges</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-4">Company</h4>
              <ul className="space-y-2.5">
                <li><Link href="#what-is-mindfuel" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p>&copy; {new Date().getFullYear()} MindFuel. All rights reserved.</p>
            <a href="https://fazier.com/launches/mindfuel" target="_blank" rel="noopener noreferrer" className="opacity-80 hover:opacity-100 transition-opacity">
              <img src="https://fazier.com/badge.svg" alt="Launched on Fazier" className="h-8" />
            </a>
          </div>

          <p className="text-center text-zinc-600 text-xs mt-8">MindFuel — Your AI-powered mental nutrition tracker for better focus, productivity, and digital wellness.</p>
        </div>
      </footer>
    </div>
  )
}

function StepCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="p-6 sm:p-8 bg-zinc-900/50 border border-white/5 rounded-2xl hover:bg-zinc-800/50 hover-lift transition-all text-left group">
      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-white transition-colors">Step {step}</span>
      <h3 className="text-2xl font-black text-white mt-2 mb-3">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="p-6 sm:p-8 bg-zinc-900/50 border border-white/5 rounded-2xl hover:bg-zinc-800/50 hover-lift transition-all group">
      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-white/10 transition-all">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-black text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}
