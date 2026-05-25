'use client'

import React, { useState, useEffect } from 'react'
import { Bell, Loader2, Info } from 'lucide-react'

// Convert the VAPID public key to a Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isIos, setIsIos] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream)
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)
    checkSupport()
  }, [])

  async function checkSupport() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setLoading(false)
      return
    }

    setIsSupported(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (err) {
      console.error('Error checking subscription:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle() {
    setError(null)
    setLoading(true)

    try {
      const registration = await navigator.serviceWorker.ready

      if (isSubscribed) {
        // Unsubscribe
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          })
          await subscription.unsubscribe()
        }
        setIsSubscribed(false)
      } else {
        // Subscribe
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          throw new Error('Notification permission denied')
        }

        const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!publicVapidKey) {
          throw new Error('VAPID public key not configured')
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
        })

        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription }),
        })

        if (!res.ok) {
          throw new Error('Failed to save subscription on server')
        }

        setIsSubscribed(true)
      }
    } catch (err: any) {
      console.error('Push toggle error:', err)
      setError(err.message || 'Something went wrong')
      if (err.message === 'Notification permission denied') {
        setError('Permission denied. Please enable notifications in your browser settings.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isSupported) {
    if (isIos && !isStandalone) {
      return (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-white">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong className="block mb-1">Want push reminders?</strong>
            To enable notifications on iOS, you must first add this app to your Home Screen (Share → Add to Home Screen), then open it from there.
          </div>
        </div>
      )
    }
    return null // Not supported on this browser
  }

  return (
    <div className="relative flex items-center justify-between p-4 rounded-2xl bg-zinc-800/30 border border-white/10 group hover:border-white/20 transition-all">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSubscribed ? 'bg-white text-black' : 'bg-white/5 text-zinc-400'}`}>
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-bold text-white">Daily Reminders</div>
          <div className="text-xs text-zinc-500">Get a gentle push to log your pulse</div>
        </div>
      </div>
      
      <div className="flex flex-col items-end">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        ) : (
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              isSubscribed ? 'bg-white' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full ${isSubscribed ? 'bg-black' : 'bg-white'} transition-transform ${
                isSubscribed ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        )}
      </div>
      {error && (
        <div className="absolute mt-16 text-[10px] text-rose-400 max-w-[200px] text-right right-4">
          {error}
        </div>
      )}
    </div>
  )
}
