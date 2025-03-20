// Create this file with the same content as your firebase-messaging-sw.js
// This location is sometimes needed for proper service worker registration

// Copy of the main service worker for proper discovery
// Messaging-only service worker
console.log('[FCM-SW-WELLKNOWN] Service worker loading...');

// Import only the minimum required Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

console.log('[FCM-SW-WELLKNOWN] Firebase messaging scripts imported');

// Minimal configuration for messaging only
const firebaseConfig = {
  apiKey: "AIzaSyB7RoHQrVwENdnc55FY-wBOSdKdLtxToWo",
  messagingSenderId: "104025865077",
  projectId: "memo-notifications",
  appId: "1:104025865077:web:68fd2247f8c95b9670713c"
  // Removed hosting-related fields
};

// Set up the service worker with proper error handling for caching
self.addEventListener('install', function(event) {
  console.log('[FCM-SW-WELLKNOWN] Service Worker installing...');
  self.skipWaiting();

  // Don't try to cache resources in this service worker since we're only using it for FCM
});

self.addEventListener('activate', function(event) {
  console.log('[FCM-SW-WELLKNOWN] Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Initialize Firebase carefully
let messaging = null;
try {
  firebase.initializeApp(firebaseConfig);
  console.log('[FCM-SW-WELLKNOWN] Firebase initialized successfully');

  try {
    messaging = firebase.messaging();
    console.log('[FCM-SW-WELLKNOWN] Firebase Messaging initialized successfully');
  } catch (error) {
    console.error('[FCM-SW-WELLKNOWN] Error initializing Firebase Messaging:', error);
  }
} catch (error) {
  console.error('[FCM-SW-WELLKNOWN] Error initializing Firebase:', error);
}

// Handle background messages, but only if messaging is initialized
if (messaging) {
  messaging.onBackgroundMessage(function(payload) {
    console.log('[FCM-SW-WELLKNOWN] Received background message:', payload);

    try {
      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: '/images/logo.png',
        badge: '/images/logo.png',
        data: payload.data
      };

      console.log('[FCM-SW-WELLKNOWN] Showing notification:', { title: notificationTitle });
      return self.registration.showNotification(notificationTitle, notificationOptions);
    } catch (error) {
      console.error('[FCM-SW-WELLKNOWN] Error showing notification:', error);
    }
  });
  console.log('[FCM-SW-WELLKNOWN] Background message handler registered');
} else {
  console.warn('[FCM-SW-WELLKNOWN] Cannot register background message handler - messaging not initialized');
}

self.addEventListener('notificationclick', function(event) {
  console.log('[FCM-SW-WELLKNOWN] Notification clicked');
  event.notification.close();

  // This will open the app
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({type: 'window'}).then(function(windowClients) {
      // Check if there's already a window open
      for (let i = 0; i < windowClients.length; i++) {
        let client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // If no window open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Create a simple fetch event handler that doesn't attempt to cache anything
self.addEventListener('fetch', function(event) {
  // Don't try to cache or serve from cache
});

console.log('[FCM-SW-WELLKNOWN] Service worker initialization complete');
