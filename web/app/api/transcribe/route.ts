import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('audio') as Blob;
    
    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert Blob to File object for Groq SDK
    const audioFile = new File([file], "audio.m4a", { type: "audio/m4a" });

    // Send to Groq Whisper for blazing fast transcription
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3-turbo",
      response_format: "json",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error: any) {
    console.error('Transcription failed:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
