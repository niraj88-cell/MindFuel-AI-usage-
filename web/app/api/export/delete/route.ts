import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()

    const authHeader = req.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    const { data: { user } } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Delete all associated data first due to FK constraints if any, or just to be safe
    await Promise.all([
      adminClient.from('mental_logs').delete().eq('user_id', user.id),
      adminClient.from('mood_logs').delete().eq('user_id', user.id),
      adminClient.from('daily_summaries').delete().eq('user_id', user.id),
      adminClient.from('focus_sessions').delete().eq('user_id', user.id),
      adminClient.from('ai_insights').delete().eq('user_id', user.id),
      adminClient.from('habit_challenges').delete().eq('user_id', user.id),
      adminClient.from('profiles').delete().eq('id', user.id)
    ])

    // Finally delete the user account
    const { error } = await adminClient.auth.admin.deleteUser(user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, message: 'Account and all data successfully deleted' })
  } catch (error) {
    console.error('[API /export/delete]', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
