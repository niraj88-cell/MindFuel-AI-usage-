'use client'

// A quiet way to pass SatyaShift on. A "proof you did the work" product has one honest
// growth loop: proof is meant to be shown. This is that loop's smallest, most honest form —
// no referral bribe, no tracking parameter, no dark pattern. On a phone it opens the native
// share sheet; on a desktop it copies the canonical link and says so. Nothing is sent
// anywhere by us; the person shares it themselves, to whom they choose.
//
// Design: green is earned, so this is never the primary green action on a page — it sits as
// a calm secondary control. Uses the shared .press / .focus-ring utilities like every other
// interactive element. Icon aids comprehension (share / confirmation), never decoration.

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

type Props = {
  url: string // canonical, absolute (always satyashift.com — you share the real front door)
  title: string
  text: string
  label?: string
  className?: string
}

export function ShareButton({ url, title, text, label = 'Share SatyaShift', className = '' }: Props) {
  const [copied, setCopied] = useState(false)

  async function onShare() {
    // Native share sheet where it exists (mostly mobile). A user cancel throws AbortError —
    // that is not an error, so swallow it and do nothing.
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url })
        return
      } catch {
        return
      }
    }
    // Desktop fallback: copy the link, confirm for two seconds.
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked (rare) — surface the link so it can still be copied by hand.
      window.prompt('Copy this link:', url)
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      aria-live="polite"
      className={`focus-ring press inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-card px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-green-wash ${className}`}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green" /> Link copied
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" /> {label}
        </>
      )}
    </button>
  )
}
