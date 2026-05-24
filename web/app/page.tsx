// app/page.tsx — Ultra-Premium Landing Page
import Link from 'next/link'
import { 
  ArrowRight, 
  Brain, 
  BarChart3, 
  Sparkles, 
  Shield, 
  Zap, 
  MessageCircle,
  Play,
  MessageSquare,
  Globe,
  ChevronRight,
  Activity,
  Target,
  Flame
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0b0f1a] text-slate-200 overflow-x-hidden selection:bg-indigo-500/30">
      {/* Dynamic Background Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 blur-[160px] rounded-full animate-pulse" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[160px] rounded-full" />
         <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-500/5 blur-[160px] rounded-full" />
      </div>

      {/* Sticky Premium Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0b0f1a]/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
               <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white">
              MindFuel <span className="text-indigo-500">Pro</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
             <NavLink label="Features" />
             <NavLink label="Intelligence" />
             <NavLink label="Pricing" />
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-bold text-white bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/10"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2.5 bg-white text-[#0b0f1a] rounded-xl font-black text-sm hover:scale-105 transition-all shadow-xl shadow-white/10 active:scale-95"
            >
              Get Access
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-40 pb-20 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-10 animate-fade-in-up">
          <Sparkles className="w-3.5 h-3.5 fill-indigo-400" /> 
          Your Digital Diet Tracker
        </div>

        <h1 className="text-6xl md:text-8xl font-black leading-[0.95] tracking-tight text-white mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Stop Mindless<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 animate-gradient-x">
            Scrolling.
          </span>
        </h1>

        <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-12 font-medium leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          MindFuel is your personal AI coach for digital habits. Track how the content you consume affects your mood, break doomscrolling loops, and build a healthier relationship with your screens.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <Link
            href="/signup"
            className="group relative px-10 py-5 bg-indigo-600 rounded-[28px] overflow-hidden transition-all shadow-2xl shadow-indigo-600/30 hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-3 text-white font-black text-lg">
               Start for Free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-10 py-5 bg-slate-800/40 border border-white/5 rounded-[28px] font-black text-lg hover:bg-slate-800/60 transition-all text-white"
          >
            Go to Dashboard <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="mt-24 relative animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
           <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-[100px] rounded-[60px]" />
           <div className="relative glass-card border-none bg-slate-900/80 rounded-[60px] p-4 md:p-8 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                 <div className="md:col-span-8 h-80 md:h-[500px] bg-slate-800/50 rounded-[40px] border border-white/5 p-8 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <Activity className="w-5 h-5 text-indigo-400" />
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500">Live Telemetry</span>
                       </div>
                       <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                       </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                       <div className="text-center">
                          <p className="text-[120px] font-black text-white leading-none tracking-tighter">84</p>
                          <p className="text-sm font-black uppercase tracking-[0.4em] text-indigo-400 -mt-2">Peak Optimization</p>
                       </div>
                    </div>
                 </div>
                 <div className="md:col-span-4 space-y-8">
                    <MockupCard icon={Target} title="Missions" val="12/15" color="text-emerald-400" />
                    <MockupCard icon={Flame} title="Streak" val="28 Days" color="text-orange-500" />
                    <MockupCard icon={MessageCircle} title="Coach AI" val="Active" color="text-indigo-400" />
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Features - High Performance Grid */}
      <section className="max-w-7xl mx-auto px-6 py-40 border-t border-white/5">
        <div className="flex flex-col md:flex-row gap-12 items-end justify-between mb-24">
           <div className="max-w-2xl">
              <h2 className="text-5xl font-black text-white mb-6">Build healthier <br /><span className="text-indigo-500">digital habits.</span></h2>
              <p className="text-lg text-slate-400 font-medium">Screen time tracking isn't enough. MindFuel helps you understand the *quality* of what you consume and how it impacts your mental wellbeing.</p>
           </div>
           <Link href="/signup" className="text-indigo-400 font-black flex items-center gap-2 hover:gap-4 transition-all">
              EXPLORE ALL MODULES <ChevronRight className="w-4 h-4" />
           </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger-children">
          <FeatureCard 
            icon={Zap} 
            title="AI Content Analysis" 
            desc="Paste any link or describe what you're watching. Our AI instantly scores its impact on your mental health and suggests better alternatives." 
            accent="indigo" 
          />
          <FeatureCard 
            icon={Activity} 
            title="Mood Tracking" 
            desc="Log how your screen time makes you feel. Visualize your weekly trends and identify exactly which apps are draining your energy." 
            accent="emerald" 
          />
          <FeatureCard 
            icon={MessageCircle} 
            title="Personal AI Coach" 
            desc="Chat with an AI that understands your digital habits. Get personalized strategies to regain focus and beat content addiction." 
            accent="purple" 
          />
        </div>
      </section>

      {/* Social Proof / Footer */}
      <footer className="border-t border-white/5 bg-slate-900/20 py-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-indigo-500" />
              <span className="text-2xl font-black text-white">MindFuel</span>
            </div>
            <p className="text-slate-500 max-w-sm font-medium">
              Join the 50,000+ elite performers optimizing their cognitive nutrition with MindFuel.
            </p>
            <div className="flex gap-4">
               <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors cursor-pointer"><Globe size={18} /></div>
               <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors cursor-pointer"><MessageSquare size={18} /></div>
            </div>
          </div>
          
          <div className="space-y-4">
             <h4 className="text-xs font-black uppercase tracking-widest text-white">Product</h4>
             <ul className="space-y-2 text-sm font-bold text-slate-500">
                <li className="hover:text-indigo-400 transition-colors cursor-pointer">Neural Engine</li>
                <li className="hover:text-indigo-400 transition-colors cursor-pointer">AI Coaching</li>
                <li className="hover:text-indigo-400 transition-colors cursor-pointer">Enterprise</li>
             </ul>
          </div>
          
          <div className="space-y-4">
             <h4 className="text-xs font-black uppercase tracking-widest text-white">Company</h4>
             <ul className="space-y-2 text-sm font-bold text-slate-500">
                <li className="hover:text-indigo-400 transition-colors cursor-pointer">Privacy First</li>
                <li className="hover:text-indigo-400 transition-colors cursor-pointer">Ethics Board</li>
                <li className="hover:text-indigo-400 transition-colors cursor-pointer">Open Source</li>
             </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-600">
           <p>&copy; 2026 MindFuel Intelligence Systems. All Rights Reserved.</p>
           <p>Encrypted • Decentralized • Neural</p>
        </div>
      </footer>
    </div>
  )
}

