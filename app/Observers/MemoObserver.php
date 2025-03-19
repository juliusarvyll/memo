<?php

namespace App\Observers;

use App\Models\Memo;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\MemoPublished;
use App\Models\User;
use App\Services\FcmService;

class MemoObserver
{
    protected $fcmService;

    public function __construct(FcmService $fcmService)
    {
        $this->fcmService = $fcmService;
    }

    /**
     * Handle the Memo "created" event.
     */
    public function created(Memo $memo): void
    {
        Log::info('MemoObserver created event triggered', [
            'memo_id' => $memo->id,
            'is_published' => $memo->is_published
        ]);

        if ($memo->is_published) {
            $this->sendNewMemoNotification($memo);
        }
    }

    /**
     * Handle the Memo "updated" event.
     */
    public function updated(Memo $memo): void
    {
        Log::info('MemoObserver updated event triggered', [
            'memo_id' => $memo->id,
            'is_published' => $memo->is_published,
            'is_published_changed' => $memo->wasChanged('is_published')
        ]);

        if ($memo->is_published && $memo->wasChanged('is_published')) {
            $this->sendNewMemoNotification($memo);
        }
    }

    /**
     * Send notification for a new memo
     */
    private function sendNewMemoNotification(Memo $memo): void
    {
        $authorName = $memo->author ? $memo->author->name : 'SPUP Staff';

        // Send FCM notification to all registered tokens
        $this->fcmService->sendToAllUsers(
            'New SPUP eMemo Published',
            $memo->title,
            [
                'memo_id' => $memo->id,
                'author' => $authorName,
                'url' => url('/') . "?memo={$memo->id}",
                'published_at' => $memo->published_at->toDateTimeString()
            ]
        );
    }
}
