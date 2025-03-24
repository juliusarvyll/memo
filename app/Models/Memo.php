<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Memo extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'content',
        'author_id',
        'is_published',
        'published_at',
        'image'
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'published_at' => 'datetime',
    ];

    protected $appends = ['image_url'];

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /**
     * Get the full URL for the image
     */
    public function getImageUrlAttribute()
    {
        if ($this->image) {
            return asset('storage/' . $this->image);
        }

        return null;
    }

    /**
     * Publish the memo
     */
    public function publish()
    {
        if (!$this->is_published) {
            $this->is_published = true;
            $this->published_at = now();
            $this->save();

            // Dispatch the MemoPublished event
            event(new \App\Events\MemoPublished($this));

            return true;
        }

        return false;
    }
}