function NavLink({ label }: { label: string }) {
  return (
    <button className="text-sm font-black text-slate-500 hover:text-white transition-all cursor-pointer">
      {label}
    </button>
  )
}

function FeatureCard({ icon: Icon, title, desc, accent }: { icon: any; title: string; desc: string; accent: string }) {
  const accentClass = accent === 'indigo' ? 'text-indigo-400' : accent === 'emerald' ? 'text-emerald-400' : 'text-purple-400'
  const accentBg = accent === 'indigo' ? 'bg-indigo-500/10' : accent === 'emerald' ? 'bg-emerald-500/10' : 'bg-purple-500/10'
  
  return (
    <div className="glass-card group p-10 bg-slate-900/40 border border-white/5 rounded-[40px] hover:bg-slate-800/40 transition-all hover:-translate-y-2">
      <div className={`w-14 h-14 ${accentBg} rounded-2xl flex items-center justify-center mb-8 border border-white/5 group-hover:scale-110 transition-transform`}>
        <Icon className={`w-7 h-7 ${accentClass}`} />
      </div>
      <h3 className="text-2xl font-black text-white mb-4">{title}</h3>
      <p className="text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
  )
}

function MockupCard({ icon: Icon, title, val, color }: { icon: any; title: string; val: string; color: string }) {
  return (
    <div className="bg-slate-800/40 rounded-[32px] p-6 border border-white/5 flex items-center justify-between">
       <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
             <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</p>
       </div>
       <p className="text-lg font-black text-white">{val}</p>
    </div>
  )
}
