'use client'

import React, { useEffect, useRef } from 'react'

interface AnimatedBackgroundProps {
  variant?: 'landing' | 'auth'
  className?: string
}

export function AnimatedBackground({ variant = 'landing', className = '' }: AnimatedBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let animationFrameId: number;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(updateGlowPosition);
      }
    }

    const updateGlowPosition = () => {
      if (glowRef.current) {
        // Use transform translate instead of left/top for GPU acceleration
        glowRef.current.style.transform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%)`
      }
      animationFrameId = 0;
    }

    // Set initial position
    updateGlowPosition();

    const el = containerRef.current
    if (el) {
      el.addEventListener('mousemove', handleMouseMove, { passive: true })
      return () => {
        el.removeEventListener('mousemove', handleMouseMove)
        if (animationFrameId) cancelAnimationFrame(animationFrameId)
      }
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
        className="absolute w-[600px] h-[600px] rounded-full animate-orb-1 opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(120, 130, 255, 0.08) 0%, transparent 70%)',
          top: '-10%',
          left: '-5%',
          filter: 'blur(40px)',
          willChange: 'transform',
        }}
      />
      <div 
        className="absolute w-[500px] h-[500px] rounded-full animate-orb-2 opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(160, 140, 255, 0.06) 0%, transparent 70%)',
          bottom: '-15%',
          right: '-10%',
          filter: 'blur(50px)',
          willChange: 'transform',
        }}
      />
      <div 
        className="absolute w-[400px] h-[400px] rounded-full animate-orb-3 opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.04) 0%, transparent 70%)',
          top: '40%',
          left: '50%',
          filter: 'blur(50px)',
          willChange: 'transform',
        }}
      />
      {variant === 'landing' && (
        <div 
          className="absolute w-[350px] h-[350px] rounded-full animate-orb-4 opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(100, 180, 255, 0.05) 0%, transparent 70%)',
            top: '20%',
            right: '10%',
            filter: 'blur(40px)',
            willChange: 'transform',
          }}
        />
      )}

      {/* Mouse-reactive glow */}
      <div 
        ref={glowRef}
        className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none transition-transform duration-700 ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(150, 140, 255, 0.06) 0%, transparent 70%)',
          filter: 'blur(30px)',
          willChange: 'transform',
        }}
      />

      {/* Top edge fade for depth */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black to-transparent pointer-events-none" />
    </div>
  )
}

