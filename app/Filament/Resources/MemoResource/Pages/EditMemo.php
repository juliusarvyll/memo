<?php

namespace App\Filament\Resources\MemoResource\Pages;

use App\Filament\Resources\MemoResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Support\Facades\Log;
use Illuminate\Contracts\Support\Htmlable;
use Illuminate\Support\Facades\Mail;
use App\Mail\MemoPublished;
use App\Models\User;
use App\Notifications\MemoNotification;

class EditMemo extends EditRecord
{
    protected static string $resource = MemoResource::class;

    public function getTitle(): string | Htmlable
    {
        /** @var Post */
        $record = $this->getRecord();

        return $record->title;
    }

    protected function getActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }

    protected function getHeaderActions(): array
    {
        return [
            // Your existing actions
        ];
    }

    protected function afterSave(): void
    {
        $memo = $this->record;

        Log::info('EditMemo afterSave hook triggered', [
            'memo_id' => $memo->id,
            'is_published' => $memo->is_published,
            'is_published_changed' => $memo->wasChanged('is_published')
        ]);

        // Check if the memo was just published
        if ($memo->is_published && $memo->wasChanged('is_published')) {
            // Dispatch the MemoPublished event which will handle notifications
            event(new \App\Events\MemoPublished($memo));
        }
        // Check if the content was updated while published
        elseif ($memo->is_published && ($memo->wasChanged('title') || $memo->wasChanged('content'))) {
            $this->sendFcmNotifications($memo, 'updated');
        }
    }

    /**
     * Send FCM notifications to users about a memo
     */
    protected function sendFcmNotifications($memo, $action = 'published'): void
    {
        try {
            // Get all users with FCM tokens
            $users = User::whereNotNull('fcm_token')->get();

            // Check if we have any users to notify
            if ($users->isEmpty()) {
                Log::info("No FCM tokens found for any users, skipping FCM notifications for $action");
                return;
            }

            // Log information
            Log::info("Sending FCM notifications for $action memo", [
                'memo_id' => $memo->id,
                'memo_title' => $memo->title,
                'action' => $action,
                'recipient_count' => $users->count()
            ]);

            // Create notification
            $notification = new MemoNotification($memo, $action);

            // Set a reasonable timeout for each notification to prevent long-running requests
            ini_set('max_execution_time', 300); // 5 minutes

            // Send in smaller batches to prevent timeouts
            $users->chunk(10)->each(function ($userBatch) use ($notification, $memo, $action) {
                foreach ($userBatch as $user) {
                    try {
                        $user->notify($notification);

                        Log::info('FCM notification sent to user', [
                            'user_id' => $user->id,
                            'memo_id' => $memo->id,
                            'action' => $action
                        ]);

                        // Short sleep to prevent rate limiting
                        usleep(100000); // 0.1 seconds
                    } catch (\Exception $e) {
                        Log::error('Failed to send FCM notification to user', [
                            'user_id' => $user->id,
                            'memo_id' => $memo->id,
                            'action' => $action,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
            });

            Log::info("Completed sending FCM notifications for $action memo", [
                'memo_id' => $memo->id,
                'memo_title' => $memo->title
            ]);
        } catch (\Exception $e) {
            Log::error('Error sending FCM notifications', [
                'memo_id' => $memo->id,
                'action' => $action,
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

            Log::info('Starting memo notification email process from EditMemo', [
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
