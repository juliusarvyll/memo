<?php

namespace App\Services;

use App\Models\Memo;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification as FirebaseNotification;

class FcmService
{
    /**
     * Send notification when a memo is published
     *
     * @param Memo $memo
     * @return bool
     */
    public function sendMemoPublishedNotification(Memo $memo)
    {
        try {
            // Get Firebase Messaging
            $messaging = app('firebase.messaging');

            // Create notification
            $notification = FirebaseNotification::create(
                'New Memo: ' . $memo->title,
                substr(strip_tags($memo->content), 0, 100) . '...'
            );

            // Send to 'all' topic
            $message = CloudMessage::withTarget('topic', 'all')
                ->withNotification($notification)
                ->withData([
                    'memo_id' => (string) $memo->id,
                    'type' => 'memo_published',
                    'url' => route('dashboard'),
                    'timestamp' => (string) now()->timestamp
                ]);

            Log::info('Sending FCM notification for published memo', [
                'memo_id' => $memo->id,
                'title' => $memo->title
            ]);

            $messageId = $messaging->send($message);

            Log::info('FCM notification sent successfully', [
                'memo_id' => $memo->id,
                'message_id' => $messageId
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to send FCM notification for memo', [
                'memo_id' => $memo->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return false;
        }
    }

    /**
     * Send notification to all users (using a topic)
     *
     * @param string $title
     * @param string $body
     * @param array $data
     * @return bool
     */
    public function sendToAllUsers(string $title, string $body, array $data = [])
    {
        try {
            // Get Firebase Messaging
            $messaging = app('firebase.messaging');

            // Create notification
            $notification = FirebaseNotification::create($title, $body);

            // Send to 'all' topic
            $message = CloudMessage::withTarget('topic', 'all')
                ->withNotification($notification)
                ->withData($data);

            Log::info('Sending FCM broadcast notification to all users', [
                'title' => $title
            ]);

            $messageId = $messaging->send($message);

            Log::info('FCM broadcast notification sent successfully', [
                'message_id' => $messageId
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to send FCM broadcast notification', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return false;
        }
    }

    /**
     * Send notification to a specific user
     *
     * @param User $user
     * @param string $title
     * @param string $body
     * @param array $data
     * @return bool
     */
    public function sendNotificationToUser(User $user, string $title, string $body, array $data = [])
    {
        if (empty($user->fcm_token)) {
            Log::warning('Attempted to send notification to user without FCM token', [
                'user_id' => $user->id
            ]);
            return false;
        }

        try {
            // Get Firebase Messaging
            $messaging = app('firebase.messaging');

            // Create notification
            $notification = FirebaseNotification::create($title, $body);

            // Create message targeted to the user's token
            $message = CloudMessage::withTarget('token', $user->fcm_token)
                ->withNotification($notification)
                ->withData($data);

            Log::info('Sending FCM notification to user', [
                'user_id' => $user->id,
                'title' => $title
            ]);

            $messageId = $messaging->send($message);

            Log::info('FCM notification sent to user successfully', [
                'user_id' => $user->id,
                'message_id' => $messageId
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to send FCM notification to user', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return false;
        }
    }
}
