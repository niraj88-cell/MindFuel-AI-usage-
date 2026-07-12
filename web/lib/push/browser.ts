// lib/push/browser.ts — client-only. Turn OFF web push for THIS browser.
//
// Called on sign-out. Without it, a browser's push subscription outlives the login session:
// after you sign out, the browser KEEPS receiving that account's circle notifications
// (a "X just started a focus session" push), because a Web Push subscription lives in the
// browser's service worker, not in the app session. On a shared or multi-account device this
// leaks one account's circle activity to whoever uses the browser next — and it is why a user
// with a second account in their own circle sees "their own" session-start notifications.
//
// Best-effort and never throws: it must never block or delay signing out.
export async function unsubscribeBrowserPush(): Promise<void> {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    // getRegistration (not `.ready`) resolves to undefined when no SW is registered, so this
    // can never hang a browser that never set push up.
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return

    // 1. Drop the server row for (current user, this endpoint) while we are still authenticated.
    //    keepalive lets the request finish through the redirect that follows sign-out.
    try {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
        keepalive: true,
      })
    } catch {
      // The browser-side unsubscribe below is what actually stops delivery; the row, if
      // orphaned, self-cleans on the next push (404/410 -> delete in sendPushTo).
    }

    // 2. Kill the browser's push subscription itself, so this device receives nothing further.
    await subscription.unsubscribe()
  } catch {
    // never block sign-out
  }
}
