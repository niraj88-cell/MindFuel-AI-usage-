// app/(app)/subscription/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { Check, Sparkles, Smartphone, ShieldCheck, Zap, BarChart3, MessageCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function SubscriptionPage() {
  const [tier, setTier] = useState<'free' | 'premium'>('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStatus() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .maybeSingle()

      setTier(data?.subscription_tier || 'free')
      setLoading(false)
    }
    loadStatus()
  }, [])

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">MindFuel Platinum</h1>
        <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">
          Upgrade your mental metabolism with advanced AI coaching and unlimited insights.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 pt-8">
        {/* Free Plan */}
        <Card className="bg-zinc-900/50 border-white/10 relative overflow-hidden flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Standard</span>
              <span className="text-sm font-medium text-[var(--muted-foreground)]">Free</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-3xl font-black">$0</div>
            <ul className="space-y-3">
              <FeatureItem label="3 Daily Entries" active variant="dark" />
              <FeatureItem label="Basic AI Analysis" active variant="dark" />
              <FeatureItem label="Public Challenges" active variant="dark" />
              <FeatureItem label="Weekly Summary Trends" variant="dark" />
              <FeatureItem label="Always-On AI Coach" variant="dark" />
            </ul>
            {tier === 'free' && (
               <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white cursor-default" disabled>
                 Current Plan
               </Button>
            )}
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className="!bg-none !bg-white border-white/10 relative overflow-hidden flex flex-col justify-between scale-[1.02] md:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.1)] z-10">
          <div className="absolute top-0 right-0 px-3 py-1 bg-black text-[10px] font-black uppercase tracking-widest text-white rounded-bl-lg">
            Recommended
          </div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Platinum</span>
              <Sparkles className="w-5 h-5 text-black" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-3xl font-black text-black">$9.99 <span className="text-sm font-normal text-zinc-500">/mo</span></div>
            <ul className="space-y-3">
              <FeatureItem label="Unlimited Daily Entries" active variant="light" />
              <FeatureItem label="Deep Psychological Insights" active variant="light" />
              <FeatureItem label="Bespoke Habit Challenges" active variant="light" />
              <FeatureItem label="Never Lose Coaching History" active variant="light" />
              <FeatureItem label="Export Data (PDF/CSV)" active variant="light" />
              <FeatureItem label="Beta Access to New Tools" active variant="light" />
            </ul>
            
            {tier === 'premium' ? (
               <Button className="w-full bg-black hover:bg-zinc-800 text-white cursor-default" disabled>
                 <ShieldCheck className="w-4 h-4 mr-2" />
                 Active Platinum
               </Button>
            ) : (
              <Button 
                onClick={handleUpgrade} 
                disabled={loading}
                className="w-full bg-black hover:bg-zinc-800 text-white h-12 text-lg font-bold"
              >
                {loading ? 'Preparing Checkout...' : 'Start Platinum Subscription'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Integration Info */}
      <div className="grid md:grid-cols-3 gap-6 pt-12">
        <InfoBox icon={Zap} title="Instant Sync" desc="Upgrade on your phone and see the changes here immediately." />
        <InfoBox icon={BarChart3} title="Deep Analysis" desc="Unlock historical data and trend mapping." />
        <InfoBox icon={MessageCircle} title="Smart Coach" desc="24/7 access to your personalized wellness bot." />
      </div>
    </div>
  )
}

function FeatureItem({ label, active, variant = 'light' }: { label: string; active?: boolean; variant?: 'light' | 'dark' }) {
  const activeColor = variant === 'light' ? 'text-black' : 'text-white'
  const inactiveColor = variant === 'light' ? 'text-zinc-400' : 'text-zinc-500'
  const checkColor = variant === 'light' ? 'text-black' : 'text-white'
  const inactiveCheckColor = variant === 'light' ? 'text-zinc-300' : 'text-zinc-600'

  return (
    <li className={`flex items-center gap-3 text-sm ${active ? activeColor : inactiveColor}`}>
      <Check className={`w-4 h-4 ${active ? checkColor : inactiveCheckColor}`} />
      {label}
    </li>
  )
}

function InfoBox({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="text-center space-y-2 p-6 bg-zinc-900/30 border border-white/10 rounded-3xl">
      <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-white mx-auto">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-bold text-sm">{title}</h3>
      <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  )
}
