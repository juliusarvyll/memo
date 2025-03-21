<?php

namespace App\Listeners;

use App\Events\MemoPublished;
use App\Jobs\SendMemoEmails;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SendMemoNotifications
{
    /**
     * The notification service.
     */
    protected $notificationService;

    /**
     * Create the event listener.
     */
    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
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

            // First, dispatch the FCM notifications (via the notification service)
            // This uses Firebase Cloud Messaging which is generally fast
            $result = $this->notificationService->sendMemoNotification($event->memo);

            Log::info('FCM notification processing completed', [
                'memo_id' => $event->memo->id,
                'success' => $result['success'] ?? false,
                'total_sent' => $result['successful'] ?? 0,
                'request_id' => $requestId
            ]);

            // Dispatch a separate job for email notifications, which can be more time-consuming
            Log::info('Dispatching email notification job', [
                'memo_id' => $event->memo->id,
                'request_id' => $requestId
            ]);

            SendMemoEmails::dispatch($event->memo);

            Log::info('Email notification job dispatched successfully', [
                'memo_id' => $event->memo->id,
                'request_id' => $requestId
            ]);

        } catch (\Throwable $exception) {
            Log::error('Failed to process memo notifications', [
                'memo_id' => $event->memo->id,
                'error' => $exception->getMessage(),
                'trace' => $exception->getTraceAsString()
            ]);
        }
    }
}
