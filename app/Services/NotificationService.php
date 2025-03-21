<?php

namespace App\Services;

use App\Models\User;
use App\Models\Memo;
use App\Models\NotificationLog;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\WebPushConfig;
use Kreait\Firebase\Messaging\WebPushNotification;
use Illuminate\Support\Facades\Cache;
use Exception;

class NotificationService
{
    /**
     * Send a notification to a specific user
     *
     * @param User $user The user to send the notification to
     * @param string $title The notification title
     * @param string $body The notification body
     * @param array $data Additional data to include with the notification
     * @param string $deepLink Optional deep link URL
     * @param string $type Notification type for tracking
     * @return string|null The message ID if successful, null otherwise
     */
    public function sendToUser(User $user, string $title, string $body, array $data = [], string $deepLink = null, string $type = 'general')
    {
        if (!$user->fcm_token) {
            Log::info('User has no FCM token', ['user_id' => $user->id]);
            return null;
        }

        return $this->sendToToken($user->fcm_token, $title, $body, $data, $deepLink, $type, $user->id);
    }

    /**
     * Send a notification to multiple users
     *
     * @param array $users Array of User objects
     * @param string $title The notification title
     * @param string $body The notification body
     * @param array $data Additional data to include with the notification
     * @param string $deepLink Optional deep link URL
     * @param string $type Notification type for tracking
     * @return array Array of results with user IDs and message IDs
     */
    public function sendToUsers(array $users, string $title, string $body, array $data = [], string $deepLink = null, string $type = 'general')
    {
        $results = [];

        foreach ($users as $user) {
            try {
                if ($user->fcm_token) {
                    $messageId = $this->sendToToken($user->fcm_token, $title, $body, $data, $deepLink, $type, $user->id);

                    $results[] = [
                        'user_id' => $user->id,
                        'success' => !empty($messageId),
                        'message_id' => $messageId
                    ];
                }
            } catch (Exception $e) {
                Log::error('Failed to send notification to user', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage()
                ]);

                $results[] = [
                    'user_id' => $user->id,
                    'success' => false,
                    'error' => $e->getMessage()
                ];
            }

            // Add a small delay to avoid rate limiting
            usleep(50000); // 50ms
        }

