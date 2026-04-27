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
        <h1 className="text-4xl font-black tracking-tight">MindFuel Platinum</h1>
        <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">
          Upgrade your mental metabolism with advanced AI coaching and unlimited insights.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 pt-8">
        {/* Free Plan */}
        <Card className="bg-slate-900/50 border-white/5 relative overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Standard</span>
              <span className="text-sm font-medium text-[var(--muted-foreground)]">Free</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-3xl font-black">$0</div>
            <ul className="space-y-3">
              <FeatureItem label="3 Daily Logs" active />
              <FeatureItem label="Basic AI Analysis" active />
              <FeatureItem label="Public Challenges" active />
              <FeatureItem label="Weekly Summary" />
              <FeatureItem label="Unlimited AI Coach" />
            </ul>
            {tier === 'free' && (
               <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white cursor-default" disabled>
                 Current Plan
               </Button>
            )}
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className="bg-indigo-600/10 border-indigo-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-500 text-[10px] font-black uppercase tracking-widest text-white rounded-bl-lg">
            Recommended
          </div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Platinum</span>
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-3xl font-black">$9.99 <span className="text-sm font-normal text-slate-500">/mo</span></div>
            <ul className="space-y-3">
              <FeatureItem label="Unlimited Daily Logs" active />
              <FeatureItem label="Advanced AI Insights" active />
              <FeatureItem label="Personalized Challenges" active />
              <FeatureItem label="Full Coaching History" active />
              <FeatureItem label="Export Data (PDF/CSV)" active />
              <FeatureItem label="Early Access to Tools" active />
            </ul>
            
            {tier === 'premium' ? (
               <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white cursor-default" disabled>
                 <ShieldCheck className="w-4 h-4 mr-2" />
                 Active Platinum
               </Button>
            ) : (
              <Button 
                onClick={handleUpgrade} 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-12 text-lg font-bold"
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

function FeatureItem({ label, active }: { label: string; active?: boolean }) {
  return (
    <li className={`flex items-center gap-3 text-sm ${active ? 'text-slate-200' : 'text-slate-600'}`}>
      <Check className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-700'}`} />
      {label}
    </li>
  )
}

function InfoBox({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="text-center space-y-2 p-6 bg-slate-900/30 border border-white/5 rounded-3xl">
      <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-bold text-sm">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  )
}
