<?php

namespace App\Events;

use App\Models\Memo;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MemoPublished
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The memo that was published.
     *
     * @var \App\Models\Memo
     */
    public $memo;

    /**
     * Create a new event instance.
     */
    public function __construct(Memo $memo)
    {
        $this->memo = $memo;
    }
}
