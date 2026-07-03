'use client'

// components/billing/DevCheckout.tsx — the hidden developer checkout (pre-launch testing).
//
// Renders NOTHING unless the backend hands it a Paddle config, and the backend hands it a
// config ONLY when the authenticated caller is the owner AND the dev Paddle env is set
// (see app/api/billing/dev-checkout/route.ts). So for every normal user this component is
// inert: it mounts, asks the server, gets a 404, and returns null — the profile page looks
// exactly as it does today. There is no client flag, cookie, or query param that can flip it
// on; only the owner's authenticated session unlocks the config.
//
// When it does render, it reuses the SAME CheckoutButtons the public path will use, so the
// developer exercises the identical overlay → webhook → entitlement → portal pipeline.
// Remove at launch in one commit (see docs/DECISIONS.md).

import { useEffect, useState } from 'react'
import { CheckoutButtons } from './CheckoutButtons'
import type { PaddlePublicConfig } from '@/lib/billing/public-config'

export function DevCheckout({
  userId,
  email,
  onSuccess,
}: {
  userId: string
  email: string
  onSuccess?: () => void
}) {
  const [cfg, setCfg] = useState<PaddlePublicConfig | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/billing/dev-checkout')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d?.clientToken || !d?.priceMonthly || !d?.priceYearly) return
        setCfg({
          environment: d.environment === 'production' ? 'production' : 'sandbox',
          clientToken: d.clientToken,
          priceMonthly: d.priceMonthly,
          priceYearly: d.priceYearly,
          checkoutEnabled: true,
        })
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  if (!cfg) return null

  return (
    <div className="mb-4 rounded-lg border border-line bg-paper p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wide text-soft">Developer checkout</span>
        <span className="font-mono text-[11px] uppercase tracking-wide text-faint">{cfg.environment}</span>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-faint">
        Visible only to you. Opens the real Paddle overlay against the live pipeline — webhook,
        entitlement, and portal all run for real. Remove before public launch.
      </p>
      <CheckoutButtons userId={userId} email={email} onSuccess={onSuccess} config={cfg} />
    </div>
  )
}
