<?php

namespace App\Listeners;

use App\Events\MemoPublished;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class SendMemoNotifications implements ShouldQueue
{
    /**
     * The notification service.
     */
    protected $notificationService;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var array
     */
    public $backoff = [10, 60, 120];

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
        Log::info('Processing memo notification', ['memo_id' => $event->memo->id]);

        $result = $this->notificationService->sendMemoNotification($event->memo);

        Log::info('Memo notification processing completed', [
            'memo_id' => $event->memo->id,
            'success' => $result['success'] ?? false,
            'total_sent' => $result['successful'] ?? 0
        ]);
    }

    /**
     * Handle a job failure.
     */
    public function failed(MemoPublished $event, \Throwable $exception): void
    {
        Log::error('Failed to process memo notifications', [
            'memo_id' => $event->memo->id,
            'error' => $exception->getMessage()
        ]);
    }
}
