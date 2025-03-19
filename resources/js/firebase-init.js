// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB7RoHQrVwENdnc55FY-wBOSdKdLtxToWo",
    authDomain: "memo-notifications.firebaseapp.com",
    projectId: "memo-notifications",
    storageBucket: "memo-notifications.firebasestorage.app",
    messagingSenderId: "104025865077",
    appId: "1:104025865077:web:68fd2247f8c95b9670713c"
};

console.log('[FIREBASE] Initializing Firebase with config:', {
    apiKey: firebaseConfig.apiKey,
    projectId: firebaseConfig.projectId,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId.split(':')[0] + ':***' // Only show part of app ID for security
});

// Initialize Firebase
let app;
try {
    app = initializeApp(firebaseConfig);
    console.log('[FIREBASE] Firebase app initialized successfully');
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

export {
    app,
    messaging,
    getToken,
    getTokenWithLogging,
    onMessage,
    initializeMessaging,
    checkFirebaseConnection,
    setupMessagingListener
};
