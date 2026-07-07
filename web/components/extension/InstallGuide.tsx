'use client'

// The founding-preview install path: download the extension zip from this site and
// load it unpacked. Shown by onboarding step 2 and the Today connect card while the
// Chrome Web Store listing is pending (EXTENSION_PUBLISHED false) — both flip to the
// one-click store button on their own once lib/extension.ts carries the URL.
//
// Chrome refuses to open chrome:// links from a web page, so step 2 offers a copy
// button instead — the one honest affordance that actually makes this easier.

import { useState } from 'react'
import { Check, Copy, Download } from 'lucide-react'
import { EXTENSION_DOWNLOAD_URL } from '@/lib/extension'

export function InstallGuide() {
  const [copied, setCopied] = useState(false)

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText('chrome://extensions')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be unavailable (permissions, http) — the address is visible to type.
    }
  }

  return (
    <div>
      <a
        href={EXTENSION_DOWNLOAD_URL}
        download
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green py-3 text-sm font-semibold text-white transition-colors hover:bg-green-deep"
      >
        <Download className="h-4 w-4" /> Download the extension
      </a>

      <ol className="mt-3 space-y-2.5 rounded-lg bg-paper p-4 text-[13px] leading-relaxed text-soft">
        <li>
          <span className="font-mono font-medium text-ink">1.</span> Unzip the download. You&rsquo;ll
          get a <span className="font-mono text-[12px]">satyashift-extension</span> folder &mdash;
          keep it somewhere it can stay (it is the extension).
        </li>
        <li>
          <span className="font-mono font-medium text-ink">2.</span> Paste{' '}
          <button
            onClick={copyAddress}
            className="inline-flex items-center gap-1 rounded border border-line bg-card px-1.5 py-0.5 font-mono text-[12px] text-ink transition-colors hover:border-green"
            title="Copy to clipboard"
          >
            chrome://extensions
            {copied ? <Check className="h-3 w-3 text-green" /> : <Copy className="h-3 w-3 text-ghost" />}
          </button>{' '}
          into the address bar, then turn on <span className="font-semibold">Developer mode</span> (top right).
        </li>
        <li>
          <span className="font-mono font-medium text-ink">3.</span> Click{' '}
          <span className="font-semibold">Load unpacked</span> and choose that folder.
        </li>
        <li>
          <span className="font-mono font-medium text-ink">4.</span> Done &mdash; it signs in with
          this account on its own, and this page notices by itself.
        </li>
      </ol>

      <p className="mt-2 text-center text-[11px] text-faint">Desktop Chrome (or any Chromium browser). About a minute.</p>
      <p className="mt-2 text-[12px] leading-relaxed text-faint">
        Chrome may warn <span className="font-medium text-soft">&ldquo;Read your browsing history&rdquo;</span> —
        that&rsquo;s the one permission that lets it see which site you&rsquo;re on. The domain, nothing more.{' '}
        <a href="/demo" className="font-medium text-ink underline decoration-line underline-offset-2 transition-colors hover:decoration-ink">
          See exactly what it records
        </a>
        .
      </p>
    </div>
  )
}
