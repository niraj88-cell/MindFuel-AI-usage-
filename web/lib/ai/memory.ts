import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_build',
    })
  }
  return _openai
}

// Embeddings are the only paid (OpenAI) dependency left. Groq has no embeddings API, and there's
// no AI budget — so when no real OPENAI_API_KEY is configured we skip the API entirely: storeMemory
// becomes a no-op and searchMemory returns []. Semantic memory is a nice-to-have layered on top of
// the coach, so degrading it to off costs nothing and never breaks a caller (all are try/wrapped).
function embeddingsEnabled(): boolean {
  const k = process.env.OPENAI_API_KEY || ''
  return !!k && k !== 'dummy_key_for_build' && k !== 'your_openai_api_key_here'
}

export interface MemoryMetadata {
  type: 'log' | 'mood' | 'insight' | 'intercept'
  source_id?: string
  date?: string
  [key: string]: any
}

/**
 * Generates an embedding for a piece of text using OpenAI's small embedding model.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  })
  
  return response.data[0].embedding
}

/**
 * Stores a new memory in the semantic_memories table.
 */
export async function storeMemory(userId: string, content: string, metadata: MemoryMetadata) {
  if (!embeddingsEnabled()) return false // no OpenAI key -> skip (no cost, no crash)
  try {
    const supabase = await createClient()
    const embedding = await generateEmbedding(content)
    
    const { error } = await supabase.from('semantic_memories').insert({
      user_id: userId,
      content,
      embedding,
      metadata,
    })

    if (error) {
      console.error('Failed to store memory in Supabase:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to generate/store memory:', err)
    return false
  }
}

/**
 * Searches the semantic_memories table for memories related to a query.
 */
export async function searchMemory(userId: string, query: string, matchCount: number = 3) {
  if (!embeddingsEnabled()) return [] // no OpenAI key -> no semantic recall (no cost, no crash)
  try {
    const supabase = await createClient()
    const embedding = await generateEmbedding(query)
    
    // We call the custom Postgres function match_memories created in the SQL migration
    const { data, error } = await supabase.rpc('match_memories', {
      query_embedding: embedding,
      match_threshold: 0.75, // 0 to 1, higher means more similar. 0.75 is a solid baseline for text-embedding-3
      match_count: matchCount,
      p_user_id: userId
    })

    if (error) {
      console.error('Failed to search memories in Supabase:', error)
      return []
    }
    
    return data || []
  } catch (err) {
    console.error('Failed to search memory:', err)
    return []
  }
}
