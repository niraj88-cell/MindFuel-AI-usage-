import { NextResponse } from 'next/server'

export function GET() {
  return new NextResponse('google-site-verification: google589f8261d237f560.html', {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}
