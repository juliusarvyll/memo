// Import only what you need for messaging
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

// Bare minimum Firebase configuration for FCM only
const firebaseConfig = {
    apiKey: "AIzaSyB7RoHQrVwENdnc55FY-wBOSdKdLtxToWo",
    authDomain: "...",
    projectId: "memo-notifications",
    messagingSenderId: "104025865077",
    appId: "1:104025865077:web:68fd2247f8c95b9670713c"
    // Remove hosting-related fields like authDomain and storageBucket
};

console.log('[FIREBASE] Initializing Firebase with messaging-only config');

// Initialize Firebase
let app;
try {
    app = initializeApp(firebaseConfig);
    console.log('[FIREBASE] Firebase app initialized for messaging only');
} catch (error) {
    console.error('[FIREBASE] Error initializing Firebase app:', error);
}

// Only initialize messaging if it's supported
let messaging = null;

// Function to verify if Firebase connection is working
const checkFirebaseConnection = async () => {
    try {
        // A simple test - attempt to access the app config
        const appConfig = app.options;
        console.log('[FIREBASE] Connection test - able to access app config:', {
            projectId: appConfig.projectId,
            messagingSenderId: appConfig.messagingSenderId
        });
        return true;
    } catch (error) {
        console.error('[FIREBASE] Connection test failed:', error);
        return false;
    }
};

// Export async function to check and initialize messaging
const initializeMessaging = async () => {
    try {
        // First check if Firebase app is connected
        const isConnected = await checkFirebaseConnection();
        if (!isConnected) {
            console.error('[FIREBASE] Cannot initialize messaging - Firebase app is not connected');
            return false;
        }

        console.log('[FIREBASE] Checking browser support for Firebase Messaging');
        // Check if the browser supports Firebase Messaging
        const isMessagingSupported = await isSupported();

        if (isMessagingSupported) {
            console.log('[FIREBASE] Browser supports Firebase Messaging, initializing...');
            messaging = getMessaging(app);
            console.log('[FIREBASE] Firebase Messaging initialized successfully');
            return true;
        } else {
            console.warn('[FIREBASE] Firebase Messaging is not supported in this browser');
            return false;
        }
    } catch (error) {
        console.error('[FIREBASE] Error initializing Firebase Messaging:', error);
        return false;
    }
};

// Helper function to get FCM token with logging
const getTokenWithLogging = async (messagingInstance, options = {}) => {
    try {
        console.log('[FIREBASE] Requesting FCM token...');
        const token = await getToken(messagingInstance, options);
        if (token) {
            console.log('[FIREBASE] FCM token obtained successfully:', token.substring(0, 10) + '...');
            return token;
        } else {
            console.warn('[FIREBASE] Failed to obtain FCM token - returned empty');
            return null;
        }
    } catch (error) {
        console.error('[FIREBASE] Error getting FCM token:', error);
        return null;
    }
};

// Set up messaging listener with logging
const setupMessagingListener = (messagingInstance) => {
    if (!messagingInstance) {
        console.warn('[FIREBASE] Cannot set up message listener - messaging is not initialized');
        return;
    }

    console.log('[FIREBASE] Setting up foreground message listener');
    onMessage(messagingInstance, (payload) => {
        console.log('[FIREBASE] Received foreground message:', payload);
        // You can process the message here if needed
    });
    console.log('[FIREBASE] Foreground message listener set up successfully');
};

// Register service worker early
const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
        try {
            console.log('[FIREBASE] Registering service worker...');
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                scope: '/'
            });
            console.log('[FIREBASE] Service worker registered:', registration);
            return registration;
        } catch (error) {
            console.error('[FIREBASE] Service worker registration failed:', error);
            return null;
        }
    }
    return null;
};

export {
    app,
    messaging,
    getToken,
    getTokenWithLogging,
    onMessage,
    initializeMessaging,
    checkFirebaseConnection,
    setupMessagingListener,
    registerServiceWorker
};
