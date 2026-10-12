// Service Worker for Push Notifications

self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('[SW] push event received. hasData:', !!event.data);

  let data = {
    title: 'Scoreboard Update',
    body: 'Something happened in a game you follow!',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'scoreboard-notification',
    data: {}
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
      console.log('[SW] push payload parsed:', data);
    } catch (e) {
      data.body = event.data.text();
      console.log('[SW] push payload (text):', data.body);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    tag: data.tag || 'scoreboard-notification',
    data: data.data || {},
    vibrate: [200, 100, 200],
    actions: data.actions || [],
    // Require interaction keeps it on screen until user acts on it.
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => console.log('[SW] showNotification resolved'))
      .catch((err) => console.error('[SW] showNotification failed:', err))
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
