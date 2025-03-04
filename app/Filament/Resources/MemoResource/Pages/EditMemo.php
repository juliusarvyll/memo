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
            $this->sendMemoNotification($memo);
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
