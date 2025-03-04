<?php

namespace App\Filament\Resources\MemoResource\Pages;

use App\Filament\Resources\MemoResource;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\MemoPublished;
use App\Models\User;

class CreateMemo extends CreateRecord
{
    protected static string $resource = MemoResource::class;

    protected function afterCreate(): void
    {
        $memo = $this->record;

        Log::info('CreateMemo afterCreate hook triggered', [
            'memo_id' => $memo->id,
            'is_published' => $memo->is_published
        ]);

        if ($memo->is_published) {
            $this->sendMemoNotification($memo);
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
