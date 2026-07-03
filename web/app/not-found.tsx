import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center text-ink">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">Not found</p>
      <h1 className="mt-4 max-w-md text-2xl font-semibold tracking-tight">
        There&rsquo;s nothing at this address.
      </h1>
      <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-soft">
        The page may have moved, or the link was mistyped. Nothing is broken.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex h-11 items-center rounded-lg bg-ink px-6 text-sm font-semibold text-paper transition-colors hover:bg-ink-hover"
      >
        Back to today
      </Link>
    </main>
  )
}
