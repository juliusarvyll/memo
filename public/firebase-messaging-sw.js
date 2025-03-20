// Simplest possible service worker
self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});

// Basic firebase messaging integration
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB7RoHQrVwENdnc55FY-wBOSdKdLtxToWo",
  authDomain: "memo-notifications.firebaseapp.com",
  projectId: "memo-notifications",
  messagingSenderId: "104025865077",
  appId: "1:104025865077:web:68fd2247f8c95b9670713c"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/images/logo.png'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);

    // Close the notification
    event.notification.close();

    // Handle action clicks
    if (event.action === 'view' && event.notification.data?.memo_id) {
        event.waitUntil(
            clients.openWindow(`/memos/${event.notification.data.memo_id}`)
        );
        return;
    }

    // Default behavior: navigate to deep link or home
    const urlToOpen = event.notification.data?.deepLink || '/';

    event.waitUntil(
        clients.matchAll({type: 'window'}).then((windowClients) => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window/tab
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Handle push events directly with ServiceWorkerRegistration.showNotification
self.addEventListener('push', (event) => {
    console.log('Push message received:', event);

    if (!event.data) {
        return self.registration.showNotification('New Message', {
            body: 'You have received a new notification',
            icon: '/images/logo.png'
        });
    }

    try {
        // Parse the push data
        const data = event.data.json();

        // If there's no notification object, create a default one
        if (!data.notification) {
            return self.registration.showNotification('New Message', {
                body: 'You have a new message',
                icon: '/images/logo.png',
                data: data
            });
        }
    } catch (error) {
        console.error('Error handling push event:', error);

        // Show a fallback notification on error
        return self.registration.showNotification('New Notification', {
            body: 'Something new happened in your app',
            icon: '/images/logo.png'
        });
    }
});
