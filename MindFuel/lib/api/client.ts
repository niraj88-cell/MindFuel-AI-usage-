// lib/api/client.ts
// Centralized, secure API client for mobile → web backend communication
import { Platform } from 'react-native';
import { supabase } from '../supabase/client';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;
if (!API_BASE) {
  throw new Error('EXPO_PUBLIC_API_URL is not defined in environment variables');
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated — please sign in again.');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'x-mindfuel-mobile': 'true',
  };
}

export async function apiPost<T = any>(path: string, body: Record<string, any>): Promise<T> {
  const auth = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...auth,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `API error ${res.status}`);
  }
  return data as T;
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const auth = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: auth,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `API error ${res.status}`);
  }
  return data as T;
}

export async function apiUpload<T = any>(path: string, formData: FormData): Promise<T> {
  const auth = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      ...auth,
      // Content-Type intentionally omitted for FormData boundary
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `API error ${res.status}`);
  }
  return data as T;
}

export { API_BASE };
