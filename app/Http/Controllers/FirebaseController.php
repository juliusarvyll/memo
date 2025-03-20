<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\WebPushConfig;
use Kreait\Firebase\Messaging\WebPushNotification;

class FirebaseController extends Controller
{
    /**
     * Register a FCM token for the authenticated user
     */
    public function registerToken(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
        ]);

        // Save the token to the user's record
        $user = $request->user();
        $user->fcm_token = $request->token;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'FCM token registered successfully'
        ]);
    }

    /**
     * Unregister a FCM token
     */
    public function unregisterToken(Request $request)
    {
        $user = $request->user();
        $user->fcm_token = null;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'FCM token unregistered successfully'
        ]);
    }

    /**
     * Send a test notification to the user
     */
    public function sendTestNotification(Request $request)
    {
        try {
            $token = $request->input('token');

            if (!$token) {
                return response()->json([
                    'success' => false,
                    'message' => 'No FCM token provided'
                ], 400);
            }

            // Get the Firebase Messaging instance
            $messaging = app('firebase.messaging');

            // Create web push notification config
            $webPushConfig = WebPushConfig::fromArray([
                'notification' => [
                    'title' => 'Test Notification',
                    'body' => 'This is a test notification from SPUP eMemo',
                    'icon' => '/images/logo.png',
                    'click_action' => url('/'),
                    'badge' => '/images/badge.png',
                ]
            ]);

            // Create a message targeting the provided token
            $message = CloudMessage::withTarget('token', $token)
                ->withWebPushConfig($webPushConfig)
                ->withAndroidConfig([
                    'notification' => [
                        'title' => 'Test Notification',
                        'body' => 'This is a test notification from SPUP eMemo',
                        'icon' => '/images/logo.png',
                        'click_action' => url('/')
                    ],
                    'fcm_options' => [
                        'analytics_label' => 'test_notification'
                    ]
                ])
                ->withApnsConfig([
                    'headers' => [
                        'apns-priority' => '10',
                        'apns-collapse-id' => 'test-notification',
                    ],
                    'payload' => [
                        'aps' => [
                            'alert' => [
                                'title' => 'Test Notification',
                                'body' => 'This is a test notification from SPUP eMemo'
                            ],
                            'sound' => 'default',
                            'badge' => 1
                        ]
                    ],
                    'fcm_options' => [
                        'analytics_label' => 'test_notification'
                    ]
                ]);

            // Send the message and capture the result
            $result = $messaging->send($message);

            // Log the result
            \Illuminate\Support\Facades\Log::info('FCM test notification sent', [
                'message_id' => $result,
                'token' => substr($token, 0, 10) . '...',
                'user_id' => $request->user()->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Test notification sent successfully',
                'message_id' => $result
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send test notification', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send notification: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate a FCM token
     */
    public function validateToken(Request $request)
    {
        try {
            $token = $request->input('token');

            if (!$token) {
                return response()->json([
                    'success' => false,
                    'message' => 'No token provided'
                ], 400);
            }

            // Try to use the token with Firebase - this will throw an exception if invalid
            $messaging = app('firebase.messaging');

            // We can't directly validate a token, but we can check if it's formatted correctly
            if (preg_match('/^[a-zA-Z0-9:_-]{150,300}$/', $token)) {
                return response()->json([
                    'success' => true,
                    'message' => 'Token appears to be valid'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Token format is invalid'
                ]);
            }
        } catch (\Exception $e) {
            report($e);
            return response()->json([
                'success' => false,
                'message' => 'Token validation failed: ' . $e->getMessage()
            ], 500);
        }
    }
}
