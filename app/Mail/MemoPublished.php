<?php

namespace App\Mail;

use App\Models\Memo;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class MemoPublished extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public Memo $memo,
    ) {
        Log::info('Creating MemoPublished email', [
            'memo_id' => $memo->id,
            'memo_title' => $memo->title,
            'recipient_count' => 'To be determined'
        ]);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $fromAddress = config('mail.from.address');
        $fromName = config('mail.from.name');

        Log::info('Building email envelope', [
            'subject' => 'New Memo Published: ' . $this->memo->title,
            'from_address' => $fromAddress,
            'from_name' => $fromName
        ]);

        return new Envelope(
            subject: 'New Memo Published: ' . $this->memo->title,
            from: new Address($fromAddress, $fromName),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        Log::info('Building email content', [
            'memo_id' => $this->memo->id,
            'view' => 'emails.memos.published'
        ]);

        return new Content(
            view: 'emails.memos.published',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        $attachments = [];

        // Attach the memo image if it exists
        if ($this->memo->image && Storage::disk('public')->exists($this->memo->image)) {
            $imagePath = Storage::disk('public')->path($this->memo->image);
            $fileName = basename($this->memo->image);

            Log::info('Attaching image to email', [
                'memo_id' => $this->memo->id,
                'image_path' => $this->memo->image,
                'file_name' => $fileName
            ]);

            $attachments[] = Attachment::fromPath($imagePath)
                ->as($fileName)
                ->withMime(mime_content_type($imagePath));
        }

        return $attachments;
    }
}
