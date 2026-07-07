'use client'

// components/billing/CheckoutButtons.tsx — Paddle.js overlay checkout (the ONLY checkout UI).
// We do not build a custom payment form: card entry, 3-D Secure, wallets, and tax all live
// inside Paddle's hosted overlay. This component only opens it with the right price + the
// user id for webhook attribution, then reflects the result.
//
// Trust boundary: NOTHING here grants access. On success we just tell the user and refresh;
// entitlement flips only when Paddle's signed webhook reaches our backend. The client is
// never the source of truth (see lib/billing/service.ts + lib/entitlement.ts).

import { useEffect, useRef, useState } from 'react'
import { initializePaddle, type Paddle } from '@paddle/paddle-js'
import { Loader2, Check } from 'lucide-react'
import { readPaddlePublicEnv, type PaddlePublicConfig } from '@/lib/billing/public-config'
import { PLANS } from '@/lib/subscription'

type Status = 'loading' | 'ready' | 'error' | 'success'

export function CheckoutButtons({
  userId,
  email,
  onSuccess,
  config,
}: {
  userId: string
  email: string
  onSuccess?: () => void
  /** Optional injected config. Defaults to the public env (production checkout). The
   *  developer path passes a server-delivered config so this exact component drives the
   *  real overlay without relying on NEXT_PUBLIC_* being set (see DevCheckout). */
  config?: PaddlePublicConfig
}) {
  const cfg = config ?? readPaddlePublicEnv()
  const [status, setStatus] = useState<Status>('loading')
  const [busyPlan, setBusyPlan] = useState<'monthly' | 'annual' | null>(null)
  const paddleRef = useRef<Paddle | null>(null)

  useEffect(() => {
    if (!cfg.checkoutEnabled || !cfg.clientToken) {
      setStatus('error')
      return
    }
    let active = true
    initializePaddle({
      environment: cfg.environment,
      token: cfg.clientToken,
      eventCallback: (event) => {
        // The overlay reports completion here. Access is still granted server-side by the
        // webhook; this only updates what the user sees. Cancellation ('checkout.closed')
        // needs no handling — no charge happened, the overlay simply closed.
        if (event?.name === 'checkout.completed') {
          setStatus('success')
          setBusyPlan(null)
          onSuccess?.()
        }
      },
    })
      .then((p) => {
        if (!active) return
        paddleRef.current = p ?? null
        setStatus(p ? 'ready' : 'error')
      })
      .catch(() => active && setStatus('error'))
    return () => { active = false }
    // cfg is derived from build-time env; intentionally initialize once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function open(plan: 'monthly' | 'annual') {
    const priceId = plan === 'monthly' ? cfg.priceMonthly : cfg.priceYearly
    if (!paddleRef.current || !priceId) { setStatus('error'); return }
    setBusyPlan(plan)
    // Founding-member offer: a Paddle-side discount (50% off the first month), applied
    // only when configured. Paddle computes and displays the discounted total inside the
    // overlay — the UI never does its own price math, so it can never mislead.
    const discountId = plan === 'monthly' ? cfg.discountMonthly || undefined : undefined
    paddleRef.current.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      ...(discountId ? { discountId } : {}),
      customer: { email },
      customData: { user_id: userId }, // webhook attribution — must match mapPaddleEvent
      settings: {
        displayMode: 'overlay',
        theme: 'light',
        successUrl: `${window.location.origin}/profile?upgraded=1`,
      },
    })
    // If the user closes the overlay without paying, clear the busy state shortly after.
    setTimeout(() => setBusyPlan((b) => (b === plan ? null : b)), 1500)
  }

  if (status === 'success') {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-green-line bg-green-tint p-4">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green" />
        <p className="text-sm leading-relaxed text-ink">
          Payment received. Your plan is activating now — this page will reflect it in a moment.
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <p className="rounded-lg border border-line bg-paper p-4 text-sm leading-relaxed text-soft">
        Checkout isn&rsquo;t available right now. Please try again shortly, or email{' '}
        <a href="mailto:niraj2055adk@gmail.com" className="font-medium text-ink underline underline-offset-2">niraj2055adk@gmail.com</a>.
      </p>
    )
  }

  const loading = status === 'loading'
  return (
    <div>
      {cfg.discountMonthly && (
        <p className="mb-3 text-[13px] leading-relaxed text-soft">
          <span className="font-medium text-ink">Founding thanks:</span> the monthly plan is
          half price for your first month — ${PLANS.monthly.priceUsd / 2} instead of
          ${PLANS.monthly.priceUsd}, applied automatically at checkout. Every month after
          renews at the plain ${PLANS.monthly.priceUsd}.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
      {(['monthly', 'annual'] as const).map((plan) => {
        const p = PLANS[plan]
        const isBusy = busyPlan === plan
        return (
          <button
            key={plan}
            onClick={() => open(plan)}
            disabled={loading || busyPlan !== null}
            className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
              plan === 'annual'
                ? 'bg-green text-white hover:bg-green-deep'
                : 'border border-line bg-paper text-ink hover:bg-green-wash'
            }`}
          >
            {loading || isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isBusy ? 'Opening…' : `Choose ${p.label} — $${p.priceUsd}/${p.period}`}
          </button>
        )
      })}
      </div>
    </div>
  )
}
