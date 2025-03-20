// A simpler approach without Firebase SDK
const webPushEnabled = () => {
    return 'PushManager' in window && 'serviceWorker' in navigator;
};

const requestPushPermission = async () => {
    if (!webPushEnabled()) return false;

    try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    } catch (error) {
        console.error('Error requesting permission:', error);
        return false;
    }
};

const registerPushSubscription = async (serverPublicKey) => {
    if (!webPushEnabled()) return null;

    try {
        const registration = await navigator.serviceWorker.register('/push-worker.js');
        await navigator.serviceWorker.ready;

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(serverPublicKey)
        });

        return subscription;
    } catch (error) {
        console.error('Error registering push subscription:', error);
        return null;
    }
};

// Helper function to convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export { webPushEnabled, requestPushPermission, registerPushSubscription };
