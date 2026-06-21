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
  const [isAnnual, setIsAnnual] = useState(true)

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
      // In a real app, we'd pass isAnnual to the checkout endpoint
      const res = await fetch('/api/stripe/checkout', { method: 'POST', body: JSON.stringify({ isAnnual }) });
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
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-[var(--font-serif)] font-semibold text-[#111827] tracking-tight">MindFuel Platinum</h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          Upgrade your mental metabolism with advanced AI coaching and unlimited insights.
        </p>
      </div>

      <div className="flex justify-center pt-4">
        <div className="bg-[#F5F7F6] p-1.5 rounded-full inline-flex items-center relative border border-black/[0.04]">
          <button 
            onClick={() => setIsAnnual(false)}
            className={`relative z-10 px-6 py-2.5 text-sm font-semibold rounded-full transition-colors ${!isAnnual ? 'text-[#111827]' : 'text-gray-400 hover:text-[#111827]'}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setIsAnnual(true)}
            className={`relative z-10 px-6 py-2.5 text-sm font-semibold rounded-full transition-colors flex items-center gap-2 ${isAnnual ? 'text-[#111827]' : 'text-gray-400 hover:text-[#111827]'}`}
          >
            Annual 
            <span className="bg-[#4CAF50]/10 text-[#4CAF50] text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Save 34%</span>
          </button>
          <div 
            className={`absolute top-1.5 bottom-1.5 w-1/2 bg-white rounded-full shadow-sm border border-black/[0.04] transition-transform duration-300 ease-in-out ${isAnnual ? 'translate-x-full' : 'translate-x-0'}`} 
            style={{ width: isAnnual ? 'calc(50% + 1.5rem)' : 'calc(50% - 1.5rem)', left: '1.5px' }}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 pt-6">
        {/* Free Plan */}
        <Card className="bg-[#F5F7F6] border-black/[0.04] relative overflow-hidden flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Standard</span>
              <span className="text-sm font-medium text-gray-500">Free</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-3xl font-semibold text-[#111827]">$0</div>
            <ul className="space-y-3">
              <FeatureItem label="3 Daily Entries" active />
              <FeatureItem label="Basic AI Analysis" active />
              <FeatureItem label="Public Challenges" active />
              <FeatureItem label="Weekly Summary Trends" />
              <FeatureItem label="Always-On AI Coach" />
            </ul>
            {tier === 'free' && (
               <Button className="w-full bg-[#EAECEB] hover:bg-[#EAECEB] text-[#4B5563] cursor-default rounded-xl h-12" disabled>
                 Current Plan
               </Button>
            )}
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className="!bg-none !bg-white border-black/[0.04] relative overflow-hidden flex flex-col justify-between scale-[1.02] md:scale-105 shadow-xl z-10 rounded-3xl">
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-[#111827] text-[10px] font-semibold uppercase tracking-widest text-white rounded-bl-xl">
            {isAnnual ? 'Best Value' : 'Recommended'}
          </div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="font-[var(--font-serif)] text-2xl">Platinum</span>
              <Sparkles className="w-5 h-5 text-[#111827]" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              {isAnnual ? (
                <>
                  <div className="text-4xl font-semibold text-[#111827]">$79 <span className="text-sm font-medium text-gray-400">/yr</span></div>
                  <div className="text-sm text-[#4CAF50] font-medium mt-1">That's $6.58 /mo. Billed annually.</div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-semibold text-[#111827]">$9.99 <span className="text-sm font-medium text-gray-400">/mo</span></div>
                  <div className="text-sm text-gray-400 font-medium mt-1">Billed monthly. Cancel anytime.</div>
                </>
              )}
            </div>
            
            <ul className="space-y-3">
              <FeatureItem label="Unlimited Daily Entries" active variant="light" />
              <FeatureItem label="Deep Psychological Insights" active variant="light" />
              <FeatureItem label="Life in Pixels Visualization" active variant="light" />
              <FeatureItem label="Community Benchmarking" active variant="light" />
              <FeatureItem label="Never Lose Coaching History" active variant="light" />
            </ul>
            
            {tier === 'premium' ? (
               <Button className="w-full bg-[#111827] hover:bg-[#1f2937] text-white cursor-default rounded-xl h-12" disabled>
                 <ShieldCheck className="w-4 h-4 mr-2" />
                 Active Platinum
               </Button>
            ) : (
              <div className="space-y-3">
                <Button 
                  onClick={handleUpgrade} 
                  disabled={loading}
                  className="w-full bg-[#4CAF50] hover:bg-[#388E3C] text-white h-12 text-base font-bold rounded-xl shadow-md transition-transform hover:scale-[1.02]"
                >
                  {loading ? 'Preparing...' : isAnnual ? 'Start 14-Day Free Trial' : 'Upgrade to Platinum'}
                </Button>
                {isAnnual && (
                  <p className="text-center text-xs font-medium text-gray-400">
                    You won't be charged until your trial ends.
                  </p>
                )}
              </div>
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
  const activeColor = variant === 'light' ? 'text-[#111827]' : 'text-[#111827]'
  const inactiveColor = variant === 'light' ? 'text-gray-400' : 'text-gray-400'
  const checkColor = variant === 'light' ? 'text-[#4CAF50]' : 'text-[#4CAF50]'
  const inactiveCheckColor = variant === 'light' ? 'text-gray-300' : 'text-gray-300'

  return (
    <li className={`flex items-center gap-3 text-sm ${active ? activeColor : inactiveColor}`}>
      <Check className={`w-4 h-4 ${active ? checkColor : inactiveCheckColor}`} />
      {label}
    </li>
  )
}

function InfoBox({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="text-center space-y-2 p-6 bg-white border border-black/[0.04] rounded-2xl shadow-sm">
      <div className="w-10 h-10 bg-[#F5F7F6] rounded-2xl flex items-center justify-center text-[#111827] mx-auto border border-black/[0.04]">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-semibold text-sm text-[#111827]">{title}</h3>
      <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
    </div>
  )
}
