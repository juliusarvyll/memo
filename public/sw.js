// Add push notification event handling
self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();

        const options = {
            body: data.body,
            icon: '/images/logo.png',
            badge: '/images/logo.png',
            vibrate: [100, 50, 100],
            data: {
                url: data.url || '/'
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const url = event.notification.data.url;

    event.waitUntil(
        clients.matchAll({type: 'window'}).then(function(windowClients) {
            // Check if there's already a window open
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }

            // If no window open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
