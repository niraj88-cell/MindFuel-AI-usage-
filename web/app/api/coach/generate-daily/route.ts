import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if we already generated a tip today
    const { data: existing } = await supabase
      .from('ai_insights')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'daily_coach')
      .gte('created_at', new Date().toISOString().split('T')[0])
      .limit(1)
      .maybeSingle()
      
    if (existing) {
      return NextResponse.json({ message: 'Insight already exists for today', exists: true })
    }

    // Fetch recent logs
    const { data: logs } = await supabase
      .from('mental_logs')
      .select('content, category, mental_score, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!logs || logs.length === 0) {
      return NextResponse.json({ error: 'Not enough data to generate insight' }, { status: 400 })
    }

    const logSummary = logs.map(l => `- [Score: ${l.mental_score}] (${l.category}) ${l.content}`).join('\n')

    const apiKey = process.env.GROQ_API_KEY || ''
    let insightBody = "Taking a quick 5-minute breather can dramatically reset your focus baseline."
    let actionItems = ["Step away from screens for 5 mins", "Drink water"]

    if (apiKey && apiKey !== 'your_free_groq_key_here') {
      const groq = new Groq({ apiKey })
      const completion = await groq.chat.completions.create({
        messages: [{ 
          role: 'user', 
          content: `You are a proactive Digital Wellness AI Coach. Look at the user's recent content logs and provide a single, highly actionable 1-2 sentence tip for today. Be specific, psychological, and warm. Also provide 2 short action items.
          
Recent logs:
${logSummary}

Return strictly as JSON:
{
  "body": "Your 1-2 sentence tip here.",
  "action_items": ["Action 1", "Action 2"]
}` 
        }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        response_format: { type: "json_object" }
      })

      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
      if (parsed.body) {
        insightBody = parsed.body
        actionItems = parsed.action_items || actionItems
      }
    } else {
      // Fallback heuristics
      const avgScore = logs.reduce((a, b) => a + b.mental_score, 0) / logs.length
      if (avgScore < 40) {
        insightBody = "Your recent content diet has been pulling you down. Consider a rigid 20-minute focus block to reset your dopamine baseline."
        actionItems = ["Enable Focus Sprint", "Swap next scroll for reading"]
      } else {
        insightBody = "You're maintaining a strong digital balance. Lean into your current momentum by tackling your hardest task now."
        actionItems = ["Start deep work session", "Log your next meaningful activity"]
      }
    }

    // Save insight
    const { data: newInsight, error } = await supabase.from('ai_insights').insert({
      user_id: user.id,
      type: 'daily_coach',
      title: 'Daily Coach Tip',
      body: insightBody,
      action_items: actionItems,
      metadata: {},
      is_read: false
    }).select().single()

    if (error) throw error

    return NextResponse.json({ insight: newInsight })
  } catch (error: any) {
    console.error('Coach Gen Error:', error)
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 })
  }
}
