// AI Coach API route for real-time token streaming and session persistence

import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkCoachRateLimit, buildRateLimitHeaders } from '@/lib/rate-limit'
import { sanitizeText, sanitizeForAI, checkContentPolicy } from '@/lib/security'
import { auditRateLimited, auditPromptInjection } from '@/lib/audit-log'

export const runtime = 'nodejs'

const SYSTEM_PROMPT = `You are MindFuel's AI Mental Wellness Coach — a warm, insightful, evidence-based guide 
for digital mental nutrition. Your role:

1. Help users understand how their digital consumption affects mental health
2. Provide actionable, specific advice (not generic platitudes)
3. Use motivational interviewing techniques
4. Reference their logged data when available
5. Suggest healthier alternatives to harmful content patterns
6. Keep responses concise (under 250 words) but impactful
7. Use markdown: **bold** for key points, bullet lists for action items
8. Never diagnose medical conditions — recommend professional help when appropriate
9. If a user expresses crisis thoughts, respond with empathy AND crisis resources

Personality: Warm but direct. Think "supportive friend who happens to be a psychologist."
Tone: Conversational, never preachy. Be specific, not vague.`

const CRISIS_RESOURCES = `\n\n---\n💚 **You're not alone.**\n- **988 Lifeline**: Call or text **988** (US)\n- **Crisis Text Line**: Text HOME to **741741**\n\nI'm here to listen. What's going on?`

const COACH_LIMITS = { free: 50, premium: 500 }

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle()

    const tier = (profile?.subscription_tier || 'free') as 'free' | 'premium'
    const rateCheck = await checkCoachRateLimit(user.id, tier)
    const rlHeaders = buildRateLimitHeaders(rateCheck, COACH_LIMITS[tier])

    if (!rateCheck.success) {
      auditRateLimited(user.id, '/api/coach')
      const secs = Math.ceil((rateCheck.resetAt - Date.now()) / 1000)
      const mins = Math.ceil(secs / 60)
      return NextResponse.json(
        {
          error: rateCheck.burstBlocked
            ? 'Sending too fast — please slow down.'
            : `Rate limit reached. Resets in ${mins} minute${mins !== 1 ? 's' : ''}.`,
          resetAt: rateCheck.resetAt,
        },
        { status: 429, headers: rlHeaders }
      )
    }

    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { message, messages } = body
    const raw = (message || (messages && messages[messages.length - 1]?.content) || '').trim()
    const sanitized = sanitizeText(raw, 5000)

    if (!sanitized.value) {
      return NextResponse.json({ error: 'Message must be 1–5000 characters' }, { status: 400 })
    }

    if (sanitized.threats.includes('prompt_injection')) {
      auditPromptInjection(user.id, '/api/coach', raw)
    }

    const userMessage = sanitizeForAI(sanitized.value)
    const contentCheck = checkContentPolicy(userMessage)
    const isCrisis = contentCheck.reason === 'crisis_keywords'

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey || apiKey.startsWith('your_')) {
      return NextResponse.json(
        {
          response: "👋 **MindFuel Coach — Demo Mode**\n\nAdd a Groq API key for full AI coaching.\n\n**Quick wins:**\n- **20-min rule**: break after 20min of scrolling\n- **Intentional consumption**: ask \"does this fuel me?\"\n- **Quality > quantity**: one great article beats 30min of doomscrolling 🌿",
          remaining: rateCheck.remaining,
        },
        { headers: rlHeaders }
      )
    }

    try {
      const Groq = (await import('groq-sdk')).default
      const groq = new Groq({ apiKey })

      const history = (messages || [])
        .slice(0, -1).slice(-20)
        .map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: sanitizeForAI(String(m.content || '')),
        }))

      const streamResult = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history,
          { role: 'user', content: userMessage }
        ],
        temperature: 0.75,
        max_tokens: 512,
        stream: true,
      })

      let fullResponse = ''
      const encoder = new TextEncoder()

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamResult) {
              const text = chunk.choices[0]?.delta?.content || ''
              if (text) {
                fullResponse += text
                controller.enqueue(encoder.encode(text))
              }
            }
            if (isCrisis) {
              fullResponse += CRISIS_RESOURCES
              controller.enqueue(encoder.encode(CRISIS_RESOURCES))
            }
            controller.close()
            persistSession(supabase, user.id, userMessage, fullResponse).catch(console.error)
          } catch (err) {
            controller.error(err)
          }
        },
      })

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'X-Crisis-Detected': isCrisis ? '1' : '0',
          ...rlHeaders,
        },
      })
    } catch (aiError: any) {
      console.error('[AI Coach Streaming Error]', aiError.message)
      return NextResponse.json(
        {
          response: "Brief connectivity issue 🔄\n\n**While I reconnect:** Rate your digital consumption 1–10. Below 5? Try a podcast, skill video, or 10-min screen break.",
          remaining: rateCheck.remaining,
        },
        { headers: rlHeaders }
      )
    }
  } catch (error) {
    console.error('[API /coach Critical]', error)
    return NextResponse.json({ error: 'Coach unavailable' }, { status: 500 })
  }
}

async function persistSession(supabase: any, userId: string, userMessage: string, aiResponse: string) {
  try {
    const { data: existing } = await supabase
      .from('coaching_sessions').select('state').eq('user_id', userId).maybeSingle()
    const prev = existing?.state?.messages || []
    const updated = [
      ...prev,
      { type: 'human', content: userMessage, ts: Date.now() },
      { type: 'ai', content: aiResponse, ts: Date.now() },
    ].slice(-100)
    await supabase.from('coaching_sessions').upsert(
      { user_id: userId, state: { messages: updated }, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  } catch (err) {
    console.error('[Coach Session Persist]', err)
  }
}