        return $results;
    }

    /**
     * Send notification about a new memo to all users with permission
     *
     * @param Memo $memo The memo to notify about
     * @return array Results of the notification
     */
    public function sendMemoNotification(Memo $memo)
    {
        if (!$memo->is_published) {
            return ['success' => false, 'message' => 'Cannot send notification for unpublished memo'];
        }

        // Get users with permission to view memos
        $users = User::where('is_active', true)
                    ->whereNotNull('fcm_token')
                    ->get();

        if ($users->isEmpty()) {
            return ['success' => false, 'message' => 'No users with FCM tokens found'];
        }

        $title = 'New Memo: ' . $memo->title;
        $body = substr(strip_tags($memo->content), 0, 150) . (strlen($memo->content) > 150 ? '...' : '');

        $data = [
            'memo_id' => $memo->id,
            'published_at' => $memo->published_at->toIso8601String(),
            'author' => $memo->author ? $memo->author->name : 'Unknown'
        ];

        $deepLink = route('memos.show', $memo->id);

        $results = $this->sendToUsers($users->all(), $title, $body, $data, $deepLink, 'memo_published');

        // Log overall results
        Log::info('Memo notification sent', [
            'memo_id' => $memo->id,
            'recipients' => count($users),
            'successful' => collect($results)->where('success', true)->count()
        ]);

        return [
            'success' => true,
            'total' => count($users),
            'successful' => collect($results)->where('success', true)->count(),
            'results' => $results
        ];
    }

    /**
     * Send a notification to a specific FCM token
     *
     * @param string $token The FCM token to send to
     * @param string $title The notification title
     * @param string $body The notification body
     * @param array $data Additional data to include with the notification
     * @param string $deepLink Optional deep link URL
     * @param string $type Notification type for tracking
     * @param int|null $userId User ID for logging purposes
     * @return string|null The message ID if successful, null otherwise
     */
    protected function sendToToken(string $token, string $title, string $body, array $data = [], string $deepLink = null, string $type = 'general', $userId = null)
    {
        try {
            // Rate limiting check
            $rateLimitKey = 'fcm_rate_limit:' . ($userId ?? md5($token));
            if (Cache::has($rateLimitKey)) {
                Log::warning('Rate limit exceeded for notification', [
                    'user_id' => $userId,
                    'type' => $type
                ]);
                return null;
            }

            // Set rate limit (no more than 1 notification per 15 seconds per user)
            Cache::put($rateLimitKey, true, now()->addSeconds(15));

            // Get the Firebase Messaging instance
            $messaging = app('firebase.messaging');

            // Create a notification
            $notification = WebPushNotification::create()
                ->withTitle($title)
                ->withBody($body)
                ->withIcon('/images/logo.png')
                ->withBadge('/images/badge.png')
                ->withTimestamp(time() * 1000);

            // Add vibration pattern for mobile devices
            $vibrate = [100, 50, 100];

            // Create a web push config with the notification
            $webPushConfig = WebPushConfig::fromArray([
                'notification' => $notification,
                'fcm_options' => [
                    'link' => $deepLink ?? route('dashboard'),
                ],
                'headers' => [
                    'TTL' => '86400' // 24 hours in seconds
                ],
                'data' => array_merge($data, [
                    'notification_type' => $type,
                    'sent_at' => now()->toIso8601String()
                ]),
                'vibrate' => $vibrate
            ]);

            // Add additional actions if appropriate based on notification type
            if ($type === 'memo_published') {
                $webPushConfig = WebPushConfig::fromArray(array_merge(
                    $webPushConfig->jsonSerialize(),
                    [
                        'actions' => [
                            [
                                'action' => 'view',
                                'title' => 'View Memo',
                                'icon' => '/images/view-icon.png'
                            ]
                        ]
                    ]
                ));
            }

            // Create a message targeting the provided token
            $message = CloudMessage::withTarget('token', $token)
                ->withWebPushConfig($webPushConfig)
                ->withAndroidConfig([
                    'priority' => 'high',
                    'notification' => [
                        'sound' => 'default',
                        'click_action' => $deepLink ?? route('dashboard')
                    ],
                    'fcm_options' => [
                        'analytics_label' => $type
                    ]
                ])
                ->withApnsConfig([
                    'headers' => [
                        'apns-priority' => '10',
                        'apns-collapse-id' => 'notification-' . $type,
                    ],
                    'payload' => [
                        'aps' => [
                            'sound' => 'default',
                            'badge' => 1,
                            'content-available' => 1,
                            'mutable-content' => 1
                        ]
                    ],
                    'fcm_options' => [
                        'analytics_label' => $type
                    ]
                ])
                ->withData(array_merge($data, [
                    'notification_type' => $type,
                    'sent_at' => now()->toIso8601String()
                ]));

            // Send the message and capture the result
            $messageId = $messaging->send($message);

            // Log the successful notification
            $this->logNotification($token, $userId, $type, $title, $body, $messageId, true);

            return $messageId;
        } catch (Exception $e) {
            // Log the error
            Log::error('Failed to send FCM notification', [
                'user_id' => $userId,
                'token' => substr($token, 0, 10) . '...',
                'type' => $type,
                'error' => $e->getMessage()
            ]);

            // Log the failed notification
            $this->logNotification($token, $userId, $type, $title, $body, null, false, $e->getMessage());

            return null;
        }
    }

    /**
     * Log notification attempts for analytics and debugging
     */
    protected function logNotification($token, $userId, $type, $title, $body, $messageId = null, $success = true, $error = null)
    {
        try {
            NotificationLog::create([
                'user_id' => $userId,
                'token' => substr($token, 0, 15) . '...',
                'type' => $type,
                'title' => $title,
                'body' => substr($body, 0, 100),
                'message_id' => $messageId,
                'success' => $success,
                'error' => $error
            ]);
        } catch (Exception $e) {
            Log::error('Failed to log notification attempt', [
                'error' => $e->getMessage()
            ]);
        }
    }
}
