// lib/api/quickLog.ts
// Quick Log + Transcription API — uses centralized secure client
import { Platform } from 'react-native';
import { apiPost, apiUpload } from './client';

export interface QuickLogResponse {
  log: any;
  instantInsight?: {
    message: string;
    emoji: string;
    scoreImpact?: string;
  };
}

export async function submitQuickLog(
  presetId?: string,
  mood?: number,
  duration?: number,
  notes?: string,
  voiceText?: string
): Promise<QuickLogResponse> {
  return apiPost<QuickLogResponse>('/api/quick-log', {
    preset: presetId,
    mood,
    duration,
    notes,
    voiceText,
  });
}

export async function transcribeAudio(audioUri: string): Promise<string> {
  const formData = new FormData();

  // React Native requires this specific format for file uploads
  formData.append('audio', {
    uri: Platform.OS === 'android' ? audioUri : audioUri.replace('file://', ''),
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as any);

  const data = await apiUpload<{ text: string }>('/api/transcribe', formData);
  return data.text;
}
