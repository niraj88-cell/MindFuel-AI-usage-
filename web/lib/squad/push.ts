// lib/squad/push.ts — best-effort web push to a set of users. Shared by the squad
// session-start nudge and the encouragement flow. Never throws: push is a courtesy,
// not a delivery guarantee, and it must never break the request it rides on.

import type { SupabaseClient } from '@supabase/supabase-js'
import webpush from 'web-push'

let vapidReady = false
function ensureVapid() {
  if (vapidReady) return true
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  try {
    webpush.setVapidDetails('mailto:hello@satyashift.app', pub, priv)
    vapidReady = true
  } catch {
    return false
  }
  return true
}

export async function sendPushTo(
  admin: SupabaseClient,
  userIds: string[],
  payload: { title: string; body: string; url: string; tag: string },
) {
  if (userIds.length === 0 || !ensureVapid()) return
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)
  const body = JSON.stringify(payload)
  await Promise.allSettled(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        )
      } catch (err: any) {
        // A gone subscription is cleanup, not an error.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', s.id)
        }
      }
    }),
  )
}
