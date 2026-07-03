// lib/squad/notifySessionStart.ts
// When a member starts a deep-work session, gently let their squad(s) know — so the group can
// hold itself accountable by starting their own sessions too. Deliberately low-pressure:
//   - one in-app notification per squadmate (surfaced on their dashboard / notifications bell)
//   - a best-effort, soft web push
//   - de-duped to at most one squad nudge per hour per starter, so it never nags.
// Uses the ADMIN (service-role) client because it writes notification rows for OTHER users.

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendPushTo } from './push'
import { notificationDecision } from '@/lib/intelligence/notifications'

type NotifyArgs = {
  admin: SupabaseClient
  actorId: string
  squadId?: string | null // scope to one squad, or notify all of the actor's squads
  sessionId: string
}

export async function notifySquadOnSessionStart({ admin, actorId, squadId, sessionId }: NotifyArgs) {
  try {
    // Gentle cap: if we already nudged this person's squads within the last hour, stay quiet.
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recent } = await admin
      .from('notifications')
      .select('id')
      .eq('type', 'squad_focus_start')
      .eq('metadata->>actor_id', actorId)
      .gte('created_at', hourAgo)
      .limit(1)
    if (recent && recent.length > 0) return { skipped: 'recently_nudged' as const }

    // Which squads' members should hear about this?
    let squadQuery = admin.from('squad_members').select('squad_id, user_id').is('left_at', null)
    if (squadId) {
      squadQuery = squadQuery.eq('squad_id', squadId)
    } else {
      const { data: mine } = await admin
        .from('squad_members').select('squad_id').eq('user_id', actorId).is('left_at', null)
      const ids = (mine ?? []).map((r) => r.squad_id)
      if (ids.length === 0) return { skipped: 'no_squads' as const }
      squadQuery = squadQuery.in('squad_id', ids)
    }

    const { data: members } = await squadQuery
    const recipientIds = [...new Set((members ?? []).map((m) => m.user_id))].filter((id) => id !== actorId)
    if (recipientIds.length === 0) return { skipped: 'solo' as const }

    // Notification personalization: ease off recipients who consistently let this kind of
    // nudge pass unread (learned from notifications.is_read — no new data collected). Fatigue
    // is answered by backing off, never by pushing harder. Fail-open on any error: when in
    // doubt we notify, we never silently withhold support.
    let targets = recipientIds
    try {
      const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
      const { data: history } = await admin
        .from('notifications')
        .select('user_id, is_read, created_at')
        .eq('type', 'squad_focus_start')
        .in('user_id', recipientIds)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
      if (history) {
        const byUser = new Map<string, { is_read: boolean; created_at: string }[]>()
        for (const h of history) {
          const arr = byUser.get(h.user_id) ?? []
          arr.push({ is_read: !!h.is_read, created_at: h.created_at as string })
          byUser.set(h.user_id, arr)
        }
        targets = recipientIds.filter((uid) => notificationDecision(byUser.get(uid) ?? []).send)
      }
    } catch {
      /* fail-open: notify everyone */
    }
    if (targets.length === 0) return { skipped: 'all_backed_off' as const }

    const { data: actor } = await admin.from('profiles').select('full_name').eq('id', actorId).maybeSingle()
    const name = (actor?.full_name || 'A squadmate').trim()

    const title = `${name} just started a focus session`
    const body = `${name} is doing deep work right now. Want to start yours too?`

    // 1. In-app notifications (the "in their dashboard" part) — to the personalized targets.
    const rows = targets.map((uid) => ({
      user_id: uid,
      title,
      body,
      type: 'squad_focus_start',
      metadata: { actor_id: actorId, actor_name: name, squad_id: squadId ?? null, session_id: sessionId },
    }))
    await admin.from('notifications').insert(rows)

    // 2. Soft web push (best-effort; never blocks or fails the session start).
    await sendPushTo(admin, targets, { title, body, url: '/dashboard', tag: 'squad_focus_start' })

    return { notified: targets.length }
  } catch (err: any) {
    // Never let a notification problem break starting a session.
    console.error('[notifySquadOnSessionStart] error:', err?.message)
    return { error: err?.message as string }
  }
}
