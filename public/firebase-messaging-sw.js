// Add better logging to service worker
console.log('[FIREBASE-SW] Service worker loading...');

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

console.log('[FIREBASE-SW] Firebase scripts imported successfully');

const firebaseConfig = {
  apiKey: "AIzaSyB7RoHQrVwENdnc55FY-wBOSdKdLtxToWo",
  authDomain: "memo-notifications.firebaseapp.com",
  projectId: "memo-notifications",
  storageBucket: "memo-notifications.firebasestorage.app",
  messagingSenderId: "104025865077",
  appId: "1:104025865077:web:68fd2247f8c95b9670713c"
};

console.log('[FIREBASE-SW] Initializing Firebase in Service Worker');

try {
  firebase.initializeApp(firebaseConfig);
  console.log('[FIREBASE-SW] Firebase initialized in Service Worker');
} catch (error) {
  console.error('[FIREBASE-SW] Error initializing Firebase in Service Worker:', error);
}

let messaging;
try {
  messaging = firebase.messaging();
  console.log('[FIREBASE-SW] Firebase Messaging initialized in Service Worker');
} catch (error) {
  console.error('[FIREBASE-SW] Error initializing Firebase Messaging in Service Worker:', error);
}

// Handle background messages
if (messaging) {
  messaging.onBackgroundMessage(function(payload) {
    console.log('[FIREBASE-SW] Received background message:', payload);

    try {
      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: '/images/logo.png',
        badge: '/images/logo.png',
        data: payload.data
      };

      console.log('[FIREBASE-SW] Showing notification:', { title: notificationTitle, options: notificationOptions });
      return self.registration.showNotification(notificationTitle, notificationOptions);
    } catch (error) {
      console.error('[FIREBASE-SW] Error showing notification:', error);
    }
  });
  console.log('[FIREBASE-SW] Background message handler registered');
} else {
  console.warn('[FIREBASE-SW] Cannot register background message handler - messaging not initialized');
}

self.addEventListener('notificationclick', function(event) {
  console.log('[FIREBASE-SW] Notification clicked:', event);
  event.notification.close();

  // This will open the app and pass data if available
  const urlToOpen = event.notification.data?.url || '/';
  console.log('[FIREBASE-SW] Opening URL:', urlToOpen);

  event.waitUntil(
    clients.matchAll({type: 'window'}).then(function(windowClients) {
      console.log('[FIREBASE-SW] Found window clients:', windowClients.length);

      // Check if there's already a window open
      for (let i = 0; i < windowClients.length; i++) {
        let client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          console.log('[FIREBASE-SW] Focusing existing client:', client.url);
          return client.focus();
        }
      }

      // If no window open, open a new one
      if (clients.openWindow) {
        console.log('[FIREBASE-SW] Opening new window for URL:', urlToOpen);
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

console.log('[FIREBASE-SW] Service worker initialization complete');
