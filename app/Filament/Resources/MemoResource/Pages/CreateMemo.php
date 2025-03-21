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
        // Get the created memo
        $memo = $this->record;

        if ($memo->is_published) {
            $this->sendNotifications($memo);
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

    protected function sendMemoNotification($memo): void
    {
        try {
            // Get all users to notify
            $users = User::all();

            Log::info('Starting memo notification email process from CreateMemo', [
                'memo_id' => $memo->id,
                'memo_title' => $memo->title,
                'total_users' => $users->count()
            ]);

            // Count variables to track progress
            $sentCount = 0;
            $errorCount = 0;
            $skippedCount = 0;

            foreach ($users as $user) {
                // Skip if user has no email
                if (empty($user->email)) {
                    Log::warning('Skipping user - no email address', [
                        'user_id' => $user->id,
                        'user_name' => $user->name
                    ]);
                    $skippedCount++;
                    continue;
                }

                try {
                    Log::info('Sending memo notification email', [
                        'memo_id' => $memo->id,
                        'user_id' => $user->id,
                        'email' => $user->email
                    ]);

                    Mail::to($user->email)->send(new MemoPublished($memo));

                    Log::info('Successfully sent email to user', [
                        'user_id' => $user->id,
                        'email' => $user->email
                    ]);

                    $sentCount++;

                    // Optional: Add some delay between emails to prevent throttling
                    if (count($users) > 10) {
                        usleep(200000); // 0.2 seconds
                    }
                } catch (\Exception $e) {
                    $errorCount++;
                    Log::error('Failed to send email to user', [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            Log::info('Memo notification email process completed', [
                'memo_id' => $memo->id,
                'total_users' => $users->count(),
                'sent' => $sentCount,
                'skipped' => $skippedCount,
                'errors' => $errorCount
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to send memo notification emails', [
                'memo_id' => $memo->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
}
