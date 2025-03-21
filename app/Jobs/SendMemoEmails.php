<?php

namespace App\Jobs;

use App\Mail\MemoPublished;
use App\Models\Memo;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendMemoEmails implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The memo instance.
     *
     * @var \App\Models\Memo
     */
    protected $memo;

    /**
     * Create a new job instance.
     *
     * @param \App\Models\Memo $memo
     * @return void
     */
    public function __construct(Memo $memo)
    {
        $this->memo = $memo;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        try {
            $this->sendToUsers();
            $this->sendToSubscribers();

            Log::info('Memo notification email process completed for all recipients', [
                'memo_id' => $this->memo->id,
                'job_id' => $this->job->getJobId()
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to process memo notification emails', [
                'memo_id' => $this->memo->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'job_id' => $this->job ? $this->job->getJobId() : 'unknown'
            ]);

            // Re-throw the exception to mark the job as failed
            throw $e;
        }
    }

    /**
     * Send memo notifications to registered users
     */
    protected function sendToUsers()
    {
        // Get all users to notify
        $users = User::all();

        Log::info('Starting queued memo notification email process for users', [
            'memo_id' => $this->memo->id,
            'memo_title' => $this->memo->title,
            'total_users' => $users->count(),
            'job_id' => $this->job->getJobId()
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
                    'memo_id' => $this->memo->id,
                    'job_id' => $this->job->getJobId()
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
                    'memo_id' => $this->memo->id,
                    'job_id' => $this->job->getJobId()
                ]);
                $skippedCount++;
                continue;
            }

            try {
                Log::info('Sending memo notification email to user', [
                    'memo_id' => $this->memo->id,
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'job_id' => $this->job->getJobId()
                ]);

                Mail::to($user->email)->queue(new MemoPublished($this->memo));

                Log::info('Successfully queued email to user', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'memo_id' => $this->memo->id,
                    'job_id' => $this->job->getJobId()
                ]);

                $sentCount++;
            } catch (\Exception $e) {
                $errorCount++;
                Log::error('Failed to send email to user', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'memo_id' => $this->memo->id,
                    'error' => $e->getMessage(),
                    'job_id' => $this->job->getJobId()
                ]);
            }
        }

        Log::info('User notification email process completed', [
            'memo_id' => $this->memo->id,
            'total_users' => $users->count(),
            'sent' => $sentCount,
            'skipped' => $skippedCount,
            'errors' => $errorCount,
            'job_id' => $this->job->getJobId()
        ]);
    }

    /**
     * Send memo notifications to active subscribers
     */
    protected function sendToSubscribers()
    {
        // Get active subscribers
        $subscribers = Subscriber::active()->get();

        Log::info('Starting queued memo notification email process for subscribers', [
            'memo_id' => $this->memo->id,
            'memo_title' => $this->memo->title,
            'total_subscribers' => $subscribers->count(),
            'job_id' => $this->job->getJobId()
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
                    'memo_id' => $this->memo->id,
                    'job_id' => $this->job->getJobId()
                ]);
                $skippedCount++;
                continue;
            }

            try {
                Log::info('Sending memo notification email to subscriber', [
                    'memo_id' => $this->memo->id,
                    'subscriber_id' => $subscriber->id,
                    'email' => $subscriber->email,
                    'job_id' => $this->job->getJobId()
                ]);

                Mail::to($subscriber->email)->queue(new MemoPublished($this->memo));

                // Update the last_notified_at timestamp
                $subscriber->update(['last_notified_at' => now()]);

                Log::info('Successfully queued email to subscriber', [
                    'subscriber_id' => $subscriber->id,
                    'email' => $subscriber->email,
                    'memo_id' => $this->memo->id,
                    'job_id' => $this->job->getJobId()
                ]);

                $sentCount++;
            } catch (\Exception $e) {
                $errorCount++;
                Log::error('Failed to send email to subscriber', [
                    'subscriber_id' => $subscriber->id,
                    'email' => $subscriber->email,
                    'memo_id' => $this->memo->id,
                    'error' => $e->getMessage(),
                    'job_id' => $this->job->getJobId()
                ]);
            }
        }

        Log::info('Subscriber notification email process completed', [
            'memo_id' => $this->memo->id,
            'total_subscribers' => $subscribers->count(),
            'sent' => $sentCount,
            'skipped' => $skippedCount,
            'errors' => $errorCount,
            'job_id' => $this->job->getJobId()
        ]);
    }
}
