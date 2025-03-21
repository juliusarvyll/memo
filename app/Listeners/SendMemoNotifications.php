<?php

namespace App\Listeners;

use App\Events\MemoPublished;
use App\Mail\MemoPublished as MemoPublishedMail;
use App\Models\User;
use App\Models\Subscriber;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class SendMemoNotifications
{
    /**
     * Create the event listener.
     */
    public function __construct()
    {
        // No dependencies needed
    }

    /**
     * Handle the event.
     */
    public function handle(MemoPublished $event): void
    {
        try {
            $requestId = Str::uuid()->toString();

            Log::info('Processing memo notification event', [
                'memo_id' => $event->memo->id,
                'title' => $event->memo->title,
                'request_id' => $requestId
            ]);

            // Send email notifications directly
            Log::info('Starting direct email notification process', [
                'memo_id' => $event->memo->id,
                'request_id' => $requestId
            ]);

            $this->sendEmails($event->memo);

            Log::info('Direct email notification process completed', [
                'memo_id' => $event->memo->id,
                'request_id' => $requestId
            ]);
        } catch (\Exception $exception) {
            Log::error('Failed to process memo notifications', [
                'memo_id' => $event->memo->id,
                'error' => $exception->getMessage(),
                'trace' => $exception->getTraceAsString()
            ]);
        }
    }

    /**
     * Send emails directly to users and subscribers
     */
    protected function sendEmails($memo)
    {
        // Send to subscribers
        $this->sendToSubscribers($memo);

        // Send to users
        $this->sendToUsers($memo);
    }

    /**
     * Send memo notifications to active subscribers
     */
    protected function sendToSubscribers($memo)
    {
        // Get active subscribers
        $subscribers = Subscriber::active()->get();

        Log::info('Starting direct memo notification email process for subscribers', [
            'memo_id' => $memo->id,
            'memo_title' => $memo->title,
            'total_subscribers' => $subscribers->count()
        ]);

        // Count variables to track progress
        $sentCount = 0;
        $errorCount = 0;
        $skippedCount = 0;

        // Define invalid domains
        $invalidDomains = ['example.com', 'example.net', 'example.org', 'test.com', 'localhost.com', 'invalid.com'];

        foreach ($subscribers as $subscriber) {
            // Check if domain is invalid
            $domain = explode('@', $subscriber->email)[1] ?? '';
            if (in_array($domain, $invalidDomains) || str_contains($domain, 'example') || str_contains($domain, 'test')) {
                Log::warning('Skipping RFC 2606 reserved domain email for subscriber', [
                    'subscriber_id' => $subscriber->id,
                    'email' => $subscriber->email,
                    'memo_id' => $memo->id
                ]);
                $skippedCount++;
                continue;
            }

            try {
                Log::info('Sending memo notification email to subscriber', [
                    'memo_id' => $memo->id,
                    'subscriber_id' => $subscriber->id,
                    'email' => $subscriber->email
                ]);

                // Send directly instead of queuing
                Mail::to($subscriber->email)->send(new MemoPublishedMail($memo));

                // Update the last_notified_at timestamp
                $subscriber->update(['last_notified_at' => now()]);

                Log::info('Successfully sent email to subscriber', [
                    'subscriber_id' => $subscriber->id,
                    'email' => $subscriber->email,
                    'memo_id' => $memo->id
                ]);

                $sentCount++;
            } catch (\Exception $e) {
                $errorCount++;
                Log::error('Failed to send email to subscriber', [
                    'subscriber_id' => $subscriber->id,
                    'email' => $subscriber->email,
                    'memo_id' => $memo->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        Log::info('Subscriber notification email process completed', [
            'memo_id' => $memo->id,
            'total_subscribers' => $subscribers->count(),
            'sent' => $sentCount,
            'skipped' => $skippedCount,
            'errors' => $errorCount
        ]);
    }

    /**
     * Send memo notifications to registered users
     */
    protected function sendToUsers($memo)
    {
        // Get all users to notify
        $users = User::all();

        Log::info('Starting direct memo notification email process for users', [
            'memo_id' => $memo->id,
            'memo_title' => $memo->title,
            'total_users' => $users->count()
        ]);

        // Count variables to track progress
        $sentCount = 0;
        $errorCount = 0;
        $skippedCount = 0;

        // Define invalid domains
        $invalidDomains = ['example.com', 'example.net', 'example.org', 'test.com', 'localhost.com', 'invalid.com'];

        foreach ($users as $user) {
            // Skip if user has no email
            if (empty($user->email)) {
                Log::warning('Skipping user - no email address', [
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'memo_id' => $memo->id
                ]);
                $skippedCount++;
                continue;
            }

            // Check if domain is invalid
            $domain = explode('@', $user->email)[1] ?? '';
            if (in_array($domain, $invalidDomains) || str_contains($domain, 'example') || str_contains($domain, 'test')) {
                Log::warning('Skipping RFC 2606 reserved domain email', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'memo_id' => $memo->id
                ]);
                $skippedCount++;
                continue;
            }

            try {
                Log::info('Sending memo notification email to user', [
                    'memo_id' => $memo->id,
                    'user_id' => $user->id,
                    'email' => $user->email
                ]);

                // Send directly instead of queuing
                Mail::to($user->email)->send(new MemoPublishedMail($memo));

                Log::info('Successfully sent email to user', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'memo_id' => $memo->id
                ]);

                $sentCount++;
            } catch (\Exception $e) {
                $errorCount++;
                Log::error('Failed to send email to user', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'memo_id' => $memo->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        Log::info('User notification email process completed', [
            'memo_id' => $memo->id,
            'total_users' => $users->count(),
            'sent' => $sentCount,
            'skipped' => $skippedCount,
            'errors' => $errorCount
        ]);
    }
}
