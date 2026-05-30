'use client'

import React, { useEffect, useRef, useState } from 'react'

interface AnimatedBackgroundProps {
  variant?: 'landing' | 'auth'
  className?: string
}

export function AnimatedBackground({ variant = 'landing', className = '' }: AnimatedBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setMousePos({ x, y })
    }

    const el = containerRef.current
    if (el) {
      el.addEventListener('mousemove', handleMouseMove)
      return () => el.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden pointer-events-auto ${className}`}>
      {/* Dot grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Floating gradient orbs */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full animate-orb-1"
        style={{
          background: 'radial-gradient(circle, rgba(120, 130, 255, 0.08) 0%, transparent 70%)',
          top: '-10%',
          left: '-5%',
          filter: 'blur(60px)',
        }}
      />
      <div 
        className="absolute w-[500px] h-[500px] rounded-full animate-orb-2"
        style={{
          background: 'radial-gradient(circle, rgba(160, 140, 255, 0.06) 0%, transparent 70%)',
          bottom: '-15%',
          right: '-10%',
          filter: 'blur(80px)',
        }}
      />
      <div 
        className="absolute w-[400px] h-[400px] rounded-full animate-orb-3"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.04) 0%, transparent 70%)',
          top: '40%',
          left: '50%',
          transform: 'translateX(-50%)',
          filter: 'blur(70px)',
        }}
      />
      {variant === 'landing' && (
        <div 
          className="absolute w-[350px] h-[350px] rounded-full animate-orb-4"
          style={{
            background: 'radial-gradient(circle, rgba(100, 180, 255, 0.05) 0%, transparent 70%)',
            top: '20%',
            right: '10%',
            filter: 'blur(60px)',
          }}
        />
      )}

      {/* Mouse-reactive glow */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full transition-all duration-700 ease-out pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(150, 140, 255, 0.06) 0%, transparent 70%)',
          left: `${mousePos.x}%`,
          top: `${mousePos.y}%`,
          transform: 'translate(-50%, -50%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Top edge fade for depth */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black to-transparent" />
    </div>
  )
}
