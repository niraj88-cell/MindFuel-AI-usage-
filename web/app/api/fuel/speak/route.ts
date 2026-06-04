import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { text } = await req.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'ElevenLabs API key is missing' }, { status: 500 })
    }

    // You can choose a specific voice ID. 'pNInz6obpgDQGcFmaJcg' is Adam (a calm default). 
    // We can also allow the user to pick one eventually.
    const VOICE_ID = 'pNInz6obpgDQGcFmaJcg'
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2', // Turbo for lowest latency
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ElevenLabs API Error:', errorText)
      return NextResponse.json({ error: 'Failed to generate voice' }, { status: 500 })
    }

    // Return the audio stream directly to the client
    const audioStream = response.body
    
    return new NextResponse(audioStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    })
    
  } catch (err: any) {
    console.error('TTS Route Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
