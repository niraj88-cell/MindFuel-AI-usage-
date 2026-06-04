self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: '/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2'
      },
      actions: [
        {
          action: 'explore',
          title: 'Open MindFuel',
          icon: '/checkmark.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/xmark.png'
        },
      ]
    }
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  if (event.action === 'explore' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})
