import { createClient } from '@supabase/supabase-js'
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data, error } = await supabase
    .from('mental_logs')
    .select('content, category, mental_score, mood_after, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error(error)
  } else {
    console.log(JSON.stringify(data, null, 2))
  }
}

main()
