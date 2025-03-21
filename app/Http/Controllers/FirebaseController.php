<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Notifications\FcmNotification;
use App\Notifications\MemoNotification;
use App\Models\Memo;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification as FirebaseNotification;

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
            $user = $request->user();
            $memoId = $request->input('memo_id');

            if (!$token) {
                Log::warning('Test notification attempted without FCM token', [
                    'user_id' => $user->id
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'No FCM token provided'
                ], 400);
            }

            // Store the token if it's not already stored
            if ($user->fcm_token !== $token) {
                $user->fcm_token = $token;
                $user->save();

                Log::info('Updated FCM token for user', [
                    'user_id' => $user->id,
                    'token' => substr($token, 0, 10) . '...'
                ]);
            }

            // If a memo ID is provided, send a test memo notification
            if ($memoId) {
                return $this->sendTestMemoNotification($request, $memoId);
            }

            // Set a timeout to prevent long-running requests
            ini_set('max_execution_time', 60); // 1 minute should be enough for a single notification

            // Otherwise send a generic test notification
            $notification = new FcmNotification(
                'Test Notification',
                'This is a test notification from SPUP eMemo',
                [
                    'type' => 'test',
                    'url' => url('/'),
                    'timestamp' => now()->timestamp
                ]
            );

            Log::info('Sending FCM test notification', [
                'user_id' => $user->id,
                'token' => substr($token, 0, 10) . '...'
            ]);

            $user->notify($notification);

            Log::info('FCM test notification sent successfully', [
                'user_id' => $user->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Test notification sent successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send test notification', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send notification: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send a test memo notification
     */
    public function sendTestMemoNotification(Request $request, $memoId = null)
    {
        try {
            $user = $request->user();
            $memoId = $memoId ?: $request->input('memo_id');

            // Set a timeout to prevent long-running requests
            ini_set('max_execution_time', 60); // 1 minute should be enough for a single notification

            // Verify user has a token
            if (!$user->fcm_token) {
                Log::warning('Memo test notification attempted without FCM token', [
                    'user_id' => $user->id
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'User does not have a registered FCM token'
                ], 400);
            }

            // Find the memo
            $memo = null;
            if ($memoId) {
                $memo = Memo::find($memoId);
                if (!$memo) {
                    Log::warning('Memo not found for test notification', [
                        'memo_id' => $memoId,
                        'user_id' => $user->id
                    ]);
                }
            }

            if (!$memo) {
                // If no specific memo is found, get the latest published memo
                $memo = Memo::where('is_published', true)
                    ->latest('published_at')
                    ->first();

                if (!$memo) {
                    Log::warning('No published memos found for test notification', [
                        'user_id' => $user->id
                    ]);
                    return response()->json([
                        'success' => false,
                        'message' => 'No published memos found for testing'
                    ], 404);
                }
            }

            Log::info('Sending test memo notification', [
                'user_id' => $user->id,
                'memo_id' => $memo->id,
                'memo_title' => $memo->title
            ]);

            // Create and send the memo notification
            $notification = new MemoNotification($memo, 'published');
            $user->notify($notification);

            Log::info('Test memo notification sent successfully', [
                'user_id' => $user->id,
                'memo_id' => $memo->id,
                'memo_title' => $memo->title
            ]);

            return response()->json([
                'success' => true,
                'message' => "Test memo notification sent for '{$memo->title}'",
                'memo' => [
                    'id' => $memo->id,
                    'title' => $memo->title
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send test memo notification', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id ?? 'unknown',
                'memo_id' => $memoId ?? 'not provided',
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send memo notification: ' . $e->getMessage()
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

    /**
     * Send a broadcast notification to all devices/topics
     */
    public function sendBroadcastNotification(Request $request)
    {
        try {
            // Validate the request
            $request->validate([
                'title' => 'required|string|max:255',
                'body' => 'required|string',
                'topic' => 'nullable|string',
                'data' => 'nullable|array',
            ]);

            // Get data from request
            $title = $request->input('title');
            $body = $request->input('body');
            $topic = $request->input('topic');
            $data = $request->input('data', []);

            // Set a timeout for this operation
            ini_set('max_execution_time', 60); // 1 minute should be enough

            // Get the Firebase Messaging instance
            $messaging = app('firebase.messaging');

            // Create a notification
            $notification = FirebaseNotification::create($title, $body);

            // If a topic is specified, send to that topic
            if ($topic) {
                $message = CloudMessage::withTarget('topic', $topic)
                    ->withNotification($notification)
                    ->withData($data);

                Log::info('Sending FCM broadcast to topic', [
                    'topic' => $topic,
                    'title' => $title
                ]);

                $messageId = $messaging->send($message);

                return response()->json([
                    'success' => true,
                    'message' => 'Broadcast notification sent to topic',
                    'message_id' => $messageId,
                    'topic' => $topic
                ]);
            }
            // Otherwise send to /topics/all (which is a convention for all devices)
            else {
                $message = CloudMessage::withTarget('topic', 'all')
                    ->withNotification($notification)
                    ->withData($data);

                Log::info('Sending FCM broadcast to all devices', [
                    'title' => $title
                ]);

                $messageId = $messaging->send($message);

                return response()->json([
                    'success' => true,
                    'message' => 'Broadcast notification sent to all devices',
                    'message_id' => $messageId
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to send broadcast notification', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send broadcast notification: ' . $e->getMessage()
            ], 500);
        }
    }
}
