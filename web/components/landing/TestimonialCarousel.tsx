'use client'

import React, { useState, useEffect } from 'react'

const TESTIMONIALS = [
  {
    quote: "I always knew doomscrolling was draining me, but I never had proof. MindFuel showed me exactly which apps were tanking my mood — and the AI coach helped me actually change.",
    name: "Alex R.",
    role: "Software Engineer",
    initial: "A",
  },
  {
    quote: "At 2am, MindFuel made me type 'I am choosing to keep scrolling' before it let me continue. I couldn't do it. First time I closed my phone voluntarily in years.",
    name: "Priya K.",
    role: "Product Designer",
    initial: "P",
  },
  {
    quote: "My mental score went from 34 to 71 in two weeks. I didn't block a single app — I just became aware of what my feed was doing to my brain. That was enough.",
    name: "Jordan M.",
    role: "Content Creator",
    initial: "J",
  },
]

export function TestimonialCarousel() {
  const [active, setActive] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setActive((prev) => (prev + 1) % TESTIMONIALS.length)
        setFade(true)
      }, 400)
    }, 6000)

    return () => clearInterval(interval)
  }, [])

  const t = TESTIMONIALS[active]

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Glass card */}
      <div className="relative p-8 sm:p-10 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md overflow-hidden">
        {/* Subtle top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div
          className="transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            opacity: fade ? 1 : 0,
            transform: fade ? 'translateY(0)' : 'translateY(10px)',
          }}
        >
          {/* Quote */}
          <p className="text-zinc-300 text-base sm:text-lg leading-relaxed italic mb-8">
            &ldquo;{t.quote}&rdquo;
          </p>

          {/* Author */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm font-semibold text-zinc-400">
              {t.initial}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{t.name}</p>
              <p className="text-xs text-zinc-600">{t.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => { setFade(false); setTimeout(() => { setActive(i); setFade(true) }, 300) }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/20 hover:bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
