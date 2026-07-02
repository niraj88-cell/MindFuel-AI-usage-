'use client'

import React, { useEffect, useState } from 'react'
import { Bell, Info, Loader2 } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsInstall, setNeedsInstall] = useState(false)

  useEffect(() => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    setNeedsInstall(isIos && !isStandalone)
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
      setIsSubscribed(Boolean(subscription))
    } catch {
      setError('Could not check reminder status.')
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
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Notification permission was not granted.')
      }

      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!publicVapidKey) {
        throw new Error('Push reminders are not configured yet.')
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      })

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      })

      if (!response.ok) {
        throw new Error('Could not save reminder subscription.')
      }

      setIsSubscribed(true)
    } catch (err: any) {
      setError(err.message || 'Could not update reminders.')
    } finally {
      setLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-white p-4 text-sm leading-relaxed text-[#4B5563]">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#4CAF50]" />
        <div>
          <p className="font-semibold text-[#111827]">{needsInstall ? 'Install SatyaShift to enable reminders.' : 'Push reminders are not available in this browser.'}</p>
          <p className="mt-1 text-[#6B7280]">
            You can still use this screen as your reminder center.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isSubscribed ? 'bg-[#ECFDF5] text-[#4CAF50]' : 'bg-[#FAF8F4] text-[#6B7280]'}`}>
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#111827]">Browser reminders</p>
          <p className="text-sm text-[#6B7280]">{isSubscribed ? 'Enabled for this device.' : 'Ask this browser to remind you.'}</p>
        </div>
      </div>

      <div className="flex flex-col items-start gap-2 sm:items-end">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#6B7280]" />
        ) : (
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              isSubscribed ? 'bg-[#111827]' : 'bg-black/10'
            }`}
            aria-pressed={isSubscribed}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${
                isSubscribed ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        )}
        {error && <p className="max-w-xs text-sm text-[#B42318]">{error}</p>}
      </div>
    </div>
  )
}
