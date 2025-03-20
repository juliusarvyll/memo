import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';

export default function NotificationTest() {
    const [diagnostics, setDiagnostics] = useState([]);
    const [permission, setPermission] = useState(null);

    const log = (message) => {
        setDiagnostics(prev => [...prev, { time: new Date().toISOString(), message }]);
    };

    const runTests = async () => {
        // Clear previous logs
        setDiagnostics([]);

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

                registrations.forEach(reg => {
                    log(`- Service worker scope: ${reg.scope}, state: ${reg.active ? 'active' : 'inactive'}`);
                });

                // Try to register an existing service worker instead of a blob URL
                log('Testing service worker registration capability...');
                try {
                    // Try to register our real light-push-worker.js instead of a blob
                    const reg = await navigator.serviceWorker.register('/light-push-worker.js');
                    log('Light push service worker registered successfully');

                    // Unregister it after the test
                    await reg.unregister();
                    log('Light push service worker unregistered');
                } catch (error) {
                    log(`Error registering light push worker: ${error.message}`);

                    // Try Firebase messaging worker as fallback
                    try {
                        log('Trying to register firebase-messaging-sw.js as fallback...');
                        const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                        log('Firebase messaging service worker registered successfully');

                        // Note: We don't unregister this one since it might be needed
                        log('Not unregistering Firebase worker as it may be needed for app functionality');
                    } catch (fbError) {
                        log(`Error registering firebase worker: ${fbError.message}`);
                        log('⚠️ Service worker registration tests failed. Your browser may have restrictions on service worker registration.');
                    }
                }
            } catch (error) {
                log(`Error during service worker test: ${error.message}`);
            }
        }

        // Test notification permission request
        log('Testing notification permission request...');
        try {
            if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                log('Requesting notification permission...');
                const result = await Notification.requestPermission();
                log(`Permission request result: ${result}`);
                setPermission(result);
            } else {
                log(`Cannot request permission - already ${Notification.permission}`);
            }
        } catch (error) {
            log(`Error requesting notification permission: ${error.message}`);
        }

        // Try to display a notification if possible
        if (Notification.permission === 'granted') {
            try {
                log('Testing notification creation...');
                const notification = new Notification('Test Notification', {
                    body: 'This is a test notification',
                    icon: '/images/logo.png'
                });

                log('Notification created successfully');

                // Close the notification after 2 seconds
                setTimeout(() => {
                    notification.close();
                    log('Notification closed');
                }, 2000);
            } catch (error) {
                log(`Error creating notification: ${error.message}`);
            }
        }
    };

    useEffect(() => {
        runTests();
    }, []);

    const requestPermissionManually = async () => {
        try {
            log('Manually requesting notification permission...');
            const result = await Notification.requestPermission();
            log(`Manual permission request result: ${result}`);
            setPermission(result);
        } catch (error) {
            log(`Error requesting permission: ${error.message}`);
        }
    };

    const sendTestNotification = () => {
        if (Notification.permission !== 'granted') {
            log('Cannot send test notification - permission not granted');
            return;
        }

        try {
            log('Sending test notification...');
            const notification = new Notification('Manual Test', {
                body: 'This is a manual test notification',
                icon: '/images/logo.png',
            });

            log('Test notification sent successfully');

            notification.onclick = () => {
                log('Notification was clicked');
                notification.close();
            };
        } catch (error) {
            log(`Error sending test notification: ${error.message}`);
        }
    };

    const checkVapidKey = () => {
        try {
            log('Checking VAPID key validity...');

            // The key we're currently using in the app
            const FIREBASE_VAPID_KEY = "BGZrqo2reX29cRLUfpir0-hsHGqA0zEeNcHbggbeVcaVg2tvdfTw55bKZQpdRsDSe3hvwvivmMViIRvKCzA7k3o";

            log(`VAPID key (first 10 chars): ${FIREBASE_VAPID_KEY.substring(0, 10)}...`);

            // Check basic format - should be URL-safe base64
            const isBase64UrlSafe = /^[A-Za-z0-9\-_]+=*$/.test(FIREBASE_VAPID_KEY);
            log(`Key format is URL-safe base64: ${isBase64UrlSafe}`);

            // Check approximate length - VAPID public keys are typically ~88 chars
            log(`Key length: ${FIREBASE_VAPID_KEY.length} characters (should be ~88 chars)`);

            if (!isBase64UrlSafe) {
                log('⚠️ VAPID key is not in URL-safe base64 format. This could cause push registration errors.');
            }

            if (FIREBASE_VAPID_KEY.length < 80) {
                log('⚠️ VAPID key seems too short. Typical VAPID public keys are ~88 characters.');
            }

            // Try to convert to Uint8Array (which is what the API does internally)
            function urlBase64ToUint8Array(base64String) {
                const padding = '='.repeat((4 - base64String.length % 4) % 4);
                const base64 = (base64String + padding)
                    .replace(/-/g, '+')
                    .replace(/_/g, '/');

                try {
                    const rawData = window.atob(base64);
                    const outputArray = new Uint8Array(rawData.length);

                    for (let i = 0; i < rawData.length; ++i) {
                        outputArray[i] = rawData.charCodeAt(i);
                    }
                    return outputArray;
                } catch (error) {
                    throw new Error(`Error converting base64 to Uint8Array: ${error.message}`);
                }
            }

            try {
                const convertedKey = urlBase64ToUint8Array(FIREBASE_VAPID_KEY);
                log(`Successfully converted key to Uint8Array of length: ${convertedKey.length}`);
                log('✅ VAPID key passes basic validation checks');
            } catch (error) {
                log(`⚠️ VAPID key conversion failed: ${error.message}`);
            }
        } catch (error) {
            log(`Error checking VAPID key: ${error.message}`);
        }
    };

    // Add this function to test Firebase messaging
    const testFirebaseMessaging = async () => {
        if (Notification.permission !== 'granted') {
            log('Cannot test FCM - notification permission not granted');
            return;
        }

        try {
            log('Testing Firebase Cloud Messaging...');

            // Try to import Firebase modules
            try {
                const { initializeApp } = await import('firebase/app');
                const { getMessaging, getToken } = await import('firebase/messaging');

                log('Firebase modules imported successfully');

                // Firebase config
                const firebaseConfig = {
                    apiKey: "AIzaSyB7RoHQrVwENdnc55FY-wBOSdKdLtxToWo",
                    messagingSenderId: "104025865077",
                    projectId: "memo-notifications",
                    appId: "1:104025865077:web:68fd2247f8c95b9670713c"
                };

                // Initialize Firebase
                log('Initializing Firebase...');
                const app = initializeApp(firebaseConfig);

                // Initialize Firebase Messaging
                log('Initializing Firebase Messaging...');
                const messaging = getMessaging(app);

                // Try to get a token
                log('Requesting FCM token...');
                try {
                    const FIREBASE_VAPID_KEY = "BGZrqo2reX29cRLUfpir0-hsHGqA0zEeNcHbggbeVcaVg2tvdfTw55bKZQpdRsDSe3hvwvivmMViIRvKCzA7k3o";

                    const currentToken = await getToken(messaging, {
                        vapidKey: FIREBASE_VAPID_KEY
                    });

                    if (currentToken) {
                        log(`Token obtained: ${currentToken.substring(0, 15)}...`);

                        // Try to send a test notification
                        log('Sending test FCM notification...');

                        router.post('/fcm/test-notification', {
                            token: currentToken
                        }, {
                            preserveScroll: true,
                            onSuccess: (page) => {
                                if (page.props.testResult) {
                                    log('Test notification sent successfully: ' + JSON.stringify(page.props.testResult));
                                } else {
                                    log('Test notification sent successfully, but no result data returned');
                                }
                            },
                            onError: (errors) => {
                                log('Failed to send test notification: ' + JSON.stringify(errors));
                            }
                        });
                    } else {
                        log('Failed to get FCM token');
                    }
                } catch (tokenError) {
                    log(`Error getting token: ${tokenError.message}`);

                    // Check if this is a permission error
                    if (tokenError.message.includes('permission')) {
                        log('This appears to be a permission issue. Make sure notifications are allowed.');
                    }

                    // Check if this is a service worker error
                    if (tokenError.message.includes('service') && tokenError.message.includes('worker')) {
                        log('This appears to be a service worker issue. Check if service worker registration is working properly.');
                    }
                }
            } catch (firebaseError) {
                log(`Error initializing Firebase: ${firebaseError.message}`);
            }
        } catch (error) {
            log(`Error in Firebase test: ${error.message}`);
        }
    };

    return (
        <>
            <Head title="Notification Test" />

            <div className="p-6 max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">Notification Diagnostics</h1>

                <div className="flex gap-4 mb-6">
                    <button
                        onClick={runTests}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Run Tests Again
                    </button>

                    <button
                        onClick={requestPermissionManually}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                        Request Permission
                    </button>

                    <button
                        onClick={sendTestNotification}
                        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                        disabled={permission !== 'granted'}
                    >
                        Send Test Notification
                    </button>

                    <button
                        onClick={checkVapidKey}
                        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                        Check VAPID Key
                    </button>

                    <button
                        onClick={testFirebaseMessaging}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        disabled={permission !== 'granted'}
                    >
                        Test Firebase Messaging
                    </button>
                </div>

                <div className="mb-4">
                    <h2 className="text-lg font-semibold mb-2">Current Permission Status:</h2>
                    <div className={`px-3 py-2 rounded ${
                        permission === 'granted' ? 'bg-green-100 text-green-800' :
                        permission === 'denied' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                    }`}>
                        {permission || 'unknown'}
                    </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
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
