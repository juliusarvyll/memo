import { Head, Link, usePage, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, UserIcon, BellIcon, PowerIcon, HomeIcon, FolderIcon, BookmarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow, format } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import {
  app,
  messaging,
  getToken,
  onMessage,
  getTokenWithLogging,
  initializeMessaging,
} from '@/firebase-init';
import { notificationsSupported, requestPermission, permissionGranted, showNotification } from '@/fallback-notifications';

// Use the Web Push VAPID key (not the Firebase key)
const FIREBASE_VAPID_KEY = "BGZrqo2reX29cRLUfpir0-hsHGqA0zEeNcHbggbeVcaVg2tvdfTw55bKZQpdRsDSe3hvwvivmMViIRvKCzA7k3o";

export default function Dashboard({ memos, canLogin, canRegister }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const [selectedMemo, setSelectedMemo] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [avatarSrc, setAvatarSrc] = useState(null);
    const [isZooming, setIsZooming] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [hasNewMemos, setHasNewMemos] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const imageContainerRef = useRef(null);
    const zoomImageRef = useRef(null);
    const [isUserActive, setIsUserActive] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(60000); // 60 seconds
    const refreshTimerRef = useRef(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [showBottomNav, setShowBottomNav] = useState(true);
    const [lastScrollPosition, setLastScrollPosition] = useState(0);
    const pullToRefreshRef = useRef(null);
    const startY = useRef(0);
    const currentY = useRef(0);
    const refreshDistance = 80; // Distance in pixels to pull down to trigger refresh
    const isPulling = useRef(false);
    const [fcmSupported, setFcmSupported] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [sendingTestNotification, setSendingTestNotification] = useState(false);
    const [notificationError, setNotificationError] = useState(null);

    // Add viewport width tracking for responsive layout
    const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
    const isMobile = viewportWidth < 640; // sm breakpoint in Tailwind

    // Updated service worker registration with better error handling
    const registerServiceWorker = async () => {
        try {
            console.log('[SW] Attempting to register service worker...');
            if ('serviceWorker' in navigator) {
                // First unregister existing service workers to avoid conflicts
                const existingRegistrations = await navigator.serviceWorker.getRegistrations();
                for (let reg of existingRegistrations) {
                    if (reg.scope.includes('firebase-messaging-sw.js')) {
                        console.log('[SW] Unregistering existing service worker:', reg.scope);
                        await reg.unregister();
                    }
                }

                // Now register a fresh service worker
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                    scope: '/'
                });
                console.log('[SW] Service worker registered successfully:', registration.scope);

                // Wait for the service worker to be activated
                if (registration.installing) {
                    console.log('[SW] Service worker installing...');
                    const serviceWorker = registration.installing;

                    // Listen for state changes
                    serviceWorker.addEventListener('statechange', function() {
                        console.log('[SW] Service worker state changed to:', serviceWorker.state);
                    });
                }

                return registration;
            } else {
                console.error('[SW] Service workers not supported in this browser');
                return null;
            }
        } catch (error) {
            console.error('[SW] Error registering service worker:', error.message);
            return null;
        }
    };

    // Now modify your checkFCMSupport function to include this registration
    const checkFCMSupport = async () => {
        try {
            // Check if the browser supports notifications
            if (!('Notification' in window)) {
                console.log('This browser does not support notifications');
                setNotificationError('This browser does not support notifications');
                return;
            }

            // Check if service workers are supported and register
            const swRegistration = await registerServiceWorker();
            if (!swRegistration) {
                setNotificationError('Service worker registration failed');
                return;
            }

            // Check if the page is served over HTTPS or localhost
            if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                console.log('Firebase Messaging requires HTTPS');
                setNotificationError('Push notifications require HTTPS');
                return;
            }

            // Try to initialize Firebase Messaging
            const isMessagingInitialized = await initializeMessaging();

            if (!isMessagingInitialized) {
                console.log('Failed to initialize Firebase Messaging');
                setNotificationError('Push notifications not available in this browser');
                return;
            }

            setFcmSupported(true);

            // Check current permission status
            if (Notification.permission === 'granted') {
                setNotificationsEnabled(true);

                // Set up message handler for foreground messages
                const unsubscribe = onMessage(messaging, (payload) => {
                    console.log('Message received in foreground:', payload);

                    // Register a notification using the Notification API
                    if ('Notification' in window && Notification.permission === 'granted') {
                        const notification = new Notification(
                            payload.notification.title,
                            {
                                body: payload.notification.body,
                                icon: '/images/logo.png'
                            }
                        );
                        notification.onclick = () => {
                            window.focus();
                            notification.close();
                        };
                    }

                    // Still refresh memos to show new content
                    refreshMemos();
                });

                return () => {
                    if (unsubscribe) unsubscribe();
                };
            }
        } catch (error) {
            console.error('Error checking FCM support:', error);
            setNotificationError('Error initializing notifications: ' + error.message);
        }
    };

    // Check for Firebase Messaging support
    useEffect(() => {
        checkFCMSupport();
    }, []);

    // Function to enable FCM notifications
    const enableNotifications = async () => {
        try {
            // If FCM isn't supported, don't proceed
            if (!fcmSupported) {
                console.log('FCM not supported');
                return;
            }

            // Use the requestNotificationPermission function
            const permissionGranted = await requestNotificationPermission();

            if (!permissionGranted) {
                return;
            }

            // Try to initialize messaging if it hasn't been
            if (!messaging) {
                const isMessagingInitialized = await initializeMessaging();
                if (!isMessagingInitialized) {
                    console.error('Failed to initialize messaging');
                    return;
                }
            }

            const currentToken = await getToken(messaging, {
                vapidKey: FIREBASE_VAPID_KEY
            });

            if (currentToken) {
                await fetch('/api/fcm/register-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: currentToken,
                        user_id: user?.id
                    }),
                });

                setNotificationsEnabled(true);
                console.log('FCM notifications enabled');
            } else {
                console.error('Could not generate FCM token');
            }
        } catch (error) {
            console.error('Error enabling notifications:', error);
        }
    };

    // Function to disable FCM notifications
    const disableNotifications = async () => {
        try {
            // If FCM isn't supported or messaging isn't initialized, just update UI
            if (!fcmSupported || !messaging) {
                setNotificationsEnabled(false);
                return;
            }

            const currentToken = await getToken(messaging);

            if (currentToken) {
                await fetch('/api/fcm/unregister-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: currentToken,
                        user_id: user?.id
                    }),
                });
            }

            setNotificationsEnabled(false);
            console.log('FCM notifications disabled');
        } catch (error) {
            console.error('Error disabling notifications:', error);
        }
    };

    // Function to update viewport width on resize
    useEffect(() => {
        const handleResize = () => {
            setViewportWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Function to refresh memos in the background
    const refreshMemos = () => {
        console.log('🔄 Refreshing memos...');
        setIsRefreshing(true);

        router.reload({
            only: ['memos'],
            onSuccess: (page) => {
                console.log('✅ Memos refreshed successfully', new Date().toLocaleTimeString());
                setIsRefreshing(false);
                setLastUpdated(new Date());

                // Compare old and new memos to detect changes
                const newMemos = page.props.memos;
                const oldMemoIds = new Set(memos.map(memo => memo.id));
                const hasNewContent = newMemos.some(memo => !oldMemoIds.has(memo.id));

                setHasNewMemos(hasNewContent);
                if (hasNewContent) {
                    console.log('🔔 New memos detected!');

                    // Show notification for new memos
                    showNewMemosNotification(newMemos.filter(memo => !oldMemoIds.has(memo.id)));
                }
            },
            onError: (errors) => {
                console.error('❌ Error refreshing memos:', errors);
                setIsRefreshing(false);
            },
            preserveScroll: true,
        });
    };

    // Function to show notification when new memos are detected
    const showNewMemosNotification = (newMemos) => {
        if (!("Notification" in window) || Notification.permission !== "granted") {
            return;
        }

        // Get the number of new memos
        const newMemoCount = newMemos.length;

        // Get the title of the first new memo
        const firstMemoTitle = newMemos[0]?.title || "New memo";

        // Create notification title and body
        const title = `New SPUP eMemo Update${newMemoCount > 1 ? 's' : ''}`;
        let body = `${firstMemoTitle}`;

        if (newMemoCount > 1) {
            body += ` and ${newMemoCount - 1} more update${newMemoCount > 2 ? 's' : ''}`;
        }

        // Create and display the notification
        const notification = new Notification(title, {
            body: body,
            icon: "/images/logo.png",
            badge: "/images/logo.png",
            vibrate: [200, 100, 200],
            tag: "new-memos-notification",
            renotify: true
        });

        // Handle notification click
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    };

    // Define startRefreshTimer before it's used in useEffect
    const startRefreshTimer = () => {
        console.log('⏱️ Starting refresh timer with interval:', refreshInterval, 'ms');
        clearTimeout(refreshTimerRef.current);

        refreshTimerRef.current = setTimeout(() => {
            console.log('⏰ Timer fired, refreshing memos...');
            refreshMemos();

            // If user is inactive, increase the interval (up to 5 minutes)
            if (!isUserActive && refreshInterval < 300000) {
                const newInterval = Math.min(refreshInterval * 1.5, 300000);
                console.log(`🔄 User inactive, increasing refresh interval: ${refreshInterval}ms -> ${newInterval}ms`);
                setRefreshInterval(prev => Math.min(prev * 1.5, 300000));
            }

            startRefreshTimer(); // Schedule next refresh
        }, refreshInterval);
    };

    // Track user activity
    useEffect(() => {
        console.log('🏁 Dashboard component mounted');

        // Request notification permission on component mount
        requestNotificationPermission();

        const handleActivity = () => {
            if (!isUserActive) {
                console.log('👆 User activity detected, resetting refresh interval to 60000ms');
                setIsUserActive(true);
                setRefreshInterval(60000); // Reset to normal interval when user is active
            }
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);

        return () => {
            console.log('🛑 Dashboard component unmounting, cleaning up event listeners');
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
        };
    }, []);

    // Set up dynamic background refresh
    useEffect(() => {
        console.log('🔄 Refresh settings changed. Current interval:', refreshInterval, 'ms, User active:', isUserActive);
        startRefreshTimer();

        return () => {
            console.log('🛑 Clearing previous refresh timer');
            clearTimeout(refreshTimerRef.current);
        };
    }, [refreshInterval, isUserActive]);

    // Add visibility change handler
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                console.log('👀 Page hidden, pausing refresh timer');
                // Page is hidden, clear the interval
                clearTimeout(refreshTimerRef.current);
            } else {
                console.log('👁️ Page visible again, refreshing immediately');
                // Page is visible again, refresh immediately and restart the interval
                refreshMemos();
                startRefreshTimer();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Set up avatar source with error handling
    useEffect(() => {
        if (user && user.avatar) {
            setAvatarSrc(`/storage/${user.avatar}`);
        }
    }, [user]);

    // Handle avatar loading error
    const handleAvatarError = () => {
        console.log("Avatar failed to load");
        setAvatarSrc(null);
    };

    const openMemoDialog = (memo) => {
        setSelectedMemo(memo);
        setDialogOpen(true);
    };

    const openImageModal = (e) => {
        e.stopPropagation();
        setImageModalOpen(true);
    };

    const handleImageMouseMove = (e) => {
        if (!imageContainerRef.current || !zoomImageRef.current) return;

        const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();

        // Calculate position in percentage (0 to 100)
        const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));

        // Set transform origin based on mouse position
        zoomImageRef.current.style.transformOrigin = `${x}% ${y}%`;
        setIsZooming(true);
    };

    const handleImageMouseLeave = () => {
        setIsZooming(false);
    };

    // PWA install prompt handler
    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            // Prevent the default prompt
            e.preventDefault();
            // Save the event to trigger it later
            setDeferredPrompt(e);
            // Show the install button
            setIsInstallable(true);
            console.log('📱 App is installable as PWA');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check online status
        window.addEventListener('online', () => setIsOffline(false));
        window.addEventListener('offline', () => setIsOffline(true));

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('online', () => setIsOffline(false));
            window.removeEventListener('offline', () => setIsOffline(true));
        };
    }, []);

    // Install the app
    const installApp = async () => {
        if (!deferredPrompt) return;

        try {
            // Show the install prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);

            // Clear the deferred prompt variable
            setDeferredPrompt(null);
            setIsInstallable(false);
        } catch (error) {
            console.error('Error installing app:', error);
        }
    };

    // Handle scroll to hide/show bottom nav
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollPos = window.scrollY;
            const isScrollingDown = currentScrollPos > lastScrollPosition;

            // Only hide when scrolling down and we're past a threshold
            if (isScrollingDown && currentScrollPos > 100) {
                setShowBottomNav(false);
            } else {
                setShowBottomNav(true);
            }

            setLastScrollPosition(currentScrollPos);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollPosition]);

    // Pull to refresh functionality
    useEffect(() => {
        if (!pullToRefreshRef.current) return;

        const touchStartHandler = (e) => {
            // Only enable pull to refresh at the top of the page
            if (window.scrollY > 5) return;

            startY.current = e.touches[0].clientY;
            isPulling.current = true;
        };

        const touchMoveHandler = (e) => {
            if (!isPulling.current) return;

            currentY.current = e.touches[0].clientY;
            const pullDistance = currentY.current - startY.current;

            // Only handle pull down gestures
            if (pullDistance <= 0) {
                isPulling.current = false;
                return;
            }

            // Create pull effect with resistive feeling (gets harder to pull)
            const pullOffset = Math.min(pullDistance * 0.5, refreshDistance);

            // Update UI to show pull effect
            pullToRefreshRef.current.style.transform = `translateY(${pullOffset}px)`;
            pullToRefreshRef.current.style.opacity = Math.min(pullOffset / refreshDistance, 1);

            // Prevent default scroll behavior when pulling
            if (pullDistance > 5) {
                e.preventDefault();
            }
        };

        const touchEndHandler = () => {
            if (!isPulling.current) return;

            const pullDistance = currentY.current - startY.current;

            // Reset pull state
            isPulling.current = false;

            // Animate back to original position
            pullToRefreshRef.current.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            pullToRefreshRef.current.style.transform = 'translateY(0)';
            pullToRefreshRef.current.style.opacity = '0';

            // If pulled far enough, trigger refresh
            if (pullDistance > refreshDistance) {
                console.log('🔄 Pull-to-refresh triggered');
                refreshMemos();
            }

            // Reset transition after animation completes
            setTimeout(() => {
                if (pullToRefreshRef.current) {
                    pullToRefreshRef.current.style.transition = '';
                }
            }, 300);
        };

        const element = pullToRefreshRef.current;
        element.addEventListener('touchstart', touchStartHandler, { passive: false });
        element.addEventListener('touchmove', touchMoveHandler, { passive: false });
        element.addEventListener('touchend', touchEndHandler);

        return () => {
            element.removeEventListener('touchstart', touchStartHandler);
            element.removeEventListener('touchmove', touchMoveHandler);
            element.removeEventListener('touchend', touchEndHandler);
        };
    }, []);

    // Function to send a test notification
    const sendTestNotification = async () => {
        setSendingTestNotification(true);

        try {
            // First try using FCM
            if (fcmSupported && messaging) {
                try {
                    console.log('Attempting to use FCM for test notification...');

                    // Log VAPID key format for debugging (only first few chars)
                    console.log('Using VAPID key:', FIREBASE_VAPID_KEY.substring(0, 10) + '...');

                    // Use getToken directly instead of getTokenWithLogging
                    const currentToken = await getTokenWithLogging(messaging, {
                        vapidKey: FIREBASE_VAPID_KEY
                    });

                    if (!currentToken) {
                        throw new Error('Could not retrieve FCM token');
                    }

                    // Send to server
                    const response = await fetch('/api/fcm/test-notification', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: currentToken, user_id: user?.id }),
                    });

                    if (!response.ok) {
                        throw new Error(`Server responded with ${response.status}`);
                    }

                    console.log('FCM test notification sent successfully');
                    return;
                } catch (error) {
                    console.error('FCM notification failed, trying fallback:', error);
                    // Continue to fallback
                }
            }

            // Fallback to simple notifications if FCM failed
            if (notificationsSupported()) {
                if (!permissionGranted()) {
                    const granted = await requestPermission();
                    if (!granted) {
                        throw new Error('Notification permission denied');
                    }
                }

                // Show a local notification
                const success = showNotification(
                    'SPUP eMemo Test Notification',
                    {
                        body: 'This is a test notification from SPUP eMemo (Fallback).',
                        tag: 'test-notification'
                    }
                );

                if (success) {
                    console.log('Fallback notification shown successfully');
                } else {
                    throw new Error('Failed to show fallback notification');
                }
            } else {
                throw new Error('Notifications not supported in this browser');
            }
        } catch (error) {
            console.error('Error sending test notification:', error);
            setNotificationError(error.message);
        } finally {
            setSendingTestNotification(false);
        }
    };

    // Render notification buttons conditionally based on support
    const renderNotificationButtons = () => {
        if (notificationError) {
            // Display error message if FCM is not supported
            return (
                <div className="text-sm text-gray-500">
                    {notificationError}
                </div>
            );
        }

        if (!fcmSupported) {
            return null;
        }

        return (
            <div className="flex items-center gap-2">
                <Button
                    variant={notificationsEnabled ? "outline" : "default"}
                    size="sm"
                    onClick={notificationsEnabled ? disableNotifications : enableNotifications}
                    className="flex items-center gap-2"
                >
                    <BellIcon className="h-4 w-4" />
                    {notificationsEnabled ? "Notifications On" : "Enable Notifications"}
                </Button>

                {notificationsEnabled && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={sendTestNotification}
                        disabled={sendingTestNotification}
                        className="flex items-center gap-2"
                    >
                        {sendingTestNotification ? (
                            <>
                                <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Sending...
                            </>
                        ) : (
                            <>
                                <span className="text-sm">Test Notification</span>
                            </>
                        )}
                    </Button>
                )}
            </div>
        );
    };

    // Add this missing function
    const requestNotificationPermission = async () => {
        try {
            // If FCM isn't supported, don't proceed
            if (!fcmSupported) {
                console.log('FCM not supported');
                return false;
            }

            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                console.log('Notification permission denied');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    };

    // Add this new useEffect
    useEffect(() => {
        // Unregister any Firebase Hosting service workers
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(registration => {
                    // Keep only our firebase-messaging-sw.js service worker
                    if (registration.scope.includes('firebase-cloud-messaging') ||
                        (registration.scope.includes('firebase') &&
                         !registration.scope.includes('firebase-messaging-sw.js'))) {
                        console.log('[CLEANUP] Unregistering Firebase service worker:', registration.scope);
                        registration.unregister().then(() => {
                            console.log('[CLEANUP] Successfully unregistered Firebase service worker');
                        });
                    }
                });
            }).catch(error => {
                console.error('[CLEANUP] Error unregistering service workers:', error);
            });
        }
    }, []);

    // Add this function
    const runFcmDiagnostics = async () => {
        console.log('========= FCM DIAGNOSTICS =========');

        // Check basic requirements
        console.log('Notification API supported:', 'Notification' in window);
        console.log('ServiceWorker API supported:', 'serviceWorker' in navigator);
        console.log('Current permission:', Notification.permission);
        console.log('Using HTTPS:', window.location.protocol === 'https:');

        // Check service worker registration
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            console.log('Service worker registrations:', registrations.length);
            registrations.forEach(reg => {
                console.log('- Registration scope:', reg.scope);
                console.log('- Registration state:', reg.active ? 'active' : 'inactive');
            });
        } catch (error) {
            console.error('Error checking service worker registrations:', error);
        }

        // Check Firebase initialization
        console.log('Firebase app initialized:', !!app);
        console.log('Firebase messaging initialized:', !!messaging);

        // Try to get Firebase token
        if (messaging) {
            try {
                const token = await getToken(messaging, { vapidKey: "BGZrqo2reX29cRLUfpir0-hsHGqA0zEeNcHbggbeVcaVg2tvdfTw55bKZQpdRsDSe3hvwvivmMViIRvKCzA7k3o"});
                console.log('FCM token obtained:', token ? 'Yes (first 10 chars: ' + token.substring(0, 10) + '...)' : 'No');
            } catch (error) {
                console.error('Error getting token:', error);
            }
        }

        console.log('================================');
    };

    // Call this function from a useEffect
    useEffect(() => {
        // Run the diagnostics after a short delay to allow other initializations
        setTimeout(runFcmDiagnostics, 3000);
    }, []);

    // Define getTokenWithLogging locally if it's not available from imports
    const getTokenWithLogging = async (messagingInstance, options) => {
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

    return (
        <>
            <Head title="SPUP eMemo" />
            <div className="flex flex-col min-h-screen bg-gray-50">
                {/* Offline indicator */}
                {isOffline && (
                    <div className="bg-amber-500 text-white text-sm p-2 text-center">
                        You are currently offline. Some content may not be available.
                    </div>
                )}

                {/* Header */}
                <header className="sticky top-0 z-20 bg-white shadow">
                    <div className="container mx-auto max-w-6xl px-4 py-3 flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <img src="/images/logo.png" alt="Logo" className="h-8 w-8" />
                            <Link href="/" className="text-primary font-bold text-xl">
                                SPUP eMemo
                            </Link>
                        </div>

                        {/* Add notification buttons in header for desktop */}
                        {!isMobile && renderNotificationButtons()}
                    </div>
                </header>

                <div className="flex-1 container mx-auto max-w-6xl px-2 pb-2">
                    {/* Main content */}
                    <div className="py-4 relative">
                        <ScrollArea className="h-[calc(100vh-220px)]">
                        {/* Memo grid or list depending on viewport */}
                        {memos && memos.length > 0 ? (
                            <div className={isMobile
                                ? "space-y-4 pb-5" // List layout for mobile
                                : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20" // Grid layout for desktop
                            }>
                                {memos.map((memo) => (
                                    isMobile ? (
                                        <MemoListItem
                                            key={memo.id}
                                            memo={memo}
                                            onClick={() => openMemoDialog(memo)}
                                        />
                                    ) : (
                                        <MemoCard
                                            key={memo.id}
                                            memo={memo}
                                            onClick={() => openMemoDialog(memo)}
                                        />
                                    )
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-muted-foreground">No memos found.</p>
                            </div>
                        )}
                        </ScrollArea>
                    </div>
                </div>

                {/* Mobile bottom navigation */}
                <div className={`fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-30 transition-transform duration-300 ${showBottomNav ? 'translate-y-0' : 'translate-y-full'}`}>
                    <div className="grid grid-cols-3 py-2">
                        <button className="flex flex-col items-center justify-center px-3 py-1 active:bg-gray-100 rounded-md">
                            <HomeIcon className="h-6 w-6 text-primary" />
                            <span className="text-xs mt-1">Home</span>
                        </button>

                        {/* Only show notification buttons if supported */}
                        {fcmSupported && (
                            <button
                                className="flex flex-col items-center justify-center px-3 py-1 active:bg-gray-100 rounded-md"
                                onClick={notificationsEnabled ? disableNotifications : enableNotifications}
                            >
                                <BellIcon className={`h-6 w-6 ${notificationsEnabled ? 'text-primary' : 'text-gray-600'}`} />
                                <span className="text-xs mt-1">{notificationsEnabled ? 'Notifications On' : 'Enable Notifications'}</span>
                            </button>
                        )}

                        {/* Test notification button */}
                        {fcmSupported && notificationsEnabled && (
                            <button
                                className="flex flex-col items-center justify-center px-3 py-1 active:bg-gray-100 rounded-md"
                                onClick={sendTestNotification}
                                disabled={sendingTestNotification}
                            >
                                {sendingTestNotification ? (
                                    <>
                                        <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span className="text-xs mt-1">Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="h-6 w-6 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        <span className="text-xs mt-1">Test</span>
                                    </>
                                )}
                            </button>
                        )}

                        {/* If notifications aren't supported, show info button instead */}
                        {!fcmSupported && notificationError && (
                            <button className="flex flex-col items-center justify-center px-3 py-1 active:bg-gray-100 rounded-md">
                                <svg className="h-6 w-6 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs mt-1">Not Available</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Simplified footer for mobile */}
                <footer className="bg-white border-t py-3 text-center text-xs text-muted-foreground">
                    © {new Date().getFullYear()} SPUP Memo
                </footer>
            </div>

            {/* Mobile-optimized dialog for memo details */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-auto p-0 mx-2 rounded-lg">
                    {selectedMemo && (
                        <div className="flex flex-col h-full">
                            {/* Close button positioned absolutely for better mobile UX */}
                            <button
                                onClick={() => setDialogOpen(false)}
                                className="absolute right-2 top-2 z-50 bg-black/50 text-white rounded-full p-1"
                                aria-label="Close"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>

                            {/* Image Container - Takes full width on mobile */}
                            {selectedMemo.image ? (
                                <div className="w-full bg-black flex items-center justify-center p-0">
                                    <div
                                        className="relative w-full cursor-zoom-in overflow-hidden"
                                        onClick={openImageModal}
                                    >
                                        <img
                                            src={`/storage/${selectedMemo.image}`}
                                            alt={selectedMemo.title}
                                            className="w-full h-auto object-contain max-h-[40vh]"
                                        />
                                    </div>
                                </div>
                            ) : null}

                            {/* Content Container */}
                            <div className="p-4 overflow-y-auto flex flex-col">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold mt-2">{selectedMemo.title}</DialogTitle>
                                    <DialogDescription>
                                        <div className="flex items-center mt-4">
                                            {selectedMemo.author.avatar ? (
                                                <img
                                                    src={`/storage/${selectedMemo.author.avatar}`}
                                                    alt={selectedMemo.author.name}
                                                    className="w-10 h-10 rounded-full mr-3 object-cover"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                                    <UserIcon className="h-5 w-5 text-gray-600" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium">{selectedMemo.author.name}</p>
                                                {(selectedMemo.author.position || selectedMemo.author.department) && (
                                                    <p className="text-sm text-muted-foreground">
                                                        {[selectedMemo.author.position, selectedMemo.author.department].filter(Boolean).join(' • ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </DialogDescription>
                                </DialogHeader>

                                {/* Content with improved mobile touch scrolling */}
                                <div className="mt-4 flex-1 overflow-y-auto -mx-4 px-4">
                                    <div className="prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: selectedMemo.content }}>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-6 pt-4 border-t text-xs">
                                    <div className="text-muted-foreground">
                                        ID: {selectedMemo.id}
                                    </div>
                                    <div className="text-muted-foreground">
                                        Posted: {format(new Date(selectedMemo.created_at), 'PPP')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Fullscreen image modal for mobile */}
            {selectedMemo && selectedMemo.image && (
                <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
                    <DialogContent className="max-w-full max-h-screen p-0 m-0 bg-black rounded-none flex items-center justify-center">
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img
                                src={`/storage/${selectedMemo.image}`}
                                alt={selectedMemo.title}
                                className="max-w-full max-h-screen object-contain"
                            />
                            <button
                                onClick={() => setImageModalOpen(false)}
                                className="absolute right-4 top-4 bg-black/50 text-white rounded-full p-2"
                                aria-label="Close"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Add this somewhere visible in your UI */}
            {isInstallable && (
                <button
                    onClick={installApp}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Install App
                </button>
            )}
        </>
    );
}

// Mobile-optimized list item component without category
function MemoListItem({ memo, onClick }) {
    const publishedDate = memo.published_at ? new Date(memo.published_at) : null;
    const author = memo.author || { name: 'Unknown' };
    const [authorAvatarSrc, setAuthorAvatarSrc] = useState(author.avatar ? `/storage/${author.avatar}` : null);
    const [imageError, setImageError] = useState(false);

    // Handle author avatar error
    const handleAuthorAvatarError = () => {
        setAuthorAvatarSrc(null);
    };

    return (
        <div
            className="bg-white border rounded-md overflow-hidden active:bg-gray-50 transition-colors touch-manipulation"
            onClick={onClick}
        >
            <div className="flex items-start p-3">
                {/* Left side - optional image */}
                <div className="shrink-0 w-16 h-16 mr-3 bg-gray-100 rounded-md overflow-hidden">
                    {memo.image && !imageError ? (
                        <img
                            src={`/storage/${memo.image}`}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <PhotoIcon className="h-7 w-7" />
                        </div>
                    )}
                </div>

                {/* Right side - memo details */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-end items-center mb-1">
                        {publishedDate && (
                            <span className="text-xs text-gray-500">
                                {formatDistanceToNow(publishedDate, { addSuffix: true })}
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h3 className="font-medium text-sm line-clamp-2 mb-1">
                        {memo.title}
                    </h3>

                    {/* Author info */}
                    <div className="flex items-center text-xs text-gray-500">
                        {authorAvatarSrc ? (
                            <img
                                src={authorAvatarSrc}
                                alt=""
                                className="w-4 h-4 rounded-full mr-1 object-cover"
                                onError={handleAuthorAvatarError}
                            />
                        ) : (
                            <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center mr-1">
                                <span className="text-[8px] font-bold text-gray-500">
                                    {author.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                        <span className="truncate">{author.name}</span>
                    </div>

                    {/* Content preview */}
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {memo.content ? memo.content.replace(/<[^>]*>?/gm, '') : ''}
                    </p>
                </div>
            </div>
        </div>
    );
}

// Desktop card component without category
function MemoCard({ memo, onClick }) {
    const publishedDate = memo.published_at ? new Date(memo.published_at) : null;
    const author = memo.author || { name: 'Unknown' };
    const [authorAvatarSrc, setAuthorAvatarSrc] = useState(author.avatar ? `/storage/${author.avatar}` : null);
    const [imageError, setImageError] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const cardRef = useRef(null);
    const cardImageRef = useRef(null);
    const rafRef = useRef(null);

    // Handle author avatar error
    const handleAuthorAvatarError = () => {
        setAuthorAvatarSrc(null);
    };

    // Handle memo image error
    const handleMemoImageError = () => {
        setImageError(true);
    };

    // Track mouse position for zoom effect
    const handleMouseMove = (e) => {
        if (!cardRef.current || !cardImageRef.current) return;

        // Cancel any pending animation frame
        if (rafRef.current) {
            window.cancelAnimationFrame(rafRef.current);
        }

        // Use requestAnimationFrame for better performance
        rafRef.current = window.requestAnimationFrame(() => {
            const { left, top, width, height } = cardRef.current.getBoundingClientRect();

            // Calculate position in percentage (0 to 100)
            const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
            const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));

            // Update the transform origin directly on the element
            if (cardImageRef.current) {
                cardImageRef.current.style.transformOrigin = `${x}% ${y}%`;
            }
        });
    };

    // Clean up requestAnimationFrame on unmount
    useEffect(() => {
        return () => {
            if (rafRef.current) {
                window.cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    return (
        <Card
            ref={cardRef}
            className="h-full group relative cursor-pointer overflow-hidden active:opacity-90 touch-manipulation"
            onClick={onClick}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onMouseMove={handleMouseMove}
        >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>

            {/* Image as background - full width/height */}
            {memo.image && !imageError ? (
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                    <img
                        ref={cardImageRef}
                        src={`/storage/${memo.image}`}
                        alt={memo.title}
                        className={`w-full h-full object-cover transition-transform duration-200 ${isHovering ? 'scale-[2]' : 'scale-100'}`}
                        onError={handleMemoImageError}
                    />
                </div>
            ) : (
                <div className="absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center">
                    <div className="text-gray-400 text-3xl">M</div>
                </div>
            )}

            {/* Content overlay - shown on hover */}
            <div className="absolute inset-0 z-20 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="text-white space-y-2">
                    <div className="flex justify-between items-start">
                        {memo.is_published && (
                            <div className="text-sm text-white/80 flex items-center">
                                <CalendarIcon className="h-3 w-3 mr-1" />
                                {publishedDate ? formatDistanceToNow(publishedDate, { addSuffix: true }) : 'Not published'}
                            </div>
                        )}
                    </div>

                    <h3 className="font-bold text-lg line-clamp-2">{memo.title}</h3>

                    <div className="flex items-center mt-2">
                        {authorAvatarSrc ? (
                            <img
                                src={authorAvatarSrc}
                                alt={author.name}
                                className="w-8 h-8 rounded-full mr-2 object-cover border border-white/30"
                                onError={handleAuthorAvatarError}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mr-2 border border-white/30">
                                <span className="text-xs font-bold text-white">
                                    {author.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                        <div className="text-white/90 text-sm font-medium">
                            {author.name}
                        </div>
                    </div>

                    <div className="text-sm text-white/80 line-clamp-3 overflow-hidden">
                        {memo.content ? memo.content.replace(/<[^>]*>?/gm, '') : ''}
                    </div>

                    <div className="flex justify-between items-center pt-2 text-xs text-white/70">
                        <div>ID: {memo.id}</div>
                        <Badge variant={memo.is_published ? "success" : "secondary"} className="bg-white/20 hover:bg-white/30 text-white">
                            {memo.is_published ? 'Published' : 'Draft'}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Provide minimum height for the card */}
            <div className="w-full h-80 sm:h-96"></div>

            {/* Add a touch ripple effect */}
            <div className="absolute inset-0 bg-black/5 opacity-0 active:opacity-100 transition-opacity duration-200"></div>
        </Card>
    );
}
