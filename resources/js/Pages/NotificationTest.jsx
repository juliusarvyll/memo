import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB7RoHQrVwENdnc55FY-wBOSdKdLtxToWo",
    authDomain: "memo-notifications.firebaseapp.com",
    projectId: "memo-notifications",
    storageBucket: "memo-notifications.firebasestorage.app",
    messagingSenderId: "104025865077",
    appId: "1:104025865077:web:68fd2247f8c95b9670713c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// VAPID key for web push
const FIREBASE_VAPID_KEY = "BGZrqo2reX29cRLUfpir0-hsHGqA0zEeNcHbggbeVcaVg2tvdfTw55bKZQpdRsDSe3hvwvivmMViIRvKCzA7k3o";

// Helper functions for messaging
let messaging = null;

export default function NotificationTest() {
    const { auth } = usePage().props;
    const user = auth.user;

    const [diagnostics, setDiagnostics] = useState([]);
    const [permission, setPermission] = useState(null);
    const [fcmSupported, setFcmSupported] = useState(false);
    const [fcmToken, setFcmToken] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [isSending, setIsSending] = useState(false);

    const log = (message) => {
        setDiagnostics(prev => [...prev, { time: new Date().toISOString(), message }]);
        console.log(message);
    };

    // Initialize Firebase messaging
    const initializeMessaging = async () => {
        log('Attempting to initialize Firebase Messaging...');

        try {
            // Check if messaging is supported
            const isMessagingSupported = await isSupported();

            if (!isMessagingSupported) {
                log('❌ Firebase messaging is not supported in this browser');
                setFcmSupported(false);
                return false;
            }

            // Initialize messaging
            messaging = getMessaging(app);
            log('✅ Firebase messaging initialized successfully');
            setFcmSupported(true);
            return true;
        } catch (error) {
            log(`❌ Error initializing Firebase messaging: ${error.message}`);
            setFcmSupported(false);
            return false;
        }
    };

    // Get FCM token
    const getFCMToken = async () => {
        log('Requesting FCM token...');

        try {
            if (!messaging) {
                log('❌ Firebase messaging not initialized');
                return null;
            }

            const currentToken = await getToken(messaging, {
                vapidKey: FIREBASE_VAPID_KEY
            });

            if (currentToken) {
                log(`✅ FCM token obtained: ${currentToken.substring(0, 10)}...`);
                setFcmToken(currentToken);
                return currentToken;
            } else {
                log('❌ No FCM token received');
                return null;
            }
        } catch (error) {
            log(`❌ Error getting FCM token: ${error.message}`);
            return null;
        }
    };

    // Register token with backend
    const registerToken = async (token) => {
        log('Registering FCM token with backend...');

        try {
            const response = await fetch('/fcm/register-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                },
                body: JSON.stringify({
                    token: token,
                    user_id: user?.id
                }),
            });

            if (response.ok) {
                log('✅ FCM token registered with server successfully');
                return true;
            } else {
                const data = await response.json();
                log(`❌ Failed to register FCM token: ${data.message || response.statusText}`);
                return false;
            }
        } catch (error) {
            log(`❌ Error registering FCM token: ${error.message}`);
            return false;
        }
    };

    // Send a test notification
    const sendTestNotification = async () => {
        try {
            setIsSending(true);

            // Make sure you have a token
            if (!fcmToken) {
                addDiagnostic('❌ No FCM token available');
                return;
            }

            addDiagnostic('Sending test notification...');

            // Get the CSRF token (still needed for web routes)
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

            // Send the request with token to the web route
            const response = await fetch('/fcm/test-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    token: fcmToken
                })
            });

            const data = await response.json();

            if (data.success) {
                addDiagnostic(`✅ Test notification sent successfully`);
            } else {
                addDiagnostic(`❌ Failed to send test notification: ${data.message}`);
            }
        } catch (error) {
            console.error('Error sending test notification:', error);
            addDiagnostic(`❌ Error sending test notification: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    // Test kreait/firebase PHP package integration
    const testFirebaseIntegration = async () => {
        log('🔄 Testing kreait/firebase PHP package integration...');
        setIsLoading(true);

        try {
            // Ensure we have a token
            const token = fcmToken || await getFCMToken();

            if (!token) {
                throw new Error('No FCM token available');
            }

            // Updated URL without the /api prefix
            const response = await fetch('/fcm/validate-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                },
                body: JSON.stringify({ token }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                log('✅ kreait/firebase PHP package is properly configured!');
                setTestResult({ success: true, message: 'PHP Firebase integration working properly' });
            } else {
                log(`❌ kreait/firebase PHP package issue: ${result.message}`);
                setTestResult({ success: false, message: `PHP Firebase integration issue: ${result.message}` });
            }
        } catch (error) {
            log(`❌ Error testing kreait/firebase integration: ${error.message}`);
            setTestResult({ success: false, message: `Error testing PHP integration: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const runTests = async () => {
        // Clear previous logs
        setDiagnostics([]);
        setTestResult(null);
        setIsLoading(true);

        // Basic environment checks
        log(`Protocol: ${window.location.protocol}`);
        log(`Notification API available: ${'Notification' in window}`);
        log(`Service Worker API available: ${'serviceWorker' in navigator}`);
        log(`Current notification permission: ${Notification.permission}`);
        setPermission(Notification.permission);

        // Check service worker registration
        if ('serviceWorker' in navigator) {
            try {
                log('Checking for registered service workers...');
                const registrations = await navigator.serviceWorker.getRegistrations();
                log(`Found ${registrations.length} service worker registrations`);

                registrations.forEach((reg, index) => {
                    log(`SW ${index + 1}: scope=${reg.scope}, state=${reg.active ? 'active' : 'inactive'}`);
                });

                // Specifically look for our firebase-messaging-sw.js
                const fcmServiceWorker = registrations.find(reg =>
                    reg.scope.includes('/firebase-messaging-sw.js') ||
                    reg.scope.endsWith('/')
                );

                if (fcmServiceWorker) {
                    log('✅ Firebase messaging service worker found');
                } else {
                    log('❌ Firebase messaging service worker not found');
                }
            } catch (error) {
                log(`Error checking service workers: ${error.message}`);
            }
        }

        // Check if Firebase is available
        if (typeof firebase !== 'undefined') {
            log('✅ Firebase is available globally');

            if (firebase.messaging) {
                log('✅ Firebase messaging is available globally');
            } else {
                log('❌ Firebase messaging is not available globally');
            }
        } else {
            log('❌ Firebase is not available globally');
        }

        // Initialize Firebase messaging (modular API)
        await initializeMessaging();

        // Get FCM token if messaging is supported
        if (fcmSupported) {
            await getFCMToken();
        }

        setIsLoading(false);
    };

    // Run tests on component mount
    useEffect(() => {
        runTests();

        // Set up message listener if possible
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                log(`Received message from service worker: ${JSON.stringify(event.data)}`);
            });
        }

        return () => {
            // Cleanup if needed
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('message');
            }
        };
    }, []);

    return (
        <>
            <Head title="Notification Test" />
            <div className="container mx-auto py-8 px-4 max-w-4xl">
                <h1 className="text-2xl font-bold mb-6">Firebase Notification Test</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-3">Environment</h2>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Protocol:</span>
                                <span className={window.location.protocol === 'https:' ? 'text-green-600' : 'text-red-600'}>
                                    {window.location.protocol}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Notification API:</span>
                                <span className={'Notification' in window ? 'text-green-600' : 'text-red-600'}>
                                    {'Notification' in window ? 'Available' : 'Not Available'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Service Worker API:</span>
                                <span className={'serviceWorker' in navigator ? 'text-green-600' : 'text-red-600'}>
                                    {'serviceWorker' in navigator ? 'Available' : 'Not Available'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Permission:</span>
                                <div className={`px-3 py-1 rounded ${
                                    permission === 'granted' ? 'bg-green-100 text-green-800' :
                                    permission === 'denied' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {permission || 'unknown'}
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <span>FCM Support:</span>
                                <span className={fcmSupported ? 'text-green-600' : 'text-red-600'}>
                                    {fcmSupported ? 'Supported' : 'Not Supported'}
                                </span>
                            </div>
                            {fcmToken && (
                                <div className="flex flex-col">
                                    <span className="font-medium">FCM Token:</span>
                                    <span className="text-xs break-all mt-1 bg-gray-100 p-2 rounded">
                                        {fcmToken.substring(0, 20)}...
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-3">Actions</h2>
                        <div className="space-y-3">
                            <Button
                                onClick={runTests}
                                disabled={isLoading}
                                className="w-full"
                            >
                                {isLoading ? 'Running Tests...' : 'Run Diagnostic Tests'}
                            </Button>

                            <Button
                                onClick={getFCMToken}
                                disabled={isLoading || !fcmSupported}
                                variant="outline"
                                className="w-full"
                            >
                                Request FCM Token
                            </Button>

                            <Button
                                onClick={sendTestNotification}
                                disabled={isSending || !fcmSupported || !fcmToken}
                                variant="secondary"
                                className="w-full"
                            >
                                Send Test Notification
                            </Button>

                            <Button
                                onClick={testFirebaseIntegration}
                                disabled={isLoading || !fcmSupported || !fcmToken}
                                variant="secondary"
                                className="w-full"
                            >
                                Test PHP Integration
                            </Button>
                        </div>

                        {testResult && (
                            <div className={`mt-4 p-3 rounded ${
                                testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                                {testResult.message}
                            </div>
                        )}
                    </div>
                </div>

                <div className="border rounded-lg overflow-hidden bg-white shadow">
                    <h2 className="text-lg font-semibold p-3 bg-gray-100">Diagnostic Log:</h2>
                    <div className="h-96 overflow-y-auto p-4 bg-gray-50 font-mono text-sm">
                        {diagnostics.map((entry, index) => (
                            <div key={index} className="mb-1">
                                <span className="text-gray-500">[{entry.time.split('T')[1].split('.')[0]}]</span>{' '}
                                {entry.message}
                            </div>
                        ))}
                        {diagnostics.length === 0 && (
                            <div className="text-gray-400">No diagnostic information yet...</div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
