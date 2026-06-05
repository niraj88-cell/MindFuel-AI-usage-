import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()

    const authHeader = req.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    const { data: { user }, error: authError } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Just delete the user account. Supabase ON DELETE CASCADE handles the rest.
    const { error } = await adminClient.auth.admin.deleteUser(user.id)

    if (error) {
      console.error('[Delete User Admin Error]', error)
      // Fallback: If admin delete fails (e.g., missing service key), try to delete profile
      // which will cascade delete all logs, though auth.users record will remain.
      await adminClient.from('profiles').delete().eq('id', user.id)
      throw error
    }

    return NextResponse.json({ success: true, message: 'Account and all data successfully deleted' })
  } catch (error: any) {
    console.error('[API /export/delete]', error.message || error)
    return NextResponse.json({ error: 'Failed to delete account. Please try again.' }, { status: 500 })
  }
}
