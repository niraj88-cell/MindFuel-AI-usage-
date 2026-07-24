// lib/extension.ts — the single place the Chrome Web Store listing is configured.
//
// NO CODE CHANGE IS NEEDED WHEN GOOGLE APPROVES THE EXTENSION. The listing address is
// read from the NEXT_PUBLIC_EXTENSION_STORE_URL environment variable, so the flip from
// "download the zip and load it unpacked" to a one-click "Add to Chrome" is a Vercel
// dashboard action:
//
//   Vercel → the project → Settings → Environment Variables → Production
//     NEXT_PUBLIC_EXTENSION_STORE_URL = https://chromewebstore.google.com/detail/<id>
//   then Deployments → the newest one → ⋯ → Redeploy.
//
// Both install surfaces (onboarding step 2, the Today connect card) already carry the
// published branch — they read EXTENSION_PUBLISHED and change on their own.
//
// A malformed or foreign value is IGNORED rather than shipped. A typo'd link would send
// every new user to a dead page and there would be no way to tell from the outside; the
// honest download path is a better failure. Only https Chrome Web Store addresses (or a
// bare extension id) can turn the button on.

const RAW_STORE_URL = (process.env.NEXT_PUBLIC_EXTENSION_STORE_URL ?? '').trim()

// Chrome extension ids are exactly 32 letters in the range a-p; /detail/<id> resolves
// to the listing on its own, so the id alone is enough to paste.
const EXTENSION_ID = /^[a-p]{32}$/

const STORE_HOSTS = new Set(['chromewebstore.google.com', 'chrome.google.com'])

export function resolveStoreUrl(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (EXTENSION_ID.test(value)) return `https://chromewebstore.google.com/detail/${value}`
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return ''
    if (!STORE_HOSTS.has(url.hostname.toLowerCase())) return ''
    return url.toString()
  } catch {
    return '' // not a URL at all (someone pasted the listing's name, or a placeholder)
  }
}

export const EXTENSION_STORE_URL = resolveStoreUrl(RAW_STORE_URL)
export const EXTENSION_PUBLISHED = EXTENSION_STORE_URL !== ''

// The direct download, served from web/public and rebuilt by `npm run package:extension`
// after any extension change. The install surfaces use it only while the listing is not
// yet configured — once EXTENSION_PUBLISHED is true nothing links to it.
export const EXTENSION_DOWNLOAD_URL = '/satyashift-extension.zip'
