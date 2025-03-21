<?php

namespace App\Observers;

use App\Models\Memo;
use Illuminate\Support\Facades\Log;
use App\Jobs\SendMemoEmails;
use Illuminate\Support\Facades\Event;
use App\Events\MemoPublished as MemoPublishedEvent;

class MemoObserver
{
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
            // Dispatch the MemoPublished event which will trigger the appropriate listeners
            event(new MemoPublishedEvent($memo));
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
            // Dispatch the MemoPublished event which will trigger the appropriate listeners
            event(new MemoPublishedEvent($memo));
        }
    }
}
