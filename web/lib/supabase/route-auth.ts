// lib/supabase/route-auth.ts
// Resolve an RLS-scoped Supabase client + authenticated user id from either a cookie
// session (web) or a Bearer JWT (extension / mobile). Every query made through the
// returned client runs under Row-Level Security as that user — defense in depth.

import { createClient as createJwtClient, type SupabaseClient } from '@supabase/supabase-js'
import { createClient as createCookieClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

export async function getUserContext(
  req: Request,
): Promise<{ supabase: SupabaseClient<Database>; userId: string } | null> {
  const authHeader = req.headers.get('authorization')
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (bearer) {
    const supabase = createJwtClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    )
    const { data: { user } } = await supabase.auth.getUser(bearer)
    return user ? { supabase, userId: user.id } : null
  }

  const supabase = await createCookieClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ? { supabase, userId: user.id } : null
}
