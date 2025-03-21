<?php

namespace App\Listeners;

use App\Events\MemoPublished;
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

            Log::info('Processing memo notification synchronously', [
                'memo_id' => $event->memo->id,
                'title' => $event->memo->title,
                'request_id' => $requestId
            ]);

            // Set a timeout to prevent long-running requests
            ini_set('max_execution_time', 300); // 5 minutes

            $result = $this->notificationService->sendMemoNotification($event->memo);

            Log::info('Memo notification processing completed', [
                'memo_id' => $event->memo->id,
                'success' => $result['success'] ?? false,
                'total_sent' => $result['successful'] ?? 0,
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
