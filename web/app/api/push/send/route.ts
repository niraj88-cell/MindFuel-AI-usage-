import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:hello@mindfuel.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // This endpoint should ideally be protected so only an admin or Vercel Cron can call it.
    // For this example, we will just check for an auth header or allow authenticated users to test it.
    const authHeader = req.headers.get('authorization')
    const CRON_SECRET = process.env.CRON_SECRET

    const supabase = await createClient()
    let userId: string | null = null

    // If it's not the cron job, check if it's the authenticated user testing it
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id
    }

    // Get subscriptions
    let query = supabase.from('push_subscriptions').select('*')
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: subscriptions, error } = await query

    if (error) {
      throw error
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No subscriptions found' })
    }

    const payload = JSON.stringify({
      title: 'MindFuel Check-in',
      body: 'Time for your daily mental check-in! Log your mood now to keep your streak alive.',
      url: '/dashboard',
    })

    let sentCount = 0
    let failedCount = 0

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      }

      try {
        await webpush.sendNotification(pushSubscription, payload)
        sentCount++
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription has expired or is no longer valid, delete it
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
        failedCount++
      }
    })

    await Promise.allSettled(sendPromises)

    return NextResponse.json({ success: true, sent: sentCount, failed: failedCount })
  } catch (err: any) {
    console.error('Push notification send error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
