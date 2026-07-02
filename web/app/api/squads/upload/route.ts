import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Defense in depth: the squad_photos bucket already enforces a 5 MB cap and an
// image-only MIME allowlist, but we re-validate here so a bad upload fails fast with a
// clear error and never depends on a single control. Extension is derived from the
// allowed content type (not the client filename) to avoid path/extension injection.
const ALLOWED = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
])
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const ext = ALLOWED.get(file.type)
    if (!ext) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, or GIF images are allowed' }, { status: 415 })
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be between 1 byte and 5 MB' }, { status: 413 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Store under the uploader's own folder (matches the storage RLS "own folder only"
    // policy) with a server-chosen name; never trust the client filename.
    const fileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`

    const { error } = await supabase.storage
      .from('squad_photos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Supabase Storage Error:', error.message)
      throw error
    }

    const { data: publicUrlData } = supabase.storage
      .from('squad_photos')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrlData.publicUrl })
  } catch (error: any) {
    console.error('[Upload Error]', error.message)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
