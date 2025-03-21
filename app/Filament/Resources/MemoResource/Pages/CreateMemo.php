<?php

namespace App\Filament\Resources\MemoResource\Pages;

use App\Filament\Resources\MemoResource;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;
use App\Notifications\MemoNotification;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\MemoPublished;

class CreateMemo extends CreateRecord
{
    protected static string $resource = MemoResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function afterCreate(): void
    {
        $memo = $this->record;

        Log::info('CreateMemo afterCreate hook triggered', [
            'memo_id' => $memo->id,
            'is_published' => $memo->is_published
        ]);

        if ($memo->is_published) {
            // Dispatch the MemoPublished event
            event(new \App\Events\MemoPublished($memo));
        }
    }

    /**
     * Send notifications to users about a new memo
     */
    protected function sendNotifications($memo): void
    {
        try {
            // Get all users with FCM tokens
            $users = User::whereNotNull('fcm_token')->get();

            // Check if we have any users to notify
            if ($users->isEmpty()) {
                Log::info('No FCM tokens found for any users, skipping FCM notifications');
                return;
            }

            // Log information
            Log::info('Sending FCM notifications for new memo', [
                'memo_id' => $memo->id,
                'memo_title' => $memo->title,
                'recipient_count' => $users->count()
            ]);

            // Create notification
            $notification = new MemoNotification($memo, 'published');

            // Set a reasonable timeout for each notification to prevent long-running requests
            ini_set('max_execution_time', 300); // 5 minutes

            // Send in smaller batches to prevent timeouts
            $users->chunk(10)->each(function ($userBatch) use ($notification, $memo) {
                foreach ($userBatch as $user) {
                    try {
                        $user->notify($notification);

                        Log::info('FCM notification sent to user', [
                            'user_id' => $user->id,
                            'memo_id' => $memo->id
                        ]);

                        // Short sleep to prevent rate limiting
                        usleep(100000); // 0.1 seconds
                    } catch (\Exception $e) {
                        Log::error('Failed to send FCM notification to user', [
                            'user_id' => $user->id,
                            'memo_id' => $memo->id,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
            });

            Log::info('Completed sending FCM notifications for memo', [
                'memo_id' => $memo->id,
                'memo_title' => $memo->title
            ]);
        } catch (\Exception $e) {
            Log::error('Error sending FCM notifications', [
                'memo_id' => $memo->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Send FCM notifications to users about a memo
     */
    protected function sendFcmNotifications($memo): void
    {
        try {
            // Get all users with FCM tokens
            $users = User::whereNotNull('fcm_token')->get();

            // Check if we have any users to notify
            if ($users->isEmpty()) {
                Log::info('No FCM tokens found for any users, skipping FCM notifications');
                return;
            }

            // Log information
            Log::info('Sending FCM notifications for new memo', [
                'memo_id' => $memo->id,
                'memo_title' => $memo->title,
                'recipient_count' => $users->count()
            ]);

            // Create notification
            $notification = new MemoNotification($memo, 'published');

            // Set a reasonable timeout for each notification to prevent long-running requests
            ini_set('max_execution_time', 300); // 5 minutes

            // Send in smaller batches to prevent timeouts
            $users->chunk(10)->each(function ($userBatch) use ($notification, $memo) {
                foreach ($userBatch as $user) {
                    try {
                        $user->notify($notification);

                        Log::info('FCM notification sent to user', [
                            'user_id' => $user->id,
                            'memo_id' => $memo->id
                        ]);

                        // Short sleep to prevent rate limiting
                        usleep(100000); // 0.1 seconds
                    } catch (\Exception $e) {
                        Log::error('Failed to send FCM notification to user', [
                            'user_id' => $user->id,
                            'memo_id' => $memo->id,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
            });

            Log::info('Completed sending FCM notifications for memo', [
                'memo_id' => $memo->id,
                'memo_title' => $memo->title
            ]);
        } catch (\Exception $e) {
            Log::error('Error sending FCM notifications', [
                'memo_id' => $memo->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
}
