import { ImageResponse } from 'next/og'

// Site-wide Open Graph card (file convention: applies to every route that doesn't
// define its own). Links with a real og:image render as cards instead of bare text
// on WhatsApp, X, Slack, Reddit, iMessage — a 2–3x difference in click-through.
// Palette mirrors globals.css tokens (satori can't read CSS custom properties).

export const runtime = 'edge'
export const alt =
  'SatyaShift — proof you did the work. Verified focus that sees only domains, never pages, content, or keystrokes.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '84px',
          backgroundColor: '#FAF8F4',
          color: '#23201B',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* The bindu: closed ring, filled center — the verification mark. */}
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '5px solid #2D6A3F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#2D6A3F', display: 'flex' }} />
          </div>
          <div style={{ fontSize: '36px', fontWeight: 600, display: 'flex' }}>SatyaShift</div>
        </div>

        <div
          style={{
            marginTop: '52px',
            fontSize: '88px',
            fontWeight: 700,
            letterSpacing: '-3px',
            lineHeight: 1.04,
            display: 'flex',
          }}
        >
          Proof you did the work.
        </div>

        <div style={{ marginTop: '34px', fontSize: '33px', color: '#575148', lineHeight: 1.35, display: 'flex' }}>
          Verified focus. It sees only domains — never pages, content, or what you type.
        </div>

        <div
          style={{
            marginTop: '64px',
            paddingTop: '32px',
            borderTop: '2px solid rgba(35, 32, 27, 0.11)',
            fontSize: '27px',
            color: '#6F6A61',
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex' }}>satyashift.vercel.app</div>
          <div style={{ display: 'flex', color: '#2D6A3F' }}>See it working — no account needed</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
