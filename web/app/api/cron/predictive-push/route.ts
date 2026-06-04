import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      'mailto:hello@mindfuel.app',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
  } catch (err) {
    console.error('Failed to set VAPID details:', err)
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const CRON_SECRET = process.env.CRON_SECRET

    // Allow manual testing if authenticated, otherwise require CRON_SECRET
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user && (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch active push subscriptions
    let query = supabase.from('push_subscriptions').select('*, profiles(id, full_name)')
    
    // If triggered manually by a user, only test on themselves
    if (user && authHeader !== `Bearer ${CRON_SECRET}`) {
      query = query.eq('user_id', user.id)
    }

    const { data: subscriptions, error } = await query

    if (error) throw error
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: 'No active push subscriptions' })
    }

    let sentCount = 0
    let failedCount = 0

    // 2. Loop through subscriptions, simulate prediction, and send alert
    const promises = subscriptions.map(async (sub) => {
      // In a full production scenario, we would query the AI here:
      // const prediction = await getFocusProphecy(sub.user_id)
      // if (prediction.dangerZoneWithin15Mins) { ... }

      // For MVP, we simulate a predictive trigger
      const payload = JSON.stringify({
        title: '⚠️ M.A.I. Predictive Alert',
        body: `Your biometric and behavioral data suggests an energy crash in 15 mins. Step away from the screen now to prevent doomscrolling.`,
        icon: '/icon-192x192.png'
      })

      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }

      try {
        await webpush.sendNotification(pushSub, payload)
        sentCount++
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Clean up dead subscriptions
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
        failedCount++
      }
    })

    await Promise.allSettled(promises)

    return NextResponse.json({ 
      success: true, 
      sent: sentCount, 
      failed: failedCount 
    })

  } catch (error: any) {
    console.error('[Predictive Push Error]', error.message)
    return NextResponse.json({ error: 'Failed to process predictive pushes' }, { status: 500 })
  }
}
