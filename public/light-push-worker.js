// A simple push notification service worker without Firebase dependencies

self.addEventListener('push', function(event) {
  console.log('[LIGHT-PUSH] Push message received', event);

  let notificationData = {};
  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = {
      title: 'New Notification',
      body: event.data ? event.data.text() : 'No payload'
    };
  }

  const title = notificationData.title || 'New Notification';
  const options = {
    body: notificationData.body || 'You have a new notification',
    icon: '/images/logo.png',
    badge: '/images/logo.png',
    data: notificationData.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[LIGHT-PUSH] Notification clicked', event);
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({type: 'window'}).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});

self.addEventListener('install', event => {
  console.log('[LIGHT-PUSH] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[LIGHT-PUSH] Service Worker activated');
  event.waitUntil(self.clients.claim());
});
